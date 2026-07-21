import { GenericSolverDebugger } from "@tscircuit/solver-utils/react";
import { useMemo } from "react";
import { TraceWidthFixerSolver } from "../lib/trace-width-fixer";
import { traceWidthFixerFixture } from "./trace-width-fixer-fixture";

export default function TraceWidthFixerDebuggerPage() {
  const solver = useMemo(
    () => new TraceWidthFixerSolver(structuredClone(traceWidthFixerFixture)),
    [],
  );

  return <GenericSolverDebugger solver={solver} animationSpeed={30} />;
}
