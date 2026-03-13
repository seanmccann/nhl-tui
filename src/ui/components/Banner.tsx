import { Box, Text } from "ink";
import type { Banner as BannerState } from "../../domain/types.js";

type BannerProps = {
  banner?: BannerState;
};

export function Banner({ banner }: BannerProps) {
  if (!banner) {
    return null;
  }

  return (
    <Box marginBottom={1}>
      <Text backgroundColor="green" color="black" bold>
        {" "}
        {banner.title}
        {banner.subtitle ? `  ${banner.subtitle}` : ""}
        {" "}
      </Text>
    </Box>
  );
}
