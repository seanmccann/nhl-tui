import { Text } from "ink";
import type { AppScreen } from "../../domain/types.js";

type FooterProps = {
  mode: AppScreen["type"];
};

export function Footer({ mode }: FooterProps) {
  const text =
    mode === "game"
      ? "<-/-> tabs  esc back  r refresh  q quit"
      : mode === "standings" || mode === "leaders"
        ? "esc back  q quit"
        : "<-/-> day  ^/v move  enter open  s standings  l leaders  r refresh  esc/q quit";

  return <Text dimColor>{text}</Text>;
}
