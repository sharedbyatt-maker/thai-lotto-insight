import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

test("analytics ranks all 100 numbers without future data", async () => {
  const { analyzeNumbers } = await vite.ssrLoadModule("/lib/analytics.ts");
  const draws = Array.from({ length: 40 }, (_, i) => ({
    drawDate: "2025-" + String(Math.floor(i / 28) + 1).padStart(2, "0") + "-" + String((i % 28) + 1).padStart(2, "0"),
    last2: String((i * 7) % 100).padStart(2, "0"),
  }));
  const ranked = analyzeNumbers(draws);
  assert.equal(ranked.length, 100);
  assert.equal(new Set(ranked.map(x => x.number)).size, 100);
  assert.deepEqual(ranked.map(x => x.rank), Array.from({length:100},(_,i)=>i+1));
});

test("walk-forward backtest uses only prior draws", async () => {
  const { walkForwardBacktest } = await vite.ssrLoadModule("/lib/analytics.ts");
  const draws = Array.from({ length: 45 }, (_, i) => ({
    drawDate: "2025-" + String(Math.floor(i / 28) + 1).padStart(2, "0") + "-" + String((i % 28) + 1).padStart(2, "0"),
    last2: String(i % 100).padStart(2, "0"),
  }));
  const result = walkForwardBacktest(draws, 30);
  assert.equal(result.sampleSize, 15);
  assert.equal(result.rows[0].drawDate, draws[30].drawDate);
  assert.deepEqual(result.baselines, {top1:1,top3:3,top5:5,top10:10});
});
