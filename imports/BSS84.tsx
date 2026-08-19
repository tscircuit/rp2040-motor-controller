import type { ChipProps } from "@tscircuit/props";

const pinLabels = {
  pin1: ["gate"],
  pin2: ["source"],
  pin3: ["drain"],
} as const;

export const BSS84 = (props: ChipProps<typeof pinLabels>) => (
  <chip
    pinLabels={pinLabels}
    footprint="sot23"
    supplierPartNumbers={{ jlcpcb: ["C85202"] }}
    manufacturerPartNumber="BSS84-7-F"
    {...props}
  />
);
