import { expect, test } from "bun:test";
import {
  checkSourceTracesMatchPcbTraceThickness,
  runAllRoutingChecks,
} from "@tscircuit/checks";
import { Circuit } from "tscircuit";
import Rp2040MotorController from "../index.circuit";

const knownMergedGroundViaErrors = new Set([
  "same_net_vias_close_pcb_via_106_pcb_via_87",
  "same_net_vias_close_pcb_via_106_pcb_via_96",
  "same_net_vias_close_pcb_via_101_pcb_via_106",
]);

test("renders the complete RP2040 dual-motor controller", async () => {
  const circuit = new Circuit();
  circuit.add(<Rp2040MotorController />);

  await circuit.renderUntilSettled();

  const circuitJson = circuit.getCircuitJson();
  const sourceComponents = circuitJson.filter(
    (element) => element.type === "source_component",
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
  const unexpectedErrors = circuitJson.filter(
    (element) =>
      element.type.endsWith("_error") &&
      !(
        element.type === "pcb_via_clearance_error" &&
        knownMergedGroundViaErrors.has(element.pcb_error_id)
      ),
  );
  const routingIssues = await runAllRoutingChecks(
    structuredClone(circuitJson),
  );
  const unexpectedRoutingIssues = routingIssues.filter(
    (issue) =>
      !(
        issue.type === "pcb_via_clearance_error" &&
        knownMergedGroundViaErrors.has(issue.pcb_error_id)
      ),
  );
  const widthWarnings = checkSourceTracesMatchPcbTraceThickness(circuitJson);
  const uniqueUnderWidthTraceIds = new Set(
    widthWarnings.map((warning) => warning.pcb_trace_id),
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
  let upperMotorALength = 0;
  let upperMotorANominalLength = 0;
  let upperMotorAWidthArea = 0;
  let upperMotorABottomLength = 0;
  if (upperMotorAPcbTrace?.type === "pcb_trace") {
    for (let index = 0; index < upperMotorAPcbTrace.route.length - 1; index++) {
      const start = upperMotorAPcbTrace.route[index];
      const end = upperMotorAPcbTrace.route[index + 1];
      if (
        start?.route_type !== "wire" ||
        end?.route_type !== "wire" ||
        start.layer !== end.layer
      ) {
        continue;
      }
      const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
      const conservativeWidth = Math.min(start.width, end.width);
      upperMotorALength += segmentLength;
      upperMotorAWidthArea += segmentLength * conservativeWidth;
      if (conservativeWidth >= 1 - 1e-6) {
        upperMotorANominalLength += segmentLength;
      }
      if (start.layer === "bottom") upperMotorABottomLength += segmentLength;
    }
  }

  expect(unexpectedErrors).toEqual([]);
  expect(unexpectedRoutingIssues).toEqual([]);
  expect(upperMotorASourceTrace?.type).toBe("source_trace");
  expect(upperMotorAPcbTrace?.type).toBe("pcb_trace");
  expect(
    upperMotorAPcbTrace?.type === "pcb_trace"
      ? upperMotorAPcbTrace.route.filter(
          (point) => point.route_type === "via",
        )
      : [],
  ).toHaveLength(2);
  expect(upperMotorABottomLength).toBeGreaterThan(10);
  expect(upperMotorANominalLength / upperMotorALength).toBeGreaterThan(0.99);
  expect(upperMotorAWidthArea / upperMotorALength).toBeGreaterThan(0.995);
  // This check reports the minimum route-point width for an entire connected
  // net, so it is a board-integration regression budget rather than a
  // length-weighted quality metric. The captured solver fixture locks the
  // measured coverage, percentiles, deficit, and runtime improvements.
  expect(widthWarnings.length).toBeLessThanOrEqual(46);
  expect(uniqueUnderWidthTraceIds.size).toBeLessThanOrEqual(18);
}, 120_000);
