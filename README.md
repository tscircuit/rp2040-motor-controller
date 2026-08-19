# RP2040 Motor Controller

A tscircuit board combining the reusable `Microcontroller_RP2040` from
`@tscircuit/common` with a TI DRV8833 dual H-bridge.

## Features

- RP2040, USB-C, flash, crystal, 3.3 V regulation, boot/run controls, and SWD
  test points from `@tscircuit/common`
- two brushed-DC motor channels controlled by GPIO0-GPIO3
- DRV8833 sleep control on GPIO4 and active-low fault feedback on GPIO5
- dedicated USB-C motor-power input with a CH224K PD sink requesting 9 V
- 1 A current regulation per bridge using 0.2 ohm sense resistors
- solder-mask-covered GND copper pours on the top and bottom layers
- screw terminals for both motor outputs
- four 3.2 mm mounting holes

The RP2040 control circuitry and motor driver have separate USB-C ports. The
motor port negotiates a 9 V USB PD contract when the source supports it; its
VBUS drives the DRV8833 motor rail. The grounds are shared. The 9 V request was
selected to stay below the DRV8833's 10.8 V maximum supply rating.

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

The motor-power port uses CH224K JLCPCB/LCSC part C970725 and USB-C receptacle
C2765186. A 6.8 kohm CFG1 resistor selects the 9 V request. The CH224K VDD and
VBUS-sense pins use 1 kohm and 10 kohm series resistors respectively, with 1 uF
local VDD decoupling and 10 uF on the motor VBUS rail.

## Power-trace routing

The board uses capacity autorouter Pipeline 7. Power-trace expansion is part of
that pipeline, so the circuit does not import or run a separate post-routing
solver. Connections whose requested width is materially larger than the board's
ordinary routing width are expanded automatically after the multigraph route.

After routing, the board generates top- and bottom-layer pours tied to one
explicit board-level `GND` net. Both use 0.2 mm pad/trace clearance and remain
0.3 mm inside the board edge. The board regression requires B-Rep pour islands
on both layers to share the same ground net and remain covered by solder mask.

The board test independently reruns `@tscircuit/checks` routing validation on
the completed Circuit JSON and requires zero routing or circuit errors. It also
uses shape-aware pad geometry to reject any routed via inside an SMT pad.

The pad-clearance target is intentionally best-effort: dense package escapes
may keep the board's legal 0.1 mm minimum when half-width spacing cannot fit.
The regression separately budgets the remaining 0.15 mm preferred-clearance
misses while still requiring the hard DRC suite to be completely clean.
