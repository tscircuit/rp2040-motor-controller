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

The reusable solver and its generic step debugger live in
[`@tscircuit/power-trace-expander`](https://github.com/tscircuit/power-trace-expander).
[Open the deployed step-through debugger](https://power-trace-expander.vercel.app).

The DRV8833 support network follows TI's recommendations: 10 uF from VM to
ground, 10 nF from VCP to VM, and 2.2 uF from VINT to ground. The selected
DRV8833PWPR is JLCPCB/LCSC part C50506.

The motor-power port uses CH224K JLCPCB/LCSC part C970725 and USB-C receptacle
C2765186. A 6.8 kohm CFG1 resistor selects the 9 V request. The CH224K VDD and
VBUS-sense pins use 1 kohm and 10 kohm series resistors respectively, with 1 uF
local VDD decoupling and 10 uF on the motor VBUS rail.

## Trace-width reroute phase

After the normal multigraph route, a whole-board `<autoroutingphase reroute />`
runs `@tscircuit/power-trace-expander`. Conforming traces are retained unchanged.
Under-width wire intervals are split into nominal-width-sized pieces and widened
in place when the Flatbush obstacle index proves the required clearance. A
blocked interval tries exponentially farther reconnect points, up to 10 mm of
the original route. The solver can retreat to an earlier safe anchor before
running obstacle-aware high-density grid searches. Candidate widths are tried
from largest to smallest across multiple geometric resolutions, with aligned
and half-cell offset variants. Successful paths and in-place segments are then
probed to the widest safe quantized intermediate width.

When the nominal power corridor is blocked only by one or two lower-width
traces, a bounded local inflation pass first applies a smooth elastic force to
push those traces by the minimum useful amount. It falls back to a grid reroute
between fixed anchors when necessary. Pads and vias remain fixed, and the
displaced interval is capped at 10 mm.

Segments that remain below half nominal width receive a bounded multilayer A*
attempt. The solver tries two grid offsets, moves the route through one or two
vias, and independently probes each terminal neck in 0.025 mm increments. This
keeps unavoidable necking local to a pad escape while carrying nominal-width
copper across the alternate layer. The candidate is accepted only when it
reduces conservative copper deficit and passes the full obstacle and via-drill
checks.

Connection aliases are resolved across source traces, merged names, and PCB
ports, so pads, vias, and traces on the same net are treated as connected copper
rather than clearance obstacles. Diagonal traces and rotated obstacles are
indexed as short AABBs; exact capsule, polygon, and circle checks run only for
the candidates returned by Flatbush. The solver follows
`@tscircuit/solver-utils` conventions and exposes elastic relaxation and active
grid searches as granular debugger steps.

Productive whole-board passes repeat until added copper falls below 0.1% of the
nominal area. On the captured board problem, the 1 mm routes improve from 1.27%
to 86.58% full-width coverage, their length-weighted average rises from 0.232 mm
to 0.939 mm, and 93.40% of their length reaches at least 0.5 mm. The 0.25 mm
routes reach 99.38% full-width coverage. A representative solver run completes
in roughly 7.3 seconds and has explicit wall-time, iteration, and grid-attempt
regression budgets.

The upper `P_MOTOR_A` path is also locked as an isolated full-board-context
regression. It now uses exactly two vias and 10.129 mm of bottom-layer copper,
reaching 99.52% conservative full-width coverage and a 0.998 mm average while
keeping its unavoidable terminal neck at 0.600 mm.

After routing, the board generates top- and bottom-layer pours tied to one
explicit board-level `GND` net. Both use 0.2 mm pad/trace clearance and remain
0.3 mm inside the board edge. The board regression requires B-Rep pour islands
on both layers to share the same ground net and remain covered by solder mask.

The board test independently reruns `@tscircuit/checks` routing validation on
the completed Circuit JSON. It rejects every new issue and allowlists only the
three existing same-net ground-via spacing reports described below.

## Autorouter note

Connecting the board ground to the imported RP2040 subcircuit currently causes
three coincident same-net ground vias at the subcircuit boundary to be reported
by tscircuit's DRC. Whole-board trace replacement changes their generated via
IDs, but their coordinates and clearances are identical to the pre-reroute
baseline. The regression test allowlists only those three stable
`same_net_vias_close` reports and continues to reject every other circuit or PCB
error.
