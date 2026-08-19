import { expect, test } from "bun:test";
import {
  checkPadTraceClearance,
  checkSourceTracesMatchPcbTraceThickness,
  runAllRoutingChecks,
} from "@tscircuit/checks";
import type { PcbSmtPad, PcbVia } from "circuit-json";
import { Circuit } from "tscircuit";
import Rp2040MotorController from "../index.circuit";
import { routedViaOverlapsPad } from "./helpers/routedViaOverlapsPad";

test("renders the complete RP2040 dual-motor controller", async () => {
  const circuit = new Circuit();
  circuit.add(<Rp2040MotorController routingDisabled={false} />);

  await circuit.renderUntilSettled();

  const circuitJson = circuit.getCircuitJson();
  const sourceComponents = circuitJson.filter(
    (element) => element.type === "source_component",
  );
  const componentsMissingJlcpcbPartNumbers = sourceComponents
    .filter(
      (component) =>
        component.ftype !== "simple_test_point" &&
        !component.supplier_part_numbers?.jlcpcb?.length,
    )
    .map((component) => component.name)
    .sort();
  const schematicSheets = circuitJson
    .filter((element) => element.type === "schematic_sheet")
    .sort((a, b) => (a.sheet_index ?? 0) - (b.sheet_index ?? 0));
  const schematicComponents = circuitJson.filter(
    (element) => element.type === "schematic_component",
  );
  const schematicOutsideSheetWarnings = circuitJson.filter(
    (element) =>
      String(element.type) === "schematic_element_outside_sheet_warning",
  );
  const schematicSheetIds = new Set(
    schematicSheets.map((sheet) => sheet.schematic_sheet_id),
  );
  const schematicText = new Set(
    circuitJson.flatMap((element) =>
      element.type === "schematic_text" ? [element.text] : [],
    ),
  );

  expect(
    sourceComponents.some(
      (component) => component.manufacturer_part_number === "RP2040",
    ),
  ).toBe(true);
  expect(
    sourceComponents.some(
      (component) => component.manufacturer_part_number === "DRV8847PWPR",
    ),
  ).toBe(true);
  expect(
    sourceComponents.some(
      (component) => component.manufacturer_part_number === "CH224K",
    ),
  ).toBe(true);
  expect(
    sourceComponents.some(
      (component) =>
        component.manufacturer_part_number === "TYPE_C_16PIN_2MD_073_",
    ),
  ).toBe(true);
  expect(componentsMissingJlcpcbPartNumbers).toEqual([]);
  expect(
    schematicSheets.map((sheet) => ({
      name: sheet.name,
      displayName: (sheet as typeof sheet & { display_name?: string })
        .display_name,
      sheetIndex: sheet.sheet_index,
    })),
  ).toEqual([
    {
      name: "controller",
      displayName: "RP2040 Controller",
      sheetIndex: 1,
    },
    {
      name: "controller_programming",
      displayName: "Programming USB-C & QSPI",
      sheetIndex: 2,
    },
    {
      name: "motor_driver",
      displayName: "Dual Motor Driver",
      sheetIndex: 3,
    },
    {
      name: "motor_power",
      displayName: "USB-C PD Motor Power",
      sheetIndex: 4,
    },
  ]);
  expect(
    schematicComponents.every(
      (component) =>
        Boolean(component.schematic_sheet_id) &&
        schematicSheetIds.has(component.schematic_sheet_id!),
    ),
  ).toBe(true);
  expect(schematicComponents.length).toBeGreaterThan(0);
  expect(schematicOutsideSheetWarnings).toEqual([]);
  expect([...schematicText]).toEqual(
    expect.arrayContaining([
      "RP2040 & Power",
      "USB-C, QSPI Flash & 3.3V Power",
      "Clock",
      "Status & SWD Debug",
      "H-Bridge, Power & Control",
      "Motor Outputs",
      "USB-C PD Negotiation",
      "Power Filtering",
    ]),
  );
  const unexpectedErrors = circuitJson.filter((element) =>
    element.type.endsWith("_error"),
  );
  const routingIssues = await runAllRoutingChecks(structuredClone(circuitJson));
  const widthWarnings = checkSourceTracesMatchPcbTraceThickness(circuitJson);
  const powerSourceTraceIds = new Set<string>(
    circuitJson.flatMap((element) =>
      element.type === "source_trace" &&
      (element.min_trace_thickness ?? 0) >= 0.5
        ? [element.source_trace_id!]
        : [],
    ),
  );
  const powerPcbTraceIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "pcb_trace" &&
      Boolean(element.source_trace_id) &&
      powerSourceTraceIds.has(element.source_trace_id!)
        ? [element.pcb_trace_id]
        : [],
    ),
  );
  const preferredPowerPadClearanceIssues = checkPadTraceClearance(circuitJson, {
    minClearance: 0.15,
  }).filter((issue) => powerPcbTraceIds.has(issue.pcb_trace_id));
  const uniqueUnderWidthTraceIds = new Set(
    widthWarnings.map((warning) => warning.pcb_trace_id),
  );
  const copperPours = circuitJson.filter(
    (element) => element.type === "pcb_copper_pour",
  );
  const pcbTraceIds = new Set(
    circuitJson.flatMap((element) =>
      element.type === "pcb_trace" ? [element.pcb_trace_id] : [],
    ),
  );
  const routedVias = circuitJson.filter(
    (element): element is PcbVia =>
      element.type === "pcb_via" &&
      Boolean(element.pcb_trace_id) &&
      pcbTraceIds.has(element.pcb_trace_id!),
  );
  const routedViaLocations = routedVias.map(
    (via) => `${via.x.toFixed(9)},${via.y.toFixed(9)}`,
  );
  const consecutiveViaRuns = circuitJson.flatMap((element) => {
    if (element.type !== "pcb_trace") return [];
    const runs: number[] = [];
    let runLength = 0;
    for (const point of element.route) {
      if (point.route_type === "via") {
        runLength++;
      } else {
        if (runLength > 1) runs.push(runLength);
        runLength = 0;
      }
    }
    if (runLength > 1) runs.push(runLength);
    return runs;
  });
  const smtPads = circuitJson.filter(
    (element): element is PcbSmtPad => element.type === "pcb_smtpad",
  );
  const traceEndpointPorts = new Map<string, Set<string>>();
  for (const element of circuitJson) {
    if (element.type !== "pcb_trace") continue;
    const endpointPorts = new Set<string>();
    for (const point of element.route) {
      if (point.route_type !== "wire") continue;
      if (point.start_pcb_port_id) endpointPorts.add(point.start_pcb_port_id);
      if (point.end_pcb_port_id) endpointPorts.add(point.end_pcb_port_id);
    }
    traceEndpointPorts.set(element.pcb_trace_id, endpointPorts);
  }
  const routedViaPadOverlaps = routedVias.flatMap((via) =>
    smtPads
      // An escape via may intentionally merge with the terminal pad belonging
      // to that same trace. Only contact with a foreign pad is a DRC problem.
      .filter(
        (pad) =>
          routedViaOverlapsPad(via, pad) &&
          !traceEndpointPorts
            .get(via.pcb_trace_id!)
            ?.has(pad.pcb_port_id!),
      )
      .map((pad) => ({
        pcb_via_id: via.pcb_via_id,
        pcb_trace_id: via.pcb_trace_id,
        pcb_smtpad_id: pad.pcb_smtpad_id,
      })),
  );
  const copperPourNetIds = new Set(
    copperPours.map((pour) => pour.source_net_id),
  );
  const copperPourNet = circuitJson.find(
    (element) =>
      element.type === "source_net" &&
      copperPourNetIds.has(element.source_net_id),
  );
  const upperMotorASourceTrace = circuitJson.find(
    (element) =>
      element.type === "source_trace" &&
      element.display_name === ".DRIVER > .AOUT2 to .P_MOTOR_A > .pin2",
  );
  const upperMotorASourceTraceId =
    upperMotorASourceTrace?.type === "source_trace"
      ? upperMotorASourceTrace.source_trace_id
      : undefined;
  const upperMotorAPcbTrace = circuitJson.find(
    (element) =>
      element.type === "pcb_trace" &&
      element.source_trace_id === upperMotorASourceTraceId,
  );
  const rIsenBSourceTrace = circuitJson.find(
    (element) =>
      element.type === "source_trace" &&
      element.display_name === ".DRIVER > .BISEN to .R_ISEN_B > .pin1",
  );
  const rIsenBSourceTraceId =
    rIsenBSourceTrace?.type === "source_trace"
      ? rIsenBSourceTrace.source_trace_id
      : undefined;
  const rIsenBPcbTrace = circuitJson.find(
    (element) =>
      element.type === "pcb_trace" &&
      element.source_trace_id === rIsenBSourceTraceId,
  );
  let upperMotorALength = 0;
  let upperMotorANominalLength = 0;
  let upperMotorAWidthArea = 0;
  let upperMotorABottomLength = 0;
  let upperMotorALongestUnderNominalRun = 0;
  let upperMotorACurrentUnderNominalRun = 0;
  let upperMotorAMinWidth = Number.POSITIVE_INFINITY;
  if (upperMotorAPcbTrace?.type === "pcb_trace") {
    for (let index = 0; index < upperMotorAPcbTrace.route.length - 1; index++) {
      const start = upperMotorAPcbTrace.route[index];
      const end = upperMotorAPcbTrace.route[index + 1];
      if (
        start?.route_type !== "wire" ||
        end?.route_type !== "wire" ||
        start.layer !== end.layer
      ) {
        upperMotorACurrentUnderNominalRun = 0;
        continue;
      }
      const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
      const conservativeWidth = Math.min(start.width, end.width);
      upperMotorAMinWidth = Math.min(upperMotorAMinWidth, conservativeWidth);
      upperMotorALength += segmentLength;
      upperMotorAWidthArea += segmentLength * conservativeWidth;
      if (conservativeWidth >= 1 - 1e-6) {
        upperMotorANominalLength += segmentLength;
        upperMotorACurrentUnderNominalRun = 0;
      } else {
        upperMotorACurrentUnderNominalRun += segmentLength;
        upperMotorALongestUnderNominalRun = Math.max(
          upperMotorALongestUnderNominalRun,
          upperMotorACurrentUnderNominalRun,
        );
      }
      if (start.layer === "bottom") upperMotorABottomLength += segmentLength;
    }
  }

  expect(unexpectedErrors).toEqual([]);
  expect(routingIssues).toEqual([]);
  expect(routedViaPadOverlaps).toEqual([]);
  // Coincident via records become repeated NC-drill hits even though the PCB
  // snapshot renders them as one circle. Every routed via must be physically
  // unique in the autorouter output.
  expect(new Set(routedViaLocations).size).toBe(routedViaLocations.length);
  // A normal layer transition has one via. Multiple consecutive via route
  // points indicate that a post-routing via-stitching pass modified the route.
  expect(consecutiveViaRuns).toEqual([]);
  // The board's hard rule is 0.1 mm. Pipeline 7's integrated power-trace
  // expansion targets half of each power trace's nominal width; the remaining
  // 0.15 mm misses are dense DRV8847 and USB-C package escapes.
  expect(preferredPowerPadClearanceIssues.length).toBeLessThanOrEqual(20);
  expect(
    preferredPowerPadClearanceIssues.every(
      (issue) => (issue.actual_clearance ?? 0) >= 0.1 - 1e-9,
    ),
  ).toBe(true);
  expect(copperPours.length).toBeGreaterThanOrEqual(2);
  expect(new Set(copperPours.map((pour) => pour.layer))).toEqual(
    new Set(["top", "bottom"]),
  );
  expect(copperPours.some((pour) => pour.layer === "top")).toBe(true);
  expect(copperPours.some((pour) => pour.layer === "bottom")).toBe(true);
  expect(copperPourNetIds.size).toBe(1);
  expect(copperPourNet?.type === "source_net" && copperPourNet.name).toBe(
    "GND",
  );
  expect(
    copperPours.every(
      (pour) =>
        pour.shape === "brep" &&
        pour.brep_shape.outer_ring.vertices.length >= 3 &&
        pour.covered_with_solder_mask,
    ),
  ).toBe(true);
  expect(upperMotorASourceTrace?.type).toBe("source_trace");
  expect(upperMotorAPcbTrace?.type).toBe("pcb_trace");
  const upperMotorAVias =
    upperMotorAPcbTrace?.type === "pcb_trace"
      ? upperMotorAPcbTrace.route.filter((point) => point.route_type === "via")
      : [];
  expect(upperMotorAVias.length).toBeLessThanOrEqual(2);
  if (upperMotorAVias.length > 0) {
    // The exact C8465 terminal footprint moves pin 2 closer to the driver than
    // the previous placeholder did. Keep a nontrivial bottom-layer run when
    // the solver uses a via, without encoding the placeholder's geometry.
    expect(upperMotorABottomLength).toBeGreaterThan(2);
  } else {
    expect(upperMotorABottomLength).toBe(0);
  }
  // The integrated expander may use a 0.175 mm neck at the fine-pitch DRV8847 pad,
  // then widens the motor trace before reaching 1 mm. Keep that neck
  // short while requiring most of the exact-terminal route to stay nominal.
  expect(upperMotorAMinWidth).toBeGreaterThanOrEqual(0.175);
  expect(upperMotorALongestUnderNominalRun).toBeLessThanOrEqual(5);
  expect(upperMotorANominalLength / upperMotorALength).toBeGreaterThan(0.75);
  expect(upperMotorAWidthArea / upperMotorALength).toBeGreaterThan(0.85);
  expect(rIsenBSourceTrace?.type).toBe("source_trace");
  expect(rIsenBPcbTrace?.type).toBe("pcb_trace");
  const rIsenBVias =
    rIsenBPcbTrace?.type === "pcb_trace"
      ? rIsenBPcbTrace.route.filter((point) => point.route_type === "via")
      : [];
  // Pipeline 7 may briefly use the bottom layer to escape this dense driver
  // area. Bound the detour to one down/up via pair.
  expect(rIsenBVias.length).toBeLessThanOrEqual(2);
  // This check reports the minimum route-point width for an entire connected
  // net, so it is a board-integration regression budget rather than a
  // length-weighted quality metric. Keep Pipeline 7's current escape budget
  // bounded while the route-specific assertions above guard copper quality.
  expect(widthWarnings.length).toBeLessThanOrEqual(47);
  expect(uniqueUnderWidthTraceIds.size).toBeLessThanOrEqual(22);
}, 600_000);
