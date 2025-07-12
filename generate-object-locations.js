#!/usr/bin/env node

/**
 * generate-object-locations.js
 *
 * Builds `data-object-locations.txt`, a space-delimited mapping of object components
 * to world coordinates, from Tears of the Kingdom map data.
 *
 * Source: https://github.com/vetyst/TotK-Object-Map
 */

const fs = require("fs");

// --- Main ---

function main() {
  const sourceFiles = [
    "data/v1.2.0/layers/sky.json",
    "data/v1.2.0/layers/surface.json",
    "data/v1.2.0/layers/cave.json",
    "data/v1.2.0/layers/depths.json"
  ];

  const objects = new Map();

  for (const file of sourceFiles) {
    if (!fs.existsSync(file)) continue;

    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const source = file.split("/").at(-1);
    console.log(`→ Reading ${file} [${source}]`);

    const count = extractEntries(data, objects);
    console.log(`  ↳ ${count} entries`);
  }

  const lines = [...objects.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, points]) => `${name} ${[...points].join(" ")}`);

  fs.writeFileSync("data-object-locations.txt", lines.join("\n") + "\n");

  console.log("\n✔ Build complete");
  console.log(`• Total unique object names: ${objects.size}`);
  console.log("→ Wrote data-object-locations.txt");
}

// --- Extraction ---

function extractEntries(layerData, objectMap) {
  let added = 0;

  for (const obj of Object.values(layerData)) {
    if (!isValidRecord(obj)) continue;

    const labels = obj.name.split(" : ");
    const coords = obj.locations.map(loc => formatPoint(loc));

    for (const label of labels) {
      const set = objectMap.get(label) || new Set();
      for (const pt of coords) set.add(pt);
      objectMap.set(label, set);
      added++;
    }
  }

  return added;
}

// --- Helpers ---

function formatPoint({ x, y, z }) {
  return `(${Math.round(y)},${Math.round(x)},${Math.round(z)})`;
}

function isValidRecord(obj) {
  return (
    obj &&
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    Array.isArray(obj.locations) &&
    obj.locations.length > 0
  );
}

// --- Entry Point ---

main();
