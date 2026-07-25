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
  circuit.add(<Rp2040MotorController />);

  await circuit.renderUntilSettled();

  const circuitJson = circuit.getCircuitJson();
  const sourceComponents = circuitJson.filter(
    (element) => element.type === "source_component",
  );
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
      (component) => component.manufacturer_part_number === "DRV8833PWPR",
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
      name: "motor_driver",
      displayName: "Dual Motor Driver",
      sheetIndex: 2,
    },
    {
      name: "motor_power",
      displayName: "USB-C PD Motor Power",
      sheetIndex: 3,
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
      "Programming USB-C & QSPI",
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
  const routedVias = circuitJson.filter(
    (element): element is PcbVia =>
      element.type === "pcb_via" && Boolean(element.pcb_trace_id),
  );
  const smtPads = circuitJson.filter(
    (element): element is PcbSmtPad => element.type === "pcb_smtpad",
  );
  const routedViaPadOverlaps = routedVias.flatMap((via) =>
    smtPads
      .filter((pad) => routedViaOverlapsPad(via, pad))
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
  // The board's hard rule is 0.1 mm. The expander now targets half of each
  // power trace's nominal width; the remaining 0.15 mm misses are the dense
  // DRV8833 and USB-C package escapes named by this integration fixture.
  expect(preferredPowerPadClearanceIssues.length).toBeLessThanOrEqual(14);
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
    expect(upperMotorABottomLength).toBeGreaterThan(6.5);
  } else {
    expect(upperMotorABottomLength).toBe(0);
  }
  // The 0.903 mm DRV8833 package escape is the only continuous neck. Guard
  // its physical length rather than rewarding a longer detour with a higher
  // percentage score.
  expect(upperMotorALongestUnderNominalRun).toBeLessThanOrEqual(0.91);
  expect(upperMotorANominalLength / upperMotorALength).toBeGreaterThan(0.94);
  expect(upperMotorAWidthArea / upperMotorALength).toBeGreaterThan(0.98);
  expect(rIsenBSourceTrace?.type).toBe("source_trace");
  expect(rIsenBPcbTrace?.type).toBe("pcb_trace");
  expect(
    rIsenBPcbTrace?.type === "pcb_trace"
      ? rIsenBPcbTrace.route.filter((point) => point.route_type === "via")
      : [],
  ).toEqual([]);
  // This check reports the minimum route-point width for an entire connected
  // net, so it is a board-integration regression budget rather than a
  // length-weighted quality metric. The captured solver fixture locks the
  // measured coverage, percentiles, deficit, and runtime improvements.
  expect(widthWarnings.length).toBeLessThanOrEqual(46);
  expect(uniqueUnderWidthTraceIds.size).toBeLessThanOrEqual(18);
}, 180_000);
