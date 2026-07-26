import { expect, test } from "bun:test";
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "circuit-to-svg";
import { Circuit } from "tscircuit";
import Rp2040MotorController from "../index.circuit";

test("renders the controller, motor driver, and motor power sheets", async () => {
  const circuit = new Circuit({ platform: { pcbDisabled: true } });
  circuit.add(<Rp2040MotorController />);

  await circuit.renderUntilSettled();
  const circuitJson = circuit.getCircuitJson() as any[];
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
  const schematicComponentsByName = new Map(
    circuitJson.flatMap((element) => {
      if (element.type !== "schematic_component") {
        return [];
      }
      const name = element.source_component_id
        ? sourceComponentNames.get(element.source_component_id)
        : undefined;
      return name ? [[name, element] as const] : [];
    }),
  );
  const componentsOutsideSheetFrames = circuitJson.flatMap((element) => {
    if (element.type !== "schematic_component") {
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
            sheetId: element.schematic_sheet_id,
            name: element.source_component_id
              ? sourceComponentNames.get(element.source_component_id)
              : undefined,
            center: element.center,
            size: element.size,
          },
        ];
  });

  expect(componentsOutsideSheetFrames).toEqual([]);
  expect(
    circuitJson.filter(
      (element) =>
        element.type === "schematic_element_outside_sheet_warning",
    ),
  ).toEqual([]);

  const getSchematicComponent = (name: string) => {
    const component = schematicComponentsByName.get(name);
    if (!component) {
      throw new Error(`Missing schematic component ${name}`);
    }
    return component;
  };
  const distanceBetweenComponents = (firstName: string, secondName: string) => {
    const first = getSchematicComponent(firstName);
    const second = getSchematicComponent(secondName);
    return Math.hypot(
      first.center.x - second.center.x,
      first.center.y - second.center.y,
    );
  };

  const iovddCapacitors = [
    "C_IOVDD1",
    "C_IOVDD2",
    "C_IOVDD3",
    "C_IOVDD4",
    "C_IOVDD5",
    "C_IOVDD6",
  ].map(getSchematicComponent);
  const iovddRows = new Map<number, number>();
  for (const capacitor of iovddCapacitors) {
    const rowKey = Math.round(capacitor.center.y * 1000);
    iovddRows.set(rowKey, (iovddRows.get(rowKey) ?? 0) + 1);
  }
  const rp2040 = getSchematicComponent("U1");
  const nearestIovddCapacitorRightEdge = Math.max(
    ...iovddCapacitors.map(
      (capacitor) => capacitor.center.x + capacitor.size.width / 2,
    ),
  );
  const rp2040LeftEdge = rp2040.center.x - rp2040.size.width / 2;

  expect([...iovddRows.values()]).toEqual([6]);
  expect(rp2040LeftEdge - nearestIovddCapacitorRightEdge).toBeGreaterThan(0.75);

  const localDecouplingDistances: Array<
    [capacitorName: string, targetName: string, maximumDistance: number]
  > = [
    ["C_CORE", "U1", 4.25],
    ["C_FLASH", "U2", 4],
    ["C_USB_VDD", "J_USB", 5],
    ["C_USB", "J_USB", 5],
    ["C_XIN", "Y1", 2.5],
    ["C_XOUT", "Y1", 2.5],
    ["C_VINT", "DRIVER", 3],
    ["C_VCP", "DRIVER", 3],
    ["C_VM_HF", "DRIVER", 4],
    ["C_VM_BULK", "DRIVER", 5],
    ["C_PD_VDD", "U_PD", 3],
  ];
  for (const [capacitorName, targetName, maximumDistance] of
    localDecouplingDistances) {
    expect(
      distanceBetweenComponents(capacitorName, targetName),
    ).toBeLessThan(maximumDistance);
  }

  expect(
    convertCircuitJsonToStackedSchematicSheetsSvg(circuitJson, {
      width: 1400,
      includeVersion: true,
      showErrorsInTextOverlay: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path);
});
