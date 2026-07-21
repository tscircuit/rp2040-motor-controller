import type {
  SimpleRouteConnection,
  SimplifiedPcbTrace,
} from "@tscircuit/core";
import { BaseSolver } from "@tscircuit/solver-utils";
import type { GraphicsObject } from "graphics-debug";
import {
  distance,
  splitUnderWidthWireSegments,
  WIDTH_EPSILON,
} from "./geometry";
import { ObstacleAwareGridRouteSolver } from "./ObstacleAwareGridRouteSolver";
import { SpatialObstacleIndex } from "./SpatialObstacleIndex";
import type {
  GridOffset,
  GridRouteOutput,
  TraceWidthFixerInput,
  TraceWidthFixerOutput,
  WireRoutePoint,
} from "./types";

type SolverPhase =
  "scan-trace" | "evaluate-segment" | "try-grid-candidate" | "complete";

const GRID_OFFSETS: GridOffset[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 0, y: 0.5 },
  { x: 0.5, y: 0.5 },
];

const uniqueDescending = (values: number[]) =>
  [...new Set(values.map((value) => Number(value.toFixed(6))))].sort(
    (a, b) => b - a,
  );

const isWire = (
  point: SimplifiedPcbTrace["route"][number] | undefined,
): point is WireRoutePoint => point?.route_type === "wire";

export class TraceWidthFixerSolver extends BaseSolver {
  readonly inputProblem: TraceWidthFixerInput;
  traces: SimplifiedPcbTrace[];
  obstacleIndex: SpatialObstacleIndex;

  phase: SolverPhase = "scan-trace";
  traceIndex = -1;
  routeSegmentIndex = 0;
  nominalTraceWidth = 0;
  currentTargetIndices: number[] = [];
  targetCursor = 0;
  gridSizes: number[] = [];
  gridCursor = 0;
  offsetCursor = 0;

  keptTraceCount = 0;
  recreatedTraceCount = 0;
  expandedSegmentCount = 0;
  reroutedSegmentCount = 0;
  unresolvedSegmentCount = 0;
  attemptedGridCount = 0;

  declare activeSubSolver: ObstacleAwareGridRouteSolver | null;

  constructor(inputProblem: TraceWidthFixerInput) {
    super();
    this.inputProblem = structuredClone(inputProblem);
    this.traces = structuredClone(inputProblem.traces ?? []);
    this.obstacleIndex = new SpatialObstacleIndex(
      this.inputProblem,
      this.traces,
    );
    this.activeSubSolver = null;
    this.MAX_ITERATIONS = 1_000_000;
    this.stats = this.createStats();
  }

  override getSolverName() {
    return "TraceWidthFixerSolver";
  }

  override _step() {
    if (this.activeSubSolver) {
      this.stepActiveGridSolver();
      this.stats = this.createStats();
      return;
    }

    switch (this.phase) {
      case "scan-trace":
        this.scanNextTrace();
        break;
      case "evaluate-segment":
        this.evaluateNextSegment();
        break;
      case "try-grid-candidate":
        this.startNextGridCandidate();
        break;
      case "complete":
        this.solved = true;
        break;
    }
    this.stats = this.createStats();
  }

  private scanNextTrace() {
    this.traceIndex++;
    this.routeSegmentIndex = 0;
    if (this.traceIndex >= this.traces.length) {
      this.phase = "complete";
      return;
    }

    const trace = this.traces[this.traceIndex]!;
    // Flatbush is immutable, so rebuild once per trace. Every change made while
    // processing this trace is same-net geometry and is intentionally ignored;
    // the next trace sees the completed result in its fresh index.
    this.rebuildObstacleIndex();
    this.nominalTraceWidth = this.resolveNominalTraceWidth(trace);
    if (this.traceMeetsNominalWidth(trace, this.nominalTraceWidth)) {
      this.keptTraceCount++;
      return;
    }

    trace.route = splitUnderWidthWireSegments(
      trace.route,
      this.nominalTraceWidth,
    ) as SimplifiedPcbTrace["route"];
    this.recreatedTraceCount++;
    this.phase = "evaluate-segment";
  }

