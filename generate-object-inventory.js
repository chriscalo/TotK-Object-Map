#!/usr/bin/env node

/**
 * generate-object-inventory.js
 *
 * Builds `data-object-inventory.txt`, a sorted list of all object components
 * from Tears of the Kingdom map data, cleaned and structured by icon path.
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

  const lines = new Set();

  for (const file of sourceFiles) {
    if (!fs.existsSync(file)) continue;

    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const source = file.split("/").at(-1);
    console.log(`→ Reading ${file} [${source}]`);

    const count = extractEntries(data, lines);
    console.log(`  ↳ ${count} valid entries`);
  }

  const sorted = [...lines].sort();
  fs.writeFileSync("data-object-inventory.txt", sorted.join("\n") + "\n");

  console.log("\n✔ Build complete");
  console.log(`• Total unique entries: ${sorted.length}`);
  console.log("→ Wrote data-object-inventory.txt");
}

// --- Classes ---

class ObjectComponent {
  constructor(icon, label) {
    this.icon = icon;
    this.label = label;
  }

  static from(iconRaw, labelRaw) {
    const segments = iconRaw
      .split("_")
      .filter(s => s !== "Icon" && s !== "Tag");

    return new ObjectComponent(segments.join("/"), labelRaw);
  }

  toString() {
    return `${this.icon}/${this.label}`;
  }
}

// --- Extraction logic ---

function extractEntries(layerData, outputSet) {
  let added = 0;

  for (const obj of Object.values(layerData)) {
    if (!isValidRecord(obj)) continue;

    const labels = obj.name.split(" : ");
    const icons = obj.icons;

    if (labels.length !== icons.length) continue;

    for (let i = 0; i < labels.length; i++) {
      const line = ObjectComponent.from(icons[i], labels[i]).toString();
      outputSet.add(line);
      added++;
    }
  }

  return added;
}

// --- Helpers ---

function isValidRecord(obj) {
  return (
    obj &&
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    Array.isArray(obj.icons) &&
    obj.icons.length > 0
  );
}

// --- Entry Point ---

main();
