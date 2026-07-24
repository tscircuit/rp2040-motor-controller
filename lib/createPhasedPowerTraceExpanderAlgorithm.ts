import {
  PowerTraceExpanderSolver,
  SolverAutorouterAdapter,
} from "@tscircuit/power-trace-expander";
import {
  SOLVERS,
  type SimpleRouteJson,
  type SimplifiedPcbTrace,
} from "@tscircuit/core";

type InitialBoardSolver = InstanceType<
  (typeof SOLVERS)["AutoroutingPipelineSolver7_MultiGraph"]
>;

const UPPER_P_MOTOR_A_CONNECTION = "source_trace_147";

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

/**
 * Gives the constrained upper P_MOTOR_A escape first choice of the bottom
 * corridor, then improves the rest of the board around that result.
 */
class PrioritizedPowerTraceExpanderSolver {
  readonly input: SimpleRouteJson;
  activeSolver: PowerTraceExpanderSolver;
  stage: "priority" | "whole-board" | "complete";
  solved = false;
  failed = false;
  error: string | null = null;
  iterations = 0;

  constructor(input: SimpleRouteJson) {
    this.input = structuredClone(input);
    const hasUpperMotorA = input.connections.some(
      (connection) => connection.name === UPPER_P_MOTOR_A_CONNECTION,
    );
    this.stage = hasUpperMotorA ? "priority" : "whole-board";
    this.activeSolver = new PowerTraceExpanderSolver(
      this.input,
      hasUpperMotorA
        ? { onlyConnectionNames: [UPPER_P_MOTOR_A_CONNECTION] }
        : {},
    );
  }

  get progress() {
    if (this.stage === "priority") return this.activeSolver.progress * 0.1;
    if (this.stage === "whole-board") {
      return 0.1 + this.activeSolver.progress * 0.9;
    }
    return 1;
  }

  get stats(): Record<string, unknown> {
    return {
      ...this.activeSolver.stats,
      phase:
        this.stage === "complete"
          ? "complete"
          : `${this.stage}:${String(this.activeSolver.stats.phase ?? "fix")}`,
    };
  }

  step() {
    if (this.solved || this.failed) return;
    const before = this.activeSolver.iterations;
    this.activeSolver.step();
    this.iterations += this.activeSolver.iterations - before;
    if (this.activeSolver.failed) {
      this.failed = true;
      this.error = this.activeSolver.error;
      return;
    }
    if (!this.activeSolver.solved) return;
    if (this.stage === "priority") {
      this.activeSolver = new PowerTraceExpanderSolver({
        ...structuredClone(this.input),
        traces: this.activeSolver.getOutput(),
      });
      this.stage = "whole-board";
      return;
    }
    this.stage = "complete";
    this.solved = true;
  }

  solve() {
    while (!this.solved && !this.failed) this.step();
  }

  getOutput() {
    return this.activeSolver.getOutput();
  }

  preview() {
    return this.activeSolver.preview();
  }
}

/**
 * Coordinates the normal board route with the following whole-board reroute.
 * Core removes in-region traces from the reroute SRJ, so retain both the
 * initial problem and initial solution for the standalone expander.
 */
export const createPhasedPowerTraceExpanderAlgorithm = () => {
  let initialInput: SimpleRouteJson | undefined;
  let initialTraces: SimplifiedPcbTrace[] | undefined;

  const initialAlgorithmFn = async (simpleRouteJson: SimpleRouteJson) =>
    new InitialBoardAutorouter(simpleRouteJson, (traces) => {
      initialInput = structuredClone(simpleRouteJson);
      initialTraces = structuredClone(traces);
    });

  const rerouteAlgorithmFn = async (_simpleRouteJson: SimpleRouteJson) => {
    if (!initialInput || !initialTraces) {
      throw new Error(
        "Power trace expansion started before initial board routing completed",
      );
    }

    const expansionProblem = {
      ...structuredClone(initialInput),
      traces: [
        ...structuredClone(initialInput.traces ?? []),
        ...structuredClone(initialTraces),
      ],
    };
    const solver = new PrioritizedPowerTraceExpanderSolver(expansionProblem);
    return new SolverAutorouterAdapter({
      input: expansionProblem,
      solver,
      getOutput: (activeSolver) => activeSolver.getOutput(),
      getPhase: (activeSolver) => String(activeSolver.stats.phase ?? "fix"),
    });
  };

  return { initialAlgorithmFn, rerouteAlgorithmFn };
};