  private evaluateNextSegment() {
    const trace = this.traces[this.traceIndex];
    if (!trace) {
      this.phase = "scan-trace";
      return;
    }

    const segmentIndex = this.findNextUnderWidthSegment(
      trace,
      this.routeSegmentIndex,
      this.nominalTraceWidth,
    );
    if (segmentIndex === -1) {
      this.phase = "scan-trace";
      return;
    }
    this.routeSegmentIndex = segmentIndex;
    const start = trace.route[segmentIndex]!;
    const end = trace.route[segmentIndex + 1]!;
    if (!isWire(start) || !isWire(end)) {
      this.routeSegmentIndex++;
      return;
    }

    const connectionNames = this.getTraceConnectionNames(trace);
    const canExpand = this.canExpandSegmentAndEndpoints(
      trace,
      segmentIndex,
      connectionNames,
    );

    if (canExpand) {
      start.width = Math.max(start.width, this.nominalTraceWidth);
      end.width = Math.max(end.width, this.nominalTraceWidth);
      this.expandedSegmentCount++;
      this.routeSegmentIndex++;
      return;
    }

    this.currentTargetIndices = this.getExponentialTargetIndices(
      trace,
      segmentIndex,
      this.nominalTraceWidth,
    );
    this.targetCursor = 0;
    this.gridSizes = this.getGridSizes(this.nominalTraceWidth);
    this.gridCursor = 0;
    this.offsetCursor = 0;
    if (this.currentTargetIndices.length === 0) {
      this.unresolvedSegmentCount++;
      this.routeSegmentIndex++;
      return;
    }
    this.phase = "try-grid-candidate";
  }

  private startNextGridCandidate() {
    const trace = this.traces[this.traceIndex];
    if (!trace) {
      this.phase = "scan-trace";
      return;
    }
    if (this.gridCursor >= this.gridSizes.length) {
      this.unresolvedSegmentCount++;
      this.routeSegmentIndex++;
      this.phase = "evaluate-segment";
      return;
    }
    if (this.targetCursor >= this.currentTargetIndices.length) {
      this.gridCursor++;
      this.targetCursor = 0;
      this.offsetCursor = 0;
      return;
    }
    if (this.offsetCursor >= GRID_OFFSETS.length) {
      this.targetCursor++;
      this.offsetCursor = 0;
      return;
    }

    const targetIndex = this.currentTargetIndices[this.targetCursor]!;
    const start = trace.route[this.routeSegmentIndex]!;
    const end = trace.route[targetIndex]!;
    if (!isWire(start) || !isWire(end) || start.layer !== end.layer) {
      this.targetCursor++;
      this.offsetCursor = 0;
      return;
    }

    const gridSize = this.gridSizes[this.gridCursor]!;
    const existingIntervalWidth = this.getMaximumWireWidth(
      trace,
      this.routeSegmentIndex,
      targetIndex,
    );
    if (gridSize < existingIntervalWidth - WIDTH_EPSILON) {
      this.targetCursor++;
      this.offsetCursor = 0;
      return;
    }
    const normalizedOffset = GRID_OFFSETS[this.offsetCursor]!;
    const gridOffset = {
      x: normalizedOffset.x * gridSize,
      y: normalizedOffset.y * gridSize,
    };
    this.attemptedGridCount++;
    this.activeSubSolver = new ObstacleAwareGridRouteSolver({
      start,
      end,
      layer: start.layer,
      traceWidth: gridSize,
      gridSize,
      gridOffset,
      connectionNames: this.getTraceConnectionNames(trace),
      obstacleIndex: this.obstacleIndex,
      ignoreTraceIndex: this.traceIndex,
      ignoreRouteRange: {
        start: Math.max(0, this.routeSegmentIndex - 1),
        end: Math.min(trace.route.length - 1, targetIndex + 1),
      },
      bounds: this.inputProblem.bounds,
      searchPadding: Math.min(
        5,
        Math.max(1.5, distance(start, end) / 2, this.nominalTraceWidth * 3),
      ),
    });
  }

