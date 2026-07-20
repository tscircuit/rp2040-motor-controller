import type { ChipProps } from "@tscircuit/props";

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
} as const;

export const WJ500V_5_08_2P = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C8465"],
      }}
      manufacturerPartNumber="WJ500V_5_08_2P"
      footprint="hc49_p5.08mm_od2mm"
      cadModel={{
        objUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C8465.obj?uuid=d60ef5d423934d3393dc75fa0a07b6bd",
        stepUrl:
          "https://modelcdn.tscircuit.com/easyeda_models/assets/C8465.step?uuid=d60ef5d423934d3393dc75fa0a07b6bd",
        pcbRotationOffset: 0,
        modelOriginPosition: {
          x: -2.5399878999999967,
          y: 0,
          z: -0.000006999999999646178,
        },
      }}
      {...props}
    />
  );
};
