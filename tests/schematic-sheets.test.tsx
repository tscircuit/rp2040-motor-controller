import { expect, test } from "bun:test";
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "circuit-to-svg";
import { Circuit } from "tscircuit";
import Rp2040MotorController from "../index.circuit";

test("renders the controller, motor driver, and motor power sheets", async () => {
  const circuit = new Circuit({ platform: { pcbDisabled: true } });
  circuit.add(<Rp2040MotorController />);

  await circuit.renderUntilSettled();
  const circuitJson = circuit.getCircuitJson();
  const controllerSheetId = circuitJson.flatMap((element) =>
    element.type === "schematic_sheet" && element.name === "controller"
      ? [element.schematic_sheet_id]
      : [],
  )[0];
  if (!controllerSheetId) {
    throw new Error("Controller schematic sheet is missing");
  }
  const schematicUnitsPerMillimeter = 1.1 / 10.16;
  const innerHalfWidth =
    (297 * schematicUnitsPerMillimeter) / 2 -
    5 * schematicUnitsPerMillimeter;
  const innerHalfHeight =
    (210 * schematicUnitsPerMillimeter) / 2 -
    5 * schematicUnitsPerMillimeter;
  const componentFrameClearance = 0.5;
  const sourceComponentNames = new Map(
    circuitJson.flatMap((element) =>
      element.type === "source_component"
        ? [[element.source_component_id, element.name] as const]
        : [],
    ),
  );
  const controllerComponentsOutsideFrame = circuitJson.flatMap((element) => {
    if (
      element.type !== "schematic_component" ||
      element.schematic_sheet_id !== controllerSheetId
    ) {
      return [];
    }
    const halfWidth = element.size.width / 2 + componentFrameClearance;
    const halfHeight = element.size.height / 2 + componentFrameClearance;
    const insideFrame =
      element.center.x - halfWidth >= -innerHalfWidth &&
      element.center.x + halfWidth <= innerHalfWidth &&
      element.center.y - halfHeight >= -innerHalfHeight &&
      element.center.y + halfHeight <= innerHalfHeight;
    return insideFrame
      ? []
      : [
          {
            name: element.source_component_id
              ? sourceComponentNames.get(element.source_component_id)
              : undefined,
            center: element.center,
            size: element.size,
          },
        ];
  });

  expect(controllerComponentsOutsideFrame).toEqual([]);
  expect(
    convertCircuitJsonToStackedSchematicSheetsSvg(circuitJson, {
      width: 1400,
      includeVersion: true,
      showErrorsInTextOverlay: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path);
});