  private stepActiveGridSolver() {
    const solver = this.activeSubSolver!;
    solver.step();
    if (!solver.solved && !solver.failed) return;

    if (solver.solved) {
      const output = solver.getOutput();
      if (
        output &&
        this.getPathLength(output.points) <= 10 + WIDTH_EPSILON &&
        !this.gridRouteBoundaryCollides(output)
      ) {
        this.applyGridRoute(output);
        this.activeSubSolver = null;
        return;
      }
    }

    this.failedSubSolvers ??= [];
    this.failedSubSolvers.push(solver);
    this.activeSubSolver = null;
    this.offsetCursor++;
  }

  private applyGridRoute(output: GridRouteOutput) {
    const trace = this.traces[this.traceIndex]!;
    const targetIndex = this.currentTargetIndices[this.targetCursor]!;
    const startPoint = trace.route[this.routeSegmentIndex] as WireRoutePoint;
    const replacement: WireRoutePoint[] = output.points.map((point) => ({
      route_type: "wire",
      x: point.x,
      y: point.y,
      width: output.traceWidth,
      layer: startPoint.layer,
    }));
    trace.route.splice(
      this.routeSegmentIndex,
      targetIndex - this.routeSegmentIndex + 1,
      ...replacement,
    );
    this.reroutedSegmentCount++;
    this.routeSegmentIndex += replacement.length - 1;
    this.currentTargetIndices = [];
    this.phase = "evaluate-segment";
  }

  private gridRouteBoundaryCollides(output: GridRouteOutput) {
    const trace = this.traces[this.traceIndex]!;
    const targetIndex = this.currentTargetIndices[this.targetCursor]!;
    const connectionNames = this.getTraceConnectionNames(trace);
    const boundaries = [
      {
        startIndex: this.routeSegmentIndex - 1,
        endIndex: this.routeSegmentIndex,
      },
      { startIndex: targetIndex, endIndex: targetIndex + 1 },
    ];

    for (const boundary of boundaries) {
      const start = trace.route[boundary.startIndex];
      const end = trace.route[boundary.endIndex];
      if (!isWire(start) || !isWire(end) || start.layer !== end.layer) {
        continue;
      }
      if (
        this.obstacleIndex.collides({
          start,
          end,
          layer: start.layer,
          width: Math.max(start.width, end.width, output.traceWidth),
          connectionNames,
          ignoreTraceIndex: this.traceIndex,
          ignoreRouteRange: {
            start: boundary.startIndex,
            end: boundary.endIndex,
          },
        })
      ) {
        return true;
      }
    }
    return false;
  }

  private canExpandSegmentAndEndpoints(
    trace: SimplifiedPcbTrace,
    segmentIndex: number,
    connectionNames: string[],
  ) {
    const firstAffectedSegment = Math.max(0, segmentIndex - 1);
    const lastAffectedSegment = Math.min(
      trace.route.length - 2,
      segmentIndex + 1,
    );

    for (
      let affectedIndex = firstAffectedSegment;
      affectedIndex <= lastAffectedSegment;
      affectedIndex++
    ) {
      const affectedStart = trace.route[affectedIndex];
      const affectedEnd = trace.route[affectedIndex + 1];
      if (
        !isWire(affectedStart) ||
        !isWire(affectedEnd) ||
        affectedStart.layer !== affectedEnd.layer
      ) {
        continue;
      }
      const touchesExpandedPoint =
        affectedIndex <= segmentIndex + 1 &&
        affectedIndex + 1 >= segmentIndex;
      const proposedWidth = Math.max(
        affectedStart.width,
        affectedEnd.width,
        touchesExpandedPoint ? this.nominalTraceWidth : 0,
      );
      if (
        this.obstacleIndex.collides({
          start: affectedStart,
          end: affectedEnd,
          layer: affectedStart.layer,
          width: proposedWidth,
          connectionNames,
          ignoreTraceIndex: this.traceIndex,
          ignoreRouteRange: {
            start: firstAffectedSegment,
            end: lastAffectedSegment + 1,
          },
        })
      ) {
        return false;
      }
    }
    return true;
  }

