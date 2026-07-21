import { expect, test } from "bun:test";
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

  expect(unexpectedErrors).toEqual([]);
}, 120_000);
