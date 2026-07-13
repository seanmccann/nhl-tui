import { Box, Text } from "ink";
import type { Banner as BannerState, BannerKind } from "../../domain/types.js";

const BACKGROUND_BY_KIND: Record<BannerKind, string> = {
  goal: "green",
  "game-start": "blue",
  period: "cyan",
  "game-end": "magenta",
};

type BannerProps = {
  banner?: BannerState;
};

export function Banner({ banner }: BannerProps) {
  if (!banner) {
    return null;
  }

  return (
    <Box marginBottom={1}>
      <Text backgroundColor={BACKGROUND_BY_KIND[banner.kind]} color="black" bold>
        {" "}
        {banner.title}
        {banner.subtitle ? `  ${banner.subtitle}` : ""}
        {" "}
      </Text>
    </Box>
  );
}