  private getExponentialTargetIndices(
    trace: SimplifiedPcbTrace,
    startIndex: number,
    nominalWidth: number,
  ) {
    const targetIndices: number[] = [];
    let cumulativeDistance = 0;
    let threshold = Math.max(nominalWidth * 2, 0.3);
    let furthestIndex = -1;
    const start = trace.route[startIndex];
    if (!isWire(start)) return targetIndices;

    for (let index = startIndex; index < trace.route.length - 1; index++) {
      const current = trace.route[index];
      const next = trace.route[index + 1];
      if (!isWire(current) || !isWire(next) || current.layer !== next.layer)
        break;
      const segmentLength = distance(current, next);
      if (cumulativeDistance + segmentLength > 10 + WIDTH_EPSILON) break;
      cumulativeDistance += segmentLength;
      furthestIndex = index + 1;
      if (cumulativeDistance + WIDTH_EPSILON >= threshold) {
        targetIndices.push(index + 1);
        threshold *= 2;
      }
    }
    if (furthestIndex > startIndex && !targetIndices.includes(furthestIndex)) {
      targetIndices.push(furthestIndex);
    }
    return targetIndices;
  }

  private getGridSizes(nominalWidth: number) {
    const minimumWidth = this.inputProblem.minTraceWidth;
    return uniqueDescending([
      nominalWidth,
      nominalWidth * 0.75,
      nominalWidth * 0.5,
      minimumWidth,
    ]).filter((width) => width >= minimumWidth - WIDTH_EPSILON);
  }

  private resolveNominalTraceWidth(trace: SimplifiedPcbTrace) {
    const traceNames = this.getTraceConnectionNames(trace);
    const connection = this.inputProblem.connections.find((candidate) =>
      this.connectionMatchesTrace(candidate, traceNames),
    );
    return Math.max(
      connection?.nominalTraceWidth ??
        connection?.width ??
        this.inputProblem.nominalTraceWidth ??
        this.inputProblem.minTraceWidth,
      this.inputProblem.minTraceWidth,
    );
  }

  private connectionMatchesTrace(
    connection: SimpleRouteConnection,
    traceNames: string[],
  ) {
    return [
      connection.name,
      connection.source_trace_id,
      connection.rootConnectionName,
      ...(connection.mergedConnectionNames ?? []),
    ]
      .filter((name): name is string => Boolean(name))
      .some((name) => traceNames.includes(name));
  }

  private getTraceConnectionNames(trace: SimplifiedPcbTrace) {
    return [
      trace.connection_name,
      trace.source_trace_id,
      trace.rootConnectionName,
      ...(trace.mergedConnectionNames ?? []),
    ].filter((name): name is string => Boolean(name));
  }

  private traceMeetsNominalWidth(
    trace: SimplifiedPcbTrace,
    nominalWidth: number,
  ) {
    return trace.route.every(
      (point) =>
        point.route_type !== "wire" ||
        point.width >= nominalWidth - WIDTH_EPSILON,
    );
  }

  private findNextUnderWidthSegment(
    trace: SimplifiedPcbTrace,
    startIndex: number,
    nominalWidth: number,
  ) {
    for (let index = startIndex; index < trace.route.length - 1; index++) {
      const start = trace.route[index];
      const end = trace.route[index + 1];
      if (!isWire(start) || !isWire(end) || start.layer !== end.layer) continue;
      if (
        start.width < nominalWidth - WIDTH_EPSILON ||
        end.width < nominalWidth - WIDTH_EPSILON
      ) {
        return index;
      }
    }
    return -1;
  }

