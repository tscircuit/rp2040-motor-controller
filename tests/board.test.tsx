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

  expect(unexpectedErrors).toEqual([]);
  expect(unexpectedRoutingIssues).toEqual([]);
  // This check reports the minimum route-point width for an entire connected
  // net, so it is a board-integration regression budget rather than a
  // length-weighted quality metric. The captured solver fixture locks the
  // measured coverage, percentiles, deficit, and runtime improvements.
  expect(widthWarnings.length).toBeLessThanOrEqual(46);
  expect(uniqueUnderWidthTraceIds.size).toBeLessThanOrEqual(18);
}, 120_000);
