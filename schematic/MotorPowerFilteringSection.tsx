import {
  groundTrace,
  powerTrace,
  schematicSections,
  schematicSheets,
} from "./config";

export const MotorPowerFilteringComponents = () => (
  <>
    <fuse
      name="F_MOTOR_VBUS"
      currentRating="2A"
      voltageRating="30V"
      footprint="1812"
      supplierPartNumbers={{ jlcpcb: ["C960026"] }}
      manufacturerPartNumber="BSMD1812-200-30V"
      pcbX={29}
      pcbY={23}
      schX={-3}
      schY={-7.5}
      schSheetName={schematicSheets.motorPower}
      schSectionName={schematicSections.pdFiltering}
    />
    <capacitor
      name="C_PD_VBUS"
      capacitance="10uF"
      footprint="1206"
      supplierPartNumbers={{ jlcpcb: ["C77093"] }}
      manufacturerPartNumber="GRM31CR71E106KA12L"
      pcbX={28}
      pcbY={18}
      pcbRotation={270}
      maxDecouplingTraceLength={10}
      schX={3}
      schY={-7.5}
      schOrientation="vertical"
      schSheetName={schematicSheets.motorPower}
      schSectionName={schematicSections.pdFiltering}
    />
    <capacitor
      name="C_MOTOR_BULK"
      capacitance="220uF"
      footprint="electrolytic_p2.5mm_id0.8mm_od1.6mm_d6.3mm"
      supplierPartNumbers={{ jlcpcb: ["C43340"] }}
      manufacturerPartNumber="KS227M016E07RR0VH2FP0"
      pcbX={34}
      pcbY={18}
      pcbRotation={90}
      schX={6}
      schY={-7.5}
      schOrientation="vertical"
      schSheetName={schematicSheets.motorPower}
      schSectionName={schematicSections.pdFiltering}
    />
    <diode
      name="D_MOTOR_TVS"
      footprint="smb"
      supplierPartNumbers={{ jlcpcb: ["C9019"] }}
      manufacturerPartNumber="SMBJ11CA"
      pcbX={18}
      pcbY={14}
      schX={9}
      schY={-7.5}
      schOrientation="vertical"
      schSheetName={schematicSheets.motorPower}
      schSectionName={schematicSections.pdFiltering}
    />
  </>
);

export const MotorPowerFilteringSupplyTrace = () => (
  <>
    <trace
      name="MOTOR_VBUS_FUSE_INPUT"
      from=".J_MOTOR_USB > .A4B9"
      to=".F_MOTOR_VBUS > .pin1"
      {...powerTrace}
    />
    <trace
      name="MOTOR_VBUS_CAP"
      from=".F_MOTOR_VBUS > .pin2"
      to=".C_PD_VBUS > .pin1"
      schDisplayLabel="VMOTOR_PROTECTED"
      {...powerTrace}
    />
    <trace
      name="MOTOR_VBUS_BULK"
      from=".F_MOTOR_VBUS > .pin2"
      to=".C_MOTOR_BULK > .pin1"
      {...powerTrace}
    />
    <trace
      name="MOTOR_VBUS_TVS"
      from=".F_MOTOR_VBUS > .pin2"
      to=".D_MOTOR_TVS > .cathode"
      {...powerTrace}
    />
  </>
);

export const MotorPowerFilteringGroundTrace = () => (
  <>
    <trace
      name="PD_VBUS_CAP_GND"
      from=".C_PD_VBUS > .pin2"
      to="net.GND"
      {...groundTrace}
    />
    <trace
      name="MOTOR_BULK_GND"
      from=".C_MOTOR_BULK > .pin2"
      to="net.GND"
      {...groundTrace}
    />
    <trace
      name="MOTOR_TVS_GND"
      from=".D_MOTOR_TVS > .anode"
      to="net.GND"
      {...groundTrace}
    />
  </>
);
