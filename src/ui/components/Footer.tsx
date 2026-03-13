import { Text } from "ink";

type FooterProps = {
  mode: "scoreboard" | "game";
};

export function Footer({ mode }: FooterProps) {
  const text =
    mode === "game"
      ? "<-/-> tabs  esc back  r refresh  q quit"
      : "<-/-> day  ^/v move  enter open  r refresh  esc/q quit";

  return <Text dimColor>{text}</Text>;
}
