#!/usr/bin/env node
import { render } from "ink";
import { NhlApi } from "./api/nhl.js";
import { VERSION } from "./meta.js";
import { App } from "./ui/App.js";

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      `nhl-tui ${VERSION} — live NHL scores, standings, and stats in your terminal`,
      "",
      "Usage: nhl-tui [options]",
      "",
      "Options:",
      "  -v, --version   Print the version and exit",
      "  -h, --help      Show this help and exit",
      "",
      "Keys (scoreboard):",
      "  ←/→ change day   ↑/↓ select   enter open game",
      "  s standings   l leaders   r refresh   esc/q quit",
    ].join("\n"),
  );
  process.exit(0);
}

if (typeof performance.measure === "function") {
  const originalMeasure = performance.measure.bind(performance);
  performance.measure = ((...args: Parameters<typeof performance.measure>) => {
    const entry = originalMeasure(...args);
    performance.clearMeasures();
    return entry;
  }) as typeof performance.measure;
}

const instance = render(<App client={new NhlApi()} />);

// Restore the terminal on any exit path. Ink already handles Ctrl-C, but a
// SIGTERM (or a crash) would otherwise leave the terminal in raw mode with a
// hidden cursor. Unmounting flushes Ink's cleanup before we exit.
const shutdown = () => {
  instance.unmount();
};

process.once("SIGTERM", shutdown);

process.on("uncaughtException", (error) => {
  instance.unmount();
  console.error(error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  instance.unmount();
  console.error(reason);
  process.exit(1);
});

instance
  .waitUntilExit()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
