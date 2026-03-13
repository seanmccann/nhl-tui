#!/usr/bin/env node
import { render } from "ink";
import { NhlApi } from "./api/nhl.js";
import { App } from "./ui/App.js";

if (typeof performance.measure === "function") {
  const originalMeasure = performance.measure.bind(performance);
  performance.measure = ((...args: Parameters<typeof performance.measure>) => {
    const entry = originalMeasure(...args);
    performance.clearMeasures();
    return entry;
  }) as typeof performance.measure;
}

render(<App client={new NhlApi()} />);
