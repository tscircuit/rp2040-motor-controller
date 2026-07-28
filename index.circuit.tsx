import { createPhasedPowerTraceExpanderAlgorithm } from "./lib/createPhasedPowerTraceExpanderAlgorithm";
import { ControllerSections } from "./schematic/ControllerSections";
import {
  MotorDriverController,
  MotorDriverControlTraces,
  MotorDriverGroundTraces,
  MotorDriverPassives,
  MotorDriverPowerTraces,
  MotorDriverPrimaryGroundTraces,
  MotorDriverSenseAndControlTraces,
} from "./schematic/MotorDriverCoreSection";
import {
  MotorOutputConnectors,
  MotorOutputTraces,
} from "./schematic/MotorOutputsSection";
import {
  MotorPowerFilteringComponents,
  MotorPowerFilteringGroundTrace,
  MotorPowerFilteringSupplyTrace,
} from "./schematic/MotorPowerFilteringSection";
import {
  MotorPowerPdConnectorGroundTraces,
  MotorPowerPdControllers,
  MotorPowerPdInputTraces,
  MotorPowerPdPassives,
  MotorPowerPdPrimaryGroundTrace,
  MotorPowerPdProtocolTraces,
  MotorPowerPdSupportGroundTraces,
} from "./schematic/MotorPowerPdNegotiationSection";
import { SchematicSheets } from "./schematic/SchematicSheets";

export default function Rp2040MotorController({
  routingDisabled = true,
}: {
  routingDisabled?: boolean;
} = {}) {
  const { initialAlgorithmFn, rerouteAlgorithmFn } =
    createPhasedPowerTraceExpanderAlgorithm();

  return (
    <board
      width="90mm"
      height="75mm"
      autorouter={{
        local: true,
        groupMode: "subcircuit",
        algorithmFn: initialAlgorithmFn,
      }}
    >
      <net name="GND" />
      <SchematicSheets />

      <autoroutingphase
        reroute
        region={{ minX: -45, maxX: 45, minY: -37.5, maxY: 37.5 }}
        autorouter={{
          local: true,
          algorithmFn: rerouteAlgorithmFn,
        }}
      />

      <ControllerSections />
      <MotorDriverController />
      <MotorPowerPdControllers />
      <MotorOutputConnectors />
      <MotorPowerFilteringComponents />
      <MotorPowerPdPassives />
      <MotorDriverPassives />

      <MotorDriverControlTraces />
      <MotorPowerPdInputTraces />
      <MotorPowerFilteringSupplyTrace />
      <MotorPowerPdProtocolTraces />
      <MotorDriverPowerTraces />
      <MotorDriverPrimaryGroundTraces />
      <MotorPowerPdPrimaryGroundTrace />
      <MotorPowerPdConnectorGroundTraces />
      <MotorPowerFilteringGroundTrace />
      <MotorPowerPdSupportGroundTraces />
      <MotorDriverGroundTraces />
      <MotorOutputTraces />
      <MotorDriverSenseAndControlTraces />

      <copperpour
        name="GND_TOP"
        layer="top"
        connectsTo="net.GND"
        clearance="0.2mm"
        padMargin="0.2mm"
        traceMargin="0.2mm"
        boardEdgeMargin="0.3mm"
        coveredWithSolderMask
      />
      <copperpour
        name="GND_BOTTOM"
        layer="bottom"
        connectsTo="net.GND"
        clearance="0.2mm"
        padMargin="0.2mm"
        traceMargin="0.2mm"
        boardEdgeMargin="0.3mm"
        coveredWithSolderMask
      />

      <hole diameter="3.2mm" pcbX={-41} pcbY={33} />
      <hole diameter="3.2mm" pcbX={41} pcbY={33} />
      <hole diameter="3.2mm" pcbX={-41} pcbY={-33} />
      <hole diameter="3.2mm" pcbX={41} pcbY={-33} />

      <silkscreentext
        text="RP2040 DUAL MOTOR"
        fontSize="1.2mm"
        pcbX={-2}
        pcbY={34}
      />
      <silkscreentext
        text="USB-C PD MOTOR"
        fontSize="1mm"
        pcbX={34}
        pcbY={22}
      />
      <silkscreentext text="REQUESTS 9V" fontSize="0.9mm" pcbX={34} pcbY={19} />
      <silkscreentext text="MOTOR A" fontSize="1mm" pcbX={32} pcbY={-2} />
      <silkscreentext text="MOTOR B" fontSize="1mm" pcbX={32} pcbY={-22} />
    </board>
  );
}
