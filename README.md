# RP2040 Motor Controller

A tscircuit board combining the reusable `Microcontroller_RP2040` from
`@tscircuit/common` with a TI DRV8833 dual H-bridge.

## Features

- RP2040, USB-C, flash, crystal, 3.3 V regulation, boot/run controls, and SWD
  test points from `@tscircuit/common`
- two brushed-DC motor channels controlled by GPIO0-GPIO3
- DRV8833 sleep control on GPIO4 and active-low fault feedback on GPIO5
- separate 2.7 V to 10.8 V motor-power input
- 1 A current regulation per bridge using 0.2 ohm sense resistors
- screw terminals for motor power and both motor outputs
- four 3.2 mm mounting holes

USB powers the RP2040 control circuitry. Motor power must be supplied separately
through `P_MOTOR_POWER`; the grounds are shared.

## Development

```sh
bun install
bun run typecheck
bun test
bun run build
bun run snapshot:update
```

The DRV8833 support network follows TI's recommendations: 10 uF from VM to
ground, 10 nF from VCP to VM, and 2.2 uF from VINT to ground. The selected
DRV8833PWPR is JLCPCB/LCSC part C50506.

## Autorouter note

Connecting the board ground to the imported RP2040 subcircuit currently causes
three coincident same-net ground vias at the subcircuit boundary to be reported
by tscircuit's DRC. The regression test allowlists only those three stable
`same_net_vias_close` reports and continues to reject every other circuit or PCB
error.
