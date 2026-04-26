#!/usr/bin/env node
// SSOT JSON (`docs/references/hwpx-placeholders.json`) 유효성 + 47 섹션 cross-check.
// PR #3 DoD #5 자동화: 매핑 표 누락 0건.
//
// 사용:
//   node scripts/verify-mapping-completeness.mjs
//
// exit 0 = 누락 0건, exit 1 = 검출

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const jsonPath = resolve(ROOT, "docs/references/hwpx-placeholders.json");
const data = JSON.parse(readFileSync(jsonPath, "utf-8"));

let errors = 0;

function check(condition, msg) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    errors += 1;
  }
}

function isMeaningfulId(id) {
  return id && /^[RP]-\d{2,3}$/.test(id);
}

const ids = new Set();
const placeholders = new Set();

for (const track of ["roadmap", "pbl"]) {
  const entries = data[track] || [];
  console.error(`[${track}] ${entries.length} entries`);

  for (const e of entries) {
    check(typeof e.id === "string" && e.id.length > 0, `${track}: entry without id`);
    check(!ids.has(e.id), `${track}: duplicate id ${e.id}`);
    ids.add(e.id);

    check(typeof e.section === "string", `${track}/${e.id}: missing section`);
    check(typeof e.strategy === "string", `${track}/${e.id}: missing strategy`);

    if (e.strategy !== "static") {
      check(
        e.placeholders || e.placeholder_template,
        `${track}/${e.id}: non-static strategy must have placeholders or placeholder_template`,
      );
      check(typeof e.py_key === "string", `${track}/${e.id}: non-static must have py_key`);
      check(typeof e.ts_key === "string", `${track}/${e.id}: non-static must have ts_key`);
    }

    if (Array.isArray(e.placeholders)) {
      for (const p of e.placeholders) {
        check(/^\{\{[a-z][a-z0-9_]+\}\}$/.test(p), `${track}/${e.id}: invalid placeholder ${p}`);
        check(!placeholders.has(p), `${track}/${e.id}: duplicate placeholder ${p}`);
        placeholders.add(p);
      }
    }
  }
}

// 47 섹션 cross-check (inventory 라벨 합 — R-01..R-23 + 보조 + P-01..P-29)
// §6 표는 R-01..R-23 (23) + P-01..P-29 (29) = 52 라벨, 보조 -static entries 추가
const meaningfulRoadmap = (data.roadmap || []).filter((e) => isMeaningfulId(e.id));
const meaningfulPbl = (data.pbl || []).filter((e) => isMeaningfulId(e.id));
const totalMeaningful = meaningfulRoadmap.length + meaningfulPbl.length;

console.error(
  `[cross-check] roadmap meaningful=${meaningfulRoadmap.length}, pbl meaningful=${meaningfulPbl.length}, total=${totalMeaningful}`,
);
check(meaningfulRoadmap.length >= 23, `roadmap meaningful entries < 23 (got ${meaningfulRoadmap.length})`);
check(meaningfulPbl.length >= 29, `pbl meaningful entries < 29 (got ${meaningfulPbl.length})`);

// strategy taxonomy 등록된 값만 사용
const allowedStrategies = new Set([
  ...Object.keys(data.strategy_taxonomy || {}),
  // 결합 전략 (예: "single + pdf_attach", "checkbox_toggle + single")
]);

for (const track of ["roadmap", "pbl"]) {
  for (const e of data[track] || []) {
    const parts = e.strategy.split(/\s*\+\s*/);
    for (const p of parts) {
      check(
        allowedStrategies.has(p),
        `${track}/${e.id}: unknown strategy '${p}' (taxonomy: ${[...allowedStrategies].join(", ")})`,
      );
    }
  }
}

console.error(`\n[summary] placeholders unique: ${placeholders.size}`);

if (errors > 0) {
  console.error(`\nFAIL: ${errors} validation errors`);
  process.exit(1);
}

console.error("\nPASS: SSOT JSON 누락 0건 + 유효성 검증 통과");
process.exit(0);
