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
bun run solver:debug
```

`solver:debug` opens the generic solver debugger on a compact trace-width
fixture. Each trace scan, segment expansion decision, grid candidate, and
obstacle-aware search step can be advanced individually. Use
`bun run solver:debug:build` to verify the debugger's static build.

The DRV8833 support network follows TI's recommendations: 10 uF from VM to
ground, 10 nF from VCP to VM, and 2.2 uF from VINT to ground. The selected
DRV8833PWPR is JLCPCB/LCSC part C50506.

The motor-power port uses CH224K JLCPCB/LCSC part C970725 and USB-C receptacle
C2765186. A 6.8 kohm CFG1 resistor selects the 9 V request. The CH224K VDD and
VBUS-sense pins use 1 kohm and 10 kohm series resistors respectively, with 1 uF
local VDD decoupling and 10 uF on the motor VBUS rail.

## Trace-width reroute phase

After the normal multigraph route, a whole-board `<autoroutingphase reroute />`
runs the local trace-width fixer. Conforming traces are retained unchanged.
Under-width wire intervals are split into nominal-width-sized pieces and widened
in place when the Flatbush obstacle index proves the required clearance. A
blocked interval tries exponentially farther reconnect points, up to 10 mm,
using obstacle-aware high-density grid searches. Grid widths are tried from
largest to smallest, with aligned and half-cell offset variants, so the widest
successful replacement is selected first.

Diagonal traces and rotated obstacles are indexed as short conservative AABBs;
the exact segment/AABB test runs only for candidates returned by Flatbush. The
solver follows `@tscircuit/solver-utils` conventions and exposes its active grid
search as `activeSubSolver` for debugger breadcrumbs.

## Autorouter note

Connecting the board ground to the imported RP2040 subcircuit currently causes
three coincident same-net ground vias at the subcircuit boundary to be reported
by tscircuit's DRC. Whole-board trace replacement changes their generated via
IDs, but their coordinates and clearances are identical to the pre-reroute
baseline. The regression test allowlists only those three stable
`same_net_vias_close` reports and continues to reject every other circuit or PCB
error.
