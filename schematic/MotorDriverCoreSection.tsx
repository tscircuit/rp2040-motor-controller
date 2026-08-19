import { DRV8847PWPR } from "../imports/DRV8847PWPR";
import { BSS84 } from "../imports/BSS84";
import {
  groundTrace,
  logicTrace,
  powerTrace,
  schematicSections,
  schematicSheets,
} from "./config";

export const MotorDriverController = () => (
  <>
    <DRV8847PWPR
      name="DRIVER"
      pcbX={11}
      pcbY={-0.5}
      schX={-5.5}
      schY={0}
      schWidth={3.8}
      schHeight={4.6}
      schMarginLeft={1}
      schMarginRight={1}
      schPinArrangement={{
        leftSide: {
          pins: [2, 3, 4, 7, 6, 5],
          direction: "top-to-bottom",
        },
        rightSide: {
          pins: [16, 15, 9, 10, 1, 8],
          direction: "top-to-bottom",
        },
        topSide: {
          pins: [12],
          direction: "left-to-right",
        },
        bottomSide: {
          pins: [13, 17],
          direction: "left-to-right",
        },
      }}
      schPinStyle={{
        pin7: { marginTop: 0.45 },
        pin9: { marginTop: 0.45 },
        pin1: { marginTop: 0.45 },
      }}
      schSheetName={schematicSheets.motorDriver}
      schSectionName={schematicSections.driverCore}
    />
  </>
);

export const MotorDriverPassives = () => (
  <>
    <capacitor
      name="C_VM_BULK"
      capacitance="10uF"
      footprint="1206"
      supplierPartNumbers={{ jlcpcb: ["C77093"] }}
      manufacturerPartNumber="GRM31CR71E106KA12L"
      pcbX={15}
      pcbY={5}
      maxDecouplingTraceLength={5.5}
      schX={-1.2}
      schY={-3.5}
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
      supplierPartNumbers={{ jlcpcb: ["C14663"] }}
      pcbX={10.8}
      pcbY={4.2}
      maxDecouplingTraceLength={5.5}
      schX={-1.2}
      schY={-1.5}
      schMarginX={0.15}
      schMarginY={0.25}
      schOrientation="vertical"
      schSheetName={schematicSheets.motorDriver}
      schSectionName={schematicSections.driverCore}
    />
    <resistor
      name="R_ISEN_A"
      resistance="0.15"
      footprint="2512"
      supplierPartNumbers={{ jlcpcb: ["C2903485"] }}
      manufacturerPartNumber="HoJLR2512-3W-150mR-1%"
      pcbX={6}
      pcbY={-8.5}
      schX={-10}
      schY={1.5}
      schSheetName={schematicSheets.motorDriver}
      schSectionName={schematicSections.driverCore}
    />
    <resistor
      name="R_ISEN_B"
      resistance="0.15"
      footprint="2512"
      supplierPartNumbers={{ jlcpcb: ["C2903485"] }}
      manufacturerPartNumber="HoJLR2512-3W-150mR-1%"
      pcbX={16}
      pcbY={-8.5}
      schX={-10}
      schY={-1.5}
      schSheetName={schematicSheets.motorDriver}
      schSectionName={schematicSections.driverCore}
    />
    <resistor
      name="R_SLEEP_PD"
      resistance="100k"
      footprint="0402"
      supplierPartNumbers={{ jlcpcb: ["C25741"] }}
      pcbX={2}
      pcbY={-5}
      schX={-8}
      schY={-4.5}
      schSheetName={schematicSheets.motorDriver}
      schSectionName={schematicSections.driverCore}
    />
    <resistor
      name="R_FAULT_PU"
      resistance="10k"
      footprint="0402"
      supplierPartNumbers={{ jlcpcb: ["C25744"] }}
      manufacturerPartNumber="0402WGF1002TCE"
      pcbX={18}
      pcbY={-4.5}
      schX={-8}
      schY={-7}
      schSheetName={schematicSheets.motorDriver}
      schSectionName={schematicSections.driverCore}
    />
    <BSS84
      name="Q_PD_ENABLE"
      pcbX={4}
      pcbY={-1.5}
      schX={-12}
      schY={-3}
      schWidth={1.6}
      schHeight={1.8}
      schPinArrangement={{
        leftSide: { pins: [1], direction: "top-to-bottom" },
        rightSide: { pins: [2, 3], direction: "top-to-bottom" },
      }}
      schSheetName={schematicSheets.motorDriver}
      schSectionName={schematicSections.driverCore}
    />
    <resistor
      name="R_PD_ENABLE_PU"
      resistance="100k"
      footprint="0402"
      supplierPartNumbers={{ jlcpcb: ["C25741"] }}
      pcbX={1}
      pcbY={0}
      schX={-10}
      schY={-3}
      schSheetName={schematicSheets.motorDriver}
      schSectionName={schematicSections.driverCore}
    />
  </>
);

