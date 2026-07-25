import { Microcontroller_RP2040 } from "@tscircuit/common";
import { CH224K } from "./imports/CH224K";
import { DRV8833PWPR } from "./imports/DRV8833PWPR";
import { TYPE_C_16PIN_2MD_073_ } from "./imports/TYPE_C_16PIN_2MD_073_";
import { WJ500V_5_08_2P } from "./imports/WJ500V_5_08_2P";
import { createPhasedPowerTraceExpanderAlgorithm } from "./lib/createPhasedPowerTraceExpanderAlgorithm";

const logicTrace = { thickness: "0.25mm" } as const;
const powerTrace = { thickness: "1mm" } as const;
const motorTrace = { thickness: "1mm" } as const;

const schematicSheets = {
  controller: "controller",
  motorDriver: "motor_driver",
  motorPower: "motor_power",
} as const;

const schematicSections = {
  controllerCore: "rp2040",
  controllerUsb: "usb",
  controllerClock: "clock",
  controllerStatus: "status",
  driverCore: "motor_driver_core",
  motorOutputs: "motor_driver_outputs",
  pdNegotiation: "motor_power_pd_negotiation",
  pdFiltering: "motor_power_filtering",
} as const;

export default function Rp2040MotorController() {
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
      autorouterEffortLevel="10x"
    >
      <net name="GND" />

      <schematicsheet
        name={schematicSheets.controller}
        displayName="RP2040 Controller"
        sheetIndex={1}
      >
        <schematicsection
          name={schematicSections.controllerCore}
          displayName="RP2040 & Power"
        />
        <schematicsection
          name={schematicSections.controllerUsb}
          displayName="Programming USB-C & QSPI"
        />
        <schematicsection
          name={schematicSections.controllerClock}
          displayName="Clock"
        />
        <schematicsection
          name={schematicSections.controllerStatus}
          displayName="Status & SWD Debug"
        />
      </schematicsheet>

      <schematicsheet
        name={schematicSheets.motorDriver}
        displayName="Dual Motor Driver"
        sheetIndex={2}
      >
        <schematicsection
          name={schematicSections.driverCore}
          displayName="H-Bridge, Power & Control"
        />
        <schematicsection
          name={schematicSections.motorOutputs}
          displayName="Motor Outputs"
        />
      </schematicsheet>

      <schematicsheet
        name={schematicSheets.motorPower}
        displayName="USB-C PD Motor Power"
        sheetIndex={3}
      >
        <schematicsection
          name={schematicSections.pdNegotiation}
          displayName="USB-C PD Negotiation"
        />
        <schematicsection
          name={schematicSections.pdFiltering}
          displayName="Power Filtering"
        />
      </schematicsheet>

      <autoroutingphase
        reroute
        region={{ minX: -45, maxX: 45, minY: -37.5, maxY: 37.5 }}
        autorouter={{
          local: true,
          algorithmFn: rerouteAlgorithmFn,
        }}
      />

      <Microcontroller_RP2040
        name="MCU"
        autorouter="auto_local"
        schAutoLayoutEnabled
        schSheetName={schematicSheets.controller}
        pcbX={-25}
        schX={-3.1}
        schY={8.5}
      />
      <DRV8833PWPR
        name="DRIVER"
        pcbX={11}
        pcbY={0}
        schX={-4.2}
        schY={-1.5}
        schHeight={1.8}
        schMarginLeft={1.4}
        schMarginRight={0.5}
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
        connections={{ GND2: "net.GND" }}
      />

      <TYPE_C_16PIN_2MD_073_
        name="J_MOTOR_USB"
        noConnect={["B8", "A8"]}
        pcbX={28}
        pcbY={31}
        pcbRotation={180}
        schX={6.5}
        schY={-1.5}
        schSheetName={schematicSheets.motorPower}
        schSectionName={schematicSections.pdNegotiation}
      />
      <CH224K
        name="U_PD"
        noConnect={["CFG2", "CFG3", "PG"]}
        pcbX={18}
        pcbY={23}
        pcbRotation={90}
        schX={-2.2}
        schY={-1.5}
        schHeight={1.2}
        schMarginRight={0.8}
        schSheetName={schematicSheets.motorPower}
        schSectionName={schematicSections.pdNegotiation}
      />
      <WJ500V_5_08_2P
        name="P_MOTOR_A"
        pcbX={34}
        pcbY={5}
        pcbRotation={90}
        schX={9}
        schY={2.5}
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.motorOutputs}
      />
      <WJ500V_5_08_2P
        name="P_MOTOR_B"
        pcbX={34}
        pcbY={-15}
        pcbRotation={90}
        schX={9}
        schY={-5.5}
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.motorOutputs}
      />

      <capacitor
        name="C_PD_VBUS"
        capacitance="10uF"
        footprint="1206"
        pcbX={20}
        pcbY={31}
        schX={3}
        schY={-7.5}
        schOrientation="vertical"
        schSheetName={schematicSheets.motorPower}
        schSectionName={schematicSections.pdFiltering}
      />
      <capacitor
        name="C_PD_VDD"
        capacitance="1uF"
        footprint="0603"
        pcbX={11}
        pcbY={25}
        schOrientation="vertical"
        schSheetName={schematicSheets.motorPower}
        schSectionName={schematicSections.pdNegotiation}
      />
      <resistor
        name="R_PD_VDD"
        resistance="1k"
        footprint="0603"
        pcbX={15}
        pcbY={29}
        schMarginX={0.25}
        schMarginY={0.2}
        schSheetName={schematicSheets.motorPower}
        schSectionName={schematicSections.pdNegotiation}
      />
      <resistor
        name="R_PD_VBUS"
        resistance="10k"
        footprint="0603"
        pcbX={24}
        pcbY={21}
        schMarginX={0.25}
        schMarginY={0.2}
        schSheetName={schematicSheets.motorPower}
        schSectionName={schematicSections.pdNegotiation}
      />
      <resistor
        name="R_PD_CFG1"
        resistance="6.8k"
        footprint="0603"
        pcbX={11}
        pcbY={19}
        schMarginX={0.25}
        schMarginY={0.2}
        schSheetName={schematicSheets.motorPower}
        schSectionName={schematicSections.pdNegotiation}
      />

      <capacitor
        name="C_VM_BULK"
        capacitance="10uF"
        footprint="1206"
        pcbX={16}
        pcbY={8}
        schMarginX={0.15}
        schMarginY={0.25}
        schOrientation="vertical"
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
      />
      <capacitor
        name="C_VM_HF"
        capacitance="100nF"
        footprint="0603"
        pcbX={12}
        pcbY={8}
        schMarginX={0.15}
        schMarginY={0.25}
        schOrientation="vertical"
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
      />
      <capacitor
        name="C_VCP"
        capacitance="10nF"
        footprint="0402"
        pcbX={8}
        pcbY={6}
        schMarginX={0.15}
        schMarginY={0.25}
        schOrientation="vertical"
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
      />
      <capacitor
        name="C_VINT"
        capacitance="2.2uF"
        footprint="0603"
        pcbX={5}
        pcbY={2}
        schMarginX={0.15}
        schMarginY={0.25}
        schOrientation="vertical"
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
      />

      <resistor
        name="R_ISEN_A"
        resistance="0.2"
        footprint="2512"
        pcbX={5}
        pcbY={-9}
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
      />
      <resistor
        name="R_ISEN_B"
        resistance="0.2"
        footprint="2512"
        pcbX={17}
        pcbY={-9}
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
      />
      <resistor
        name="R_SLEEP_PD"
        resistance="100k"
        footprint="0402"
        pcbX={5}
        pcbY={-3}
        schX={-8}
        schY={-4.5}
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
      />
      <resistor
        name="R_FAULT_PU"
        resistance="10k"
        footprint="0402"
        pcbX={5}
        pcbY={-5}
        schX={-8}
        schY={-7}
        schSheetName={schematicSheets.motorDriver}
        schSectionName={schematicSections.driverCore}
      />

      <trace from=".MCU > .U1 > .GPIO0" to=".DRIVER > .AIN1" {...logicTrace} />
      <trace from=".MCU > .U1 > .GPIO1" to=".DRIVER > .AIN2" {...logicTrace} />
      <trace from=".MCU > .U1 > .GPIO2" to=".DRIVER > .BIN1" {...logicTrace} />
      <trace from=".MCU > .U1 > .GPIO3" to=".DRIVER > .BIN2" {...logicTrace} />
      <trace
        from=".MCU > .U1 > .GPIO4"
        to=".DRIVER > .nSleep"
        {...logicTrace}
      />
      <trace
        from=".MCU > .U1 > .GPIO5"
        to=".DRIVER > .nFault"
        {...logicTrace}
      />

      <trace
        from=".J_MOTOR_USB > .A4B9"
        to=".J_MOTOR_USB > .B4A9"
        {...powerTrace}
      />
      <trace
        from=".J_MOTOR_USB > .A4B9"
        to=".DRIVER > .VM"
        schDisplayLabel="VMOTOR"
        {...powerTrace}
      />
      <trace
        from=".J_MOTOR_USB > .A4B9"
        to=".C_PD_VBUS > .pin1"
        {...powerTrace}
      />
      <trace
        from=".J_MOTOR_USB > .A4B9"
        to=".R_PD_VDD > .pin1"
        {...logicTrace}
      />
      <trace
        from=".J_MOTOR_USB > .A4B9"
        to=".R_PD_VBUS > .pin1"
        {...logicTrace}
      />
      <trace
        from=".R_PD_VDD > .pin2"
        to=".U_PD > .VDD"
        schDisplayLabel="PD_VDD"
        {...logicTrace}
      />
      <trace
        from=".R_PD_VBUS > .pin2"
        to=".U_PD > .VBUS"
        schDisplayLabel="PD_VBUS"
        {...logicTrace}
      />
      <trace from=".U_PD > .VDD" to=".C_PD_VDD > .pin1" {...logicTrace} />
      <trace
        from=".U_PD > .CFG1"
        to=".R_PD_CFG1 > .pin1"
        schDisplayLabel="CFG1"
        {...logicTrace}
      />

      <trace
        from=".J_MOTOR_USB > .A5"
        to=".U_PD > .CC1"
        schDisplayLabel="CC1"
        {...logicTrace}
      />
      <trace
        from=".J_MOTOR_USB > .B5"
        to=".U_PD > .CC2"
        schDisplayLabel="CC2"
        {...logicTrace}
      />
      <trace
        from=".J_MOTOR_USB > .A6"
        to=".U_PD > .DP"
        schDisplayLabel="USB_D+"
        {...logicTrace}
      />
      <trace
        from=".J_MOTOR_USB > .B6"
        to=".J_MOTOR_USB > .A6"
        {...logicTrace}
      />
      <trace
        from=".J_MOTOR_USB > .A7"
        to=".U_PD > .DM"
        schDisplayLabel="USB_D-"
        {...logicTrace}
      />
      <trace
        from=".J_MOTOR_USB > .B7"
        to=".J_MOTOR_USB > .A7"
        {...logicTrace}
      />

      <trace
        from=".DRIVER > .VM"
        to=".C_VM_BULK > .pin1"
        schDisplayLabel="VMOTOR"
        {...powerTrace}
      />
      <trace from=".DRIVER > .VM" to=".C_VM_HF > .pin1" {...powerTrace} />
      <trace from=".DRIVER > .VM" to=".C_VCP > .pin2" {...logicTrace} />

      <trace from=".DRIVER > .GND2" to=".MCU > .U1 > .GND" {...powerTrace} />
      <trace from=".DRIVER > .GND1" to=".DRIVER > .GND2" {...powerTrace} />
      <trace
        from=".J_MOTOR_USB > .A1B12"
        to=".DRIVER > .GND2"
        {...powerTrace}
      />
      <trace
        from=".J_MOTOR_USB > .B1A12"
        to=".J_MOTOR_USB > .A1B12"
        {...powerTrace}
      />
      <trace
        from=".J_MOTOR_USB > .EH1"
        to=".J_MOTOR_USB > .A1B12"
        {...powerTrace}
      />
      <trace
        from=".J_MOTOR_USB > .EH2"
        to=".J_MOTOR_USB > .A1B12"
        {...powerTrace}
      />
      <trace
        from=".J_MOTOR_USB > .EH3"
        to=".J_MOTOR_USB > .A1B12"
        {...powerTrace}
      />
      <trace
        from=".J_MOTOR_USB > .EH4"
        to=".J_MOTOR_USB > .A1B12"
        {...powerTrace}
      />
      <trace from=".U_PD > .GND" to=".DRIVER > .GND2" {...powerTrace} />
      <trace from=".C_PD_VBUS > .pin2" to=".DRIVER > .GND2" {...powerTrace} />
      <trace from=".C_PD_VDD > .pin2" to=".DRIVER > .GND2" {...logicTrace} />
      <trace from=".R_PD_CFG1 > .pin2" to=".DRIVER > .GND2" {...logicTrace} />
      <trace from=".R_ISEN_A > .pin2" to=".DRIVER > .GND2" {...powerTrace} />
      <trace from=".R_ISEN_B > .pin2" to=".DRIVER > .GND2" {...powerTrace} />
      <trace from=".C_VINT > .pin2" to=".DRIVER > .GND2" {...logicTrace} />
      <trace from=".C_VM_BULK > .pin2" to=".DRIVER > .GND2" {...powerTrace} />
      <trace from=".C_VM_HF > .pin2" to=".DRIVER > .GND2" {...powerTrace} />
      <trace from=".R_SLEEP_PD > .pin2" to=".DRIVER > .GND2" {...logicTrace} />

      <trace
        from=".DRIVER > .AOUT1"
        to=".P_MOTOR_A > .pin1"
        schDisplayLabel="MOTOR_A1"
        {...motorTrace}
      />
      <trace
        from=".DRIVER > .AOUT2"
        to=".P_MOTOR_A > .pin2"
        schDisplayLabel="MOTOR_A2"
        {...motorTrace}
      />
      <trace
        from=".DRIVER > .BOUT1"
        to=".P_MOTOR_B > .pin1"
        schDisplayLabel="MOTOR_B1"
        {...motorTrace}
      />
      <trace
        from=".DRIVER > .BOUT2"
        to=".P_MOTOR_B > .pin2"
        schDisplayLabel="MOTOR_B2"
        {...motorTrace}
      />

      <trace
        from=".DRIVER > .AISEN"
        to=".R_ISEN_A > .pin1"
        schDisplayLabel="A_ISEN"
        {...powerTrace}
      />
      <trace
        from=".DRIVER > .BISEN"
        to=".R_ISEN_B > .pin1"
        schDisplayLabel="B_ISEN"
        {...powerTrace}
      />
      <trace
        from=".DRIVER > .VCP"
        to=".C_VCP > .pin1"
        schDisplayLabel="VCP"
        {...logicTrace}
      />
      <trace
        from=".DRIVER > .VINT"
        to=".C_VINT > .pin1"
        schDisplayLabel="VINT"
        {...logicTrace}
      />
      <trace
        from=".R_SLEEP_PD > .pin1"
        to=".DRIVER > .nSleep"
        schDisplayLabel="nSLEEP"
        {...logicTrace}
      />
      <trace
        from=".R_FAULT_PU > .pin1"
        to=".DRIVER > .nFault"
        schDisplayLabel="nFAULT"
        {...logicTrace}
      />
      <trace
        from=".R_FAULT_PU > .pin2"
        to=".MCU > .U1 > .IOVDD1"
        {...logicTrace}
      />

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
