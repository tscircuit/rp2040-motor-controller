import { Microcontroller_RP2040 } from "@tscircuit/common";
import { CH224K } from "./imports/CH224K";
import { DRV8833PWPR } from "./imports/DRV8833PWPR";
import { TYPE_C_16PIN_2MD_073_ } from "./imports/TYPE_C_16PIN_2MD_073_";
import { WJ500V_5_08_2P } from "./imports/WJ500V_5_08_2P";
import { createPhasedTraceWidthFixerAlgorithm } from "./lib/trace-width-fixer";

const logicTrace = { thickness: "0.25mm" } as const;
const powerTrace = { thickness: "1mm" } as const;
const motorTrace = { thickness: "1mm" } as const;

export default function Rp2040MotorController() {
  const { initialAlgorithmFn, rerouteAlgorithmFn } =
    createPhasedTraceWidthFixerAlgorithm();

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
        pcbX={-25}
        schX={-15}
      />
      <DRV8833PWPR name="DRIVER" pcbX={11} pcbY={0} schX={8} />

      <TYPE_C_16PIN_2MD_073_
        name="J_MOTOR_USB"
        noConnect={["B8", "A8"]}
        pcbX={28}
        pcbY={31}
        pcbRotation={180}
        schX={26}
        schY={15}
      />
      <CH224K
        name="U_PD"
        noConnect={["CFG2", "CFG3", "PG"]}
        pcbX={18}
        pcbY={23}
        pcbRotation={90}
        schX={18}
        schY={15}
      />
      <WJ500V_5_08_2P
        name="P_MOTOR_A"
        pcbX={34}
        pcbY={5}
        pcbRotation={90}
        schX={21}
        schY={3}
      />
      <WJ500V_5_08_2P
        name="P_MOTOR_B"
        pcbX={34}
        pcbY={-15}
        pcbRotation={90}
        schX={21}
        schY={-5}
      />

      <capacitor
        name="C_PD_VBUS"
        capacitance="10uF"
        footprint="1206"
        pcbX={20}
        pcbY={31}
        schX={23}
        schY={11}
      />
      <capacitor
        name="C_PD_VDD"
        capacitance="1uF"
        footprint="0603"
        pcbX={11}
        pcbY={25}
        schX={13}
        schY={17}
      />
      <resistor
        name="R_PD_VDD"
        resistance="1k"
        footprint="0603"
        pcbX={15}
        pcbY={29}
        schX={14}
        schY={20}
      />
      <resistor
        name="R_PD_VBUS"
        resistance="10k"
        footprint="0603"
        pcbX={24}
        pcbY={21}
        schX={22}
        schY={20}
      />
      <resistor
        name="R_PD_CFG1"
        resistance="6.8k"
        footprint="0603"
        pcbX={11}
        pcbY={19}
        schX={13}
        schY={12}
      />

      <capacitor
        name="C_VM_BULK"
        capacitance="10uF"
        footprint="1206"
        pcbX={16}
        pcbY={8}
        schX={12}
        schY={10}
      />
      <capacitor
        name="C_VM_HF"
        capacitance="100nF"
        footprint="0603"
        pcbX={12}
        pcbY={8}
        schX={15}
        schY={10}
      />
      <capacitor
        name="C_VCP"
        capacitance="10nF"
        footprint="0402"
        pcbX={8}
        pcbY={6}
        schX={11}
        schY={6}
      />
      <capacitor
        name="C_VINT"
        capacitance="2.2uF"
        footprint="0603"
        pcbX={5}
        pcbY={2}
        schX={11}
        schY={2}
      />

      <resistor
        name="R_ISEN_A"
        resistance="0.2"
        footprint="2512"
        pcbX={5}
        pcbY={-9}
        schX={11}
        schY={-7}
      />
      <resistor
        name="R_ISEN_B"
        resistance="0.2"
        footprint="2512"
        pcbX={17}
        pcbY={-9}
        schX={15}
        schY={-7}
      />
      <resistor
        name="R_SLEEP_PD"
        resistance="100k"
        footprint="0402"
        pcbX={5}
        pcbY={-3}
        schX={3}
        schY={-5}
      />
      <resistor
        name="R_FAULT_PU"
        resistance="10k"
        footprint="0402"
        pcbX={5}
        pcbY={-5}
        schX={3}
        schY={-9}
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
      <trace from=".J_MOTOR_USB > .A4B9" to=".DRIVER > .VM" {...powerTrace} />
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
      <trace from=".R_PD_VDD > .pin2" to=".U_PD > .VDD" {...logicTrace} />
      <trace from=".R_PD_VBUS > .pin2" to=".U_PD > .VBUS" {...logicTrace} />
      <trace from=".U_PD > .VDD" to=".C_PD_VDD > .pin1" {...logicTrace} />
      <trace from=".U_PD > .CFG1" to=".R_PD_CFG1 > .pin1" {...logicTrace} />

      <trace from=".J_MOTOR_USB > .A5" to=".U_PD > .CC1" {...logicTrace} />
      <trace from=".J_MOTOR_USB > .B5" to=".U_PD > .CC2" {...logicTrace} />
      <trace from=".J_MOTOR_USB > .A6" to=".U_PD > .DP" {...logicTrace} />
      <trace
        from=".J_MOTOR_USB > .B6"
        to=".J_MOTOR_USB > .A6"
        {...logicTrace}
      />
      <trace from=".J_MOTOR_USB > .A7" to=".U_PD > .DM" {...logicTrace} />
      <trace
        from=".J_MOTOR_USB > .B7"
        to=".J_MOTOR_USB > .A7"
        {...logicTrace}
      />

      <trace from=".DRIVER > .VM" to=".C_VM_BULK > .pin1" {...powerTrace} />
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

      <trace from=".DRIVER > .AOUT1" to=".P_MOTOR_A > .pin1" {...motorTrace} />
      <trace from=".DRIVER > .AOUT2" to=".P_MOTOR_A > .pin2" {...motorTrace} />
      <trace from=".DRIVER > .BOUT1" to=".P_MOTOR_B > .pin1" {...motorTrace} />
      <trace from=".DRIVER > .BOUT2" to=".P_MOTOR_B > .pin2" {...motorTrace} />

      <trace from=".DRIVER > .AISEN" to=".R_ISEN_A > .pin1" {...powerTrace} />
      <trace from=".DRIVER > .BISEN" to=".R_ISEN_B > .pin1" {...powerTrace} />
      <trace from=".DRIVER > .VCP" to=".C_VCP > .pin1" {...logicTrace} />
      <trace from=".DRIVER > .VINT" to=".C_VINT > .pin1" {...logicTrace} />
      <trace
        from=".R_SLEEP_PD > .pin1"
        to=".DRIVER > .nSleep"
        {...logicTrace}
      />
      <trace
        from=".R_FAULT_PU > .pin1"
        to=".DRIVER > .nFault"
        {...logicTrace}
      />
      <trace
        from=".R_FAULT_PU > .pin2"
        to=".MCU > .U1 > .IOVDD1"
        {...logicTrace}
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