  private getPathLength(points: Array<{ x: number; y: number }>) {
    let length = 0;
    for (let index = 0; index < points.length - 1; index++) {
      length += distance(points[index]!, points[index + 1]!);
    }
    return length;
  }

  private getMaximumWireWidth(
    trace: SimplifiedPcbTrace,
    startIndex: number,
    endIndex: number,
  ) {
    let maximumWidth = 0;
    for (let index = startIndex; index <= endIndex; index++) {
      const point = trace.route[index];
      if (isWire(point)) maximumWidth = Math.max(maximumWidth, point.width);
    }
    return maximumWidth;
  }

  private rebuildObstacleIndex() {
    this.obstacleIndex = new SpatialObstacleIndex(
      this.inputProblem,
      this.traces,
    );
  }

  private createStats() {
    return {
      phase: this.phase,
      traceIndex: this.traceIndex,
      traceCount: this.traces.length,
      routeSegmentIndex: this.routeSegmentIndex,
      nominalTraceWidth: this.nominalTraceWidth,
      targetCursor: this.targetCursor,
      targetCount: this.currentTargetIndices.length,
      gridSize: this.gridSizes[this.gridCursor],
      gridOffsetVariant: this.offsetCursor,
      keptTraceCount: this.keptTraceCount,
      recreatedTraceCount: this.recreatedTraceCount,
      expandedSegmentCount: this.expandedSegmentCount,
      reroutedSegmentCount: this.reroutedSegmentCount,
      unresolvedSegmentCount: this.unresolvedSegmentCount,
      attemptedGridCount: this.attemptedGridCount,
      spatialIndexRectCount: this.obstacleIndex.items.length,
    };
  }

  computeProgress() {
    if (this.traces.length === 0) return 1;
    return Math.min(0.99, Math.max(0, this.traceIndex) / this.traces.length);
  }

  override getConstructorParams() {
    return [this.inputProblem];
  }

  override getOutput(): TraceWidthFixerOutput {
    return this.traces;
  }

  override visualize(): GraphicsObject {
    const lines: NonNullable<GraphicsObject["lines"]> = [];
    for (let traceIndex = 0; traceIndex < this.traces.length; traceIndex++) {
      const trace = this.traces[traceIndex]!;
      const nominalWidth = this.resolveNominalTraceWidth(trace);
      for (
        let routeIndex = 0;
        routeIndex < trace.route.length - 1;
        routeIndex++
      ) {
        const start = trace.route[routeIndex];
        const end = trace.route[routeIndex + 1];
        if (!isWire(start) || !isWire(end) || start.layer !== end.layer)
          continue;
        const isCurrent =
          traceIndex === this.traceIndex &&
          routeIndex === this.routeSegmentIndex;
        const meetsWidth =
          start.width >= nominalWidth - WIDTH_EPSILON &&
          end.width >= nominalWidth - WIDTH_EPSILON;
        lines.push({
          points: [start, end],
          strokeColor: isCurrent
            ? "#ff8c00"
            : meetsWidth
              ? "#169c45"
              : "#cc3344",
          strokeWidth: Math.max(start.width, end.width),
        });
      }
    }
    return {
      coordinateSystem: "cartesian",
      title: `Trace width fixer: ${this.phase}`,
      lines,
      points: [],
      circles: [],
      rects: this.obstacleIndex.items
        .filter((item) => item.kind === "obstacle")
        .slice(0, 2_000)
        .map((item) => ({
          center: {
            x: (item.minX + item.maxX) / 2,
            y: (item.minY + item.maxY) / 2,
          },
          width: item.maxX - item.minX,
          height: item.maxY - item.minY,
          fill: "rgba(80,80,80,0.12)",
          stroke: "rgba(80,80,80,0.35)",
        })),
      texts: [
        {
          x: this.inputProblem.bounds.minX,
          y: this.inputProblem.bounds.maxY,
          text: `${this.phase} · trace ${Math.max(0, this.traceIndex + 1)}/${this.traces.length} · segment ${this.routeSegmentIndex}`,
          color: "#222",
        },
      ],
    };
  }
}
