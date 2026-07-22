import {
  PowerTraceExpanderAutorouter,
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
    return new PowerTraceExpanderAutorouter(expansionProblem);
  };

  return { initialAlgorithmFn, rerouteAlgorithmFn };
};
