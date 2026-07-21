import {
  SOLVERS,
  type AutorouterCompleteEvent,
  type AutorouterErrorEvent,
  type AutorouterProgressEvent,
  type GenericLocalAutorouter,
  type SimpleRouteJson,
  type SimplifiedPcbTrace,
} from "@tscircuit/core";
import type { GraphicsObject } from "graphics-debug";
import { TraceWidthFixerSolver } from "./TraceWidthFixerSolver";

type CompatibleSolver = {
  solved: boolean;
  failed: boolean;
  iterations: number;
  progress: number;
  error: string | null;
  stats: Record<string, unknown>;
  step(): void;
  solve(): void;
  preview(): GraphicsObject;
};

type AutorouterEvents = {
  complete: AutorouterCompleteEvent;
  error: AutorouterErrorEvent;
  progress: AutorouterProgressEvent;
};

type EventName = keyof AutorouterEvents;

class SolverAutorouterAdapter<TSolver extends CompatibleSolver>
  implements GenericLocalAutorouter
{
  readonly input: SimpleRouteJson;
  readonly solver: TSolver;
  isRouting = false;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private cycleCount = 0;
  private readonly getOutput: (solver: TSolver) => SimplifiedPcbTrace[];
  private readonly getPhase: (solver: TSolver) => string;
  private readonly onComplete?: (traces: SimplifiedPcbTrace[]) => void;
  private listeners: {
    [K in EventName]: Array<(event: AutorouterEvents[K]) => void>;
  } = {
    complete: [],
    error: [],
    progress: [],
  };

  constructor(args: {
    input: SimpleRouteJson;
    solver: TSolver;
    getOutput: (solver: TSolver) => SimplifiedPcbTrace[];
    getPhase: (solver: TSolver) => string;
    onComplete?: (traces: SimplifiedPcbTrace[]) => void;
  }) {
    this.input = args.input;
    this.solver = args.solver;
    this.getOutput = args.getOutput;
    this.getPhase = args.getPhase;
    this.onComplete = args.onComplete;
  }

  on<K extends EventName>(
    eventName: K,
    listener: (event: AutorouterEvents[K]) => void,
  ) {
    this.listeners[eventName].push(listener);
  }

  start() {
    if (this.isRouting) return;
    this.isRouting = true;
    this.stopped = false;
    this.cycleCount = 0;
    void this.runCycleAndQueueNextCycle();
  }

  stop() {
    this.stopped = true;
    this.isRouting = false;
    if (this.timeoutId !== undefined) clearTimeout(this.timeoutId);
    this.timeoutId = undefined;
  }

  solveSync() {
    this.solver.solve();
    if (this.solver.failed) {
      throw new Error(this.solver.error ?? "Autorouting solver failed");
    }
    const traces = this.getOutput(this.solver);
    this.onComplete?.(traces);
    return traces;
  }

  private async runCycleAndQueueNextCycle() {
    if (!this.isRouting || this.stopped) return;
    try {
      if (this.solver.solved || this.solver.failed) {
        this.finish();
        return;
      }

      const startTime = Date.now();
      const startIterations = this.solver.iterations;
      while (
        Date.now() - startTime < 250 &&
        !this.solver.solved &&
        !this.solver.failed &&
        !this.stopped
      ) {
        this.solver.step();
      }

      if (this.stopped) return;
      const elapsedMs = Math.max(1, Date.now() - startTime);
      this.cycleCount += 1;
      this.emit("progress", {
        type: "progress",
        steps: this.cycleCount,
        progress: this.solver.progress,
        phase: this.getPhase(this.solver),
        iterationsPerSecond:
          ((this.solver.iterations - startIterations) / elapsedMs) * 1_000,
        debugGraphics: this.solver.preview(),
      });

      if (this.solver.solved || this.solver.failed) {
        this.finish();
        return;
      }
      this.timeoutId = setTimeout(
        () => void this.runCycleAndQueueNextCycle(),
        0,
      );
    } catch (error) {
      this.isRouting = false;
      this.emit("error", {
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private finish() {
    this.isRouting = false;
    if (this.solver.failed) {
      this.emit("error", {
        type: "error",
        error: new Error(this.solver.error ?? "Autorouting solver failed"),
      });
      return;
    }
    const traces = this.getOutput(this.solver);
    this.onComplete?.(traces);
    this.emit("complete", { type: "complete", traces });
  }

  private emit<K extends EventName>(eventName: K, event: AutorouterEvents[K]) {
    for (const listener of this.listeners[eventName]) listener(event);
  }
}

export class TraceWidthFixerAutorouter extends SolverAutorouterAdapter<TraceWidthFixerSolver> {
  constructor(simpleRouteJson: SimpleRouteJson) {
    const solver = new TraceWidthFixerSolver(simpleRouteJson);
    super({
      input: simpleRouteJson,
      solver,
      getOutput: (activeSolver) => activeSolver.getOutput(),
      getPhase: (activeSolver) => String(activeSolver.stats.phase ?? "fix"),
    });
  }
}

type InitialBoardSolver = InstanceType<
  (typeof SOLVERS)["AutoroutingPipelineSolver7_MultiGraph"]
>;

class InitialBoardAutorouter extends SolverAutorouterAdapter<InitialBoardSolver> {
  constructor(
    simpleRouteJson: SimpleRouteJson,
    onComplete: (traces: SimplifiedPcbTrace[]) => void,
  ) {
    const solver = new SOLVERS.AutoroutingPipelineSolver7_MultiGraph(
      simpleRouteJson as unknown as ConstructorParameters<
        (typeof SOLVERS)["AutoroutingPipelineSolver7_MultiGraph"]
      >[0],
      { effort: 10, cacheProvider: null },
    );
    super({
      input: simpleRouteJson,
      solver,
      getOutput: (activeSolver) =>
        activeSolver.getOutputSimpleRouteJson().traces ?? [],
      getPhase: (activeSolver) => activeSolver.getCurrentPhase(),
      onComplete,
    });
  }
}

export const createTraceWidthFixerAutorouter = async (
  simpleRouteJson: SimpleRouteJson,
) => new TraceWidthFixerAutorouter(simpleRouteJson);

/**
 * Creates coordinated algorithm functions for the board's initial route and
 * its whole-board reroute phase. Tscircuit removes existing in-region traces
 * from reroute SimpleRouteJson, so the first pass is deliberately retained here
 * and becomes the width fixer's input during rerouting.
 */
export const createPhasedTraceWidthFixerAlgorithm = () => {
  let initialInput: SimpleRouteJson | undefined;
  let initialTraces: SimplifiedPcbTrace[] | undefined;

  const initialAlgorithmFn = async (simpleRouteJson: SimpleRouteJson) => {
    return new InitialBoardAutorouter(simpleRouteJson, (traces) => {
      initialInput = structuredClone(simpleRouteJson);
      initialTraces = structuredClone(traces);
    });
  };

  const rerouteAlgorithmFn = async (_simpleRouteJson: SimpleRouteJson) => {
    if (!initialInput || !initialTraces) {
      throw new Error(
        "Trace-width reroute started before initial board routing completed",
      );
    }

    return new TraceWidthFixerAutorouter({
      ...structuredClone(initialInput),
      traces: [
        ...structuredClone(initialInput.traces ?? []),
        ...structuredClone(initialTraces),
      ],
    });
  };

  return { initialAlgorithmFn, rerouteAlgorithmFn };
};