export const MotorDriverControlTraces = () => (
  <>
    <trace
      name="DRIVER_AIN1"
      from=".MCU > .U1 > .GPIO18"
      to=".DRIVER > .AIN1"
      {...logicTrace}
    />
    <trace
      name="DRIVER_AIN2"
      from=".MCU > .U1 > .GPIO19"
      to=".DRIVER > .AIN2"
      {...logicTrace}
    />
    <trace
      name="DRIVER_BIN1"
      from=".MCU > .U1 > .GPIO20"
      to=".DRIVER > .BIN1"
      {...logicTrace}
    />
    <trace
      name="DRIVER_BIN2"
      from=".MCU > .U1 > .GPIO21"
      to=".DRIVER > .BIN2"
      {...logicTrace}
    />
    <trace
      name="DRIVER_SLEEP"
      from=".MCU > .U1 > .GPIO22"
      to=".Q_PD_ENABLE > .source"
      {...logicTrace}
    />
    <trace
      name="DRIVER_FAULT"
      from=".MCU > .U1 > .GPIO23"
      to=".DRIVER > .nFault"
      thickness="0.1mm"
    />
  </>
);

export const MotorDriverPowerTraces = () => (
  <>
    <trace
      name="VM_BULK"
      from=".DRIVER > .VM"
      to=".C_VM_BULK > .pin1"
      schDisplayLabel="VMOTOR"
      {...powerTrace}
    />
    <trace
      name="VM_HF"
      from=".DRIVER > .VM"
      to=".C_VM_HF > .pin1"
      {...powerTrace}
    />
  </>
);

export const MotorDriverPrimaryGroundTraces = () => (
  <>
    <trace
      name="COMMON_GND"
      from=".DRIVER > .GND2"
      to=".MCU > .U1 > .GND"
      {...groundTrace}
    />
    <trace
      name="DRIVER_GND_JOIN"
      from=".DRIVER > .GND1"
      to=".DRIVER > .GND2"
      {...groundTrace}
    />
  </>
);

export const MotorDriverGroundTraces = () => (
  <>
    <trace
      name="ISEN_A_GND"
      from=".R_ISEN_A > .pin2"
      to="net.GND"
      {...groundTrace}
    />
    <trace
      name="ISEN_B_GND"
      from=".R_ISEN_B > .pin2"
      to="net.GND"
      {...groundTrace}
    />
    <trace
      name="VM_BULK_GND"
      from=".C_VM_BULK > .pin2"
      to="net.GND"
      {...groundTrace}
    />
    <trace
      name="VM_HF_GND"
      from=".C_VM_HF > .pin2"
      to="net.GND"
      {...groundTrace}
    />
    <trace
      name="SLEEP_PULLDOWN_GND"
      from=".R_SLEEP_PD > .pin2"
      to="net.GND"
      {...logicTrace}
    />
  </>
);

export const MotorDriverSenseAndControlTraces = () => (
  <>
    <trace
      name="ISEN_A"
      from=".DRIVER > .AISEN"
      to=".R_ISEN_A > .pin1"
      schDisplayLabel="A_ISEN"
      {...powerTrace}
    />
    <trace
      name="ISEN_B"
      from=".DRIVER > .BISEN"
      to=".R_ISEN_B > .pin1"
      schDisplayLabel="B_ISEN"
      {...powerTrace}
    />
    <trace name="DRIVER_MODE" from=".DRIVER > .MODE" to="net.GND" {...logicTrace} />
    <trace name="DRIVER_TRQ" from=".DRIVER > .TRQ" to="net.GND" {...logicTrace} />
    <trace
      name="PD_ENABLE_OUTPUT"
      from=".Q_PD_ENABLE > .drain"
      to=".DRIVER > .nSleep"
      {...logicTrace}
    />
    <trace
      name="PD_ENABLE_GATE"
      from=".Q_PD_ENABLE > .gate"
      to=".U_PD > .PG"
      schDisplayLabel="PD_GOOD"
      {...logicTrace}
    />
    <trace
      name="PD_ENABLE_GATE_PULLUP"
      from=".R_PD_ENABLE_PU > .pin1"
      to=".Q_PD_ENABLE > .gate"
      {...logicTrace}
    />
    <trace
      name="PD_ENABLE_PULLUP_SUPPLY"
      from=".R_PD_ENABLE_PU > .pin2"
      to=".U_PD > .VDD"
      {...logicTrace}
    />
    <trace
      name="SLEEP_PULLDOWN"
      from=".R_SLEEP_PD > .pin1"
      to=".DRIVER > .nSleep"
      schDisplayLabel="nSLEEP"
      {...logicTrace}
    />
    <trace
      name="FAULT_PULLUP"
      from=".R_FAULT_PU > .pin1"
      to=".DRIVER > .nFault"
      schDisplayLabel="nFAULT"
      thickness="0.1mm"
    />
    <trace
      name="FAULT_PULLUP_3V3"
      from=".R_FAULT_PU > .pin2"
      to="net.V3V3"
      {...logicTrace}
    />
  </>
);
