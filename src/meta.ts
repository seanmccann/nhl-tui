import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readPackageVersion(): string {
  try {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), "utf8")) as {
      version?: unknown;
    };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** The package version, read once at startup. Used for --version and the API user-agent. */
export const VERSION = readPackageVersion();
