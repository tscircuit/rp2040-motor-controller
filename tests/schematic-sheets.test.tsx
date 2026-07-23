import { expect, test } from "bun:test";
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "circuit-to-svg";
import { Circuit } from "tscircuit";
import Rp2040MotorController from "../index.circuit";

test("renders the controller, motor driver, and motor power sheets", async () => {
  const circuit = new Circuit({ platform: { pcbDisabled: true } });
  circuit.add(<Rp2040MotorController />);

  await circuit.renderUntilSettled();

  expect(
    convertCircuitJsonToStackedSchematicSheetsSvg(circuit.getCircuitJson(), {
      width: 1400,
      includeVersion: true,
      showErrorsInTextOverlay: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path);
});
