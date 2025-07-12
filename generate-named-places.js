#!/usr/bin/env node

/**
 * generate-named-places.js
 *
 * Generates `data-named-places.txt` — a flat, sorted list of all named places
 * from Tears of the Kingdom’s map data, with coordinate points.
 *
 * Coordinates are:
 *   - Rounded to get rid of noise
 *   - Flipped from (x,y,z) → (y,x,z) because the x, y values are stored backwards in the source files
 *
 * Skyview Tower launch heights are injected as extra points in the tower’s own place.
 * Source: https://www.reddit.com/r/tearsofthekingdom/comments/154po5t/studied_the_skyview_towers_and_mapped_their/
 */

const fs = require("fs");

function main() {
  const sourceFiles = [
    "data/v1.2.0/layers/sky.json",
    "data/v1.2.0/layers/surface.json",
    "data/v1.2.0/layers/cave.json",
    "data/v1.2.0/layers/depths.json",
  ];

  const places = new Map();
  const output = [];
  const stats = {
    files: 0,
    places: 0,
    points: 0,
    launches: 0,
  };

  for (const filePath of sourceFiles) {
    if (!fs.existsSync(filePath)) continue;

    const layerData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const layerName = getLayerFromPath(filePath);

    console.log(`→ Reading ${filePath} [${layerName}]`);
    processEntries(layerName, layerData, places, stats);

    stats.files++;
    console.log(`  ↳ ${stats.places} total places so far`);
  }

  for (const place of [...places.values()].sort((a, b) => a.path.localeCompare(b.path))) {
    output.push(place.toLine());
  }

  fs.writeFileSync("data-named-places.txt", output.join("\n") + "\n");

  console.log("\n✔ Build complete");
  console.log(`• Files read:       ${stats.files}`);
  console.log(`• Named places:     ${stats.places}`);
  console.log(`• Points:           ${stats.points}`);
  console.log(`• Launch entries:   ${stats.launches}`);
  console.log(`→ Wrote data-named-places.txt (${output.length} lines)`);
}

// --- Classes ---

class Point {
  constructor({ x, y, z }) {
    this.y = Math.round(y);
    this.x = Math.round(x);
    this.z = Math.round(z);
  }

  toString() {
    return `(${this.y},${this.x},${this.z})`;
  }
}

class Place {
  constructor(layer, name) {
    this.layer = layer;
    this.name = name;
    this.points = new Set();
  }

  get path() {
    return `${this.layer}/${this.name}`;
  }

  add(...points) {
    let count = 0;
    for (const point of points) {
      if (![...this.points].some(p => p.toString() === point.toString())) {
        this.points.add(point);
        count++;
      }
    }
    return count;
  }

  toLine() {
    return `${this.path} ${[...this.points].map(p => p.toString()).join(" ")}`;
  }
}

/**
 * Source: https://www.reddit.com/r/tearsofthekingdom/comments/154po5t/studied_the_skyview_towers_and_mapped_their/
 */
const launchHeights = new Map([
  ["Eldin Canyon Skyview Tower", 1366],
  ["Gerudo Canyon Skyview Tower", 1453],
  ["Gerudo Highlands Skyview Tower", 1054],
  ["Hyrule Field Skyview Tower", 754],
  ["Lindor's Brow Skyview Tower", 1053],
  ["Lookout Landing Skyview Tower", 754],
  ["Mount Lanayru Skyview Tower", 1453],
  ["Pikida Stonegrove Skyview Tower", 1054],
  ["Popla Foothills Skyview Tower", 754],
  ["Rospro Pass Skyview Tower", 1053],
  ["Sahasra Slope Skyview Tower", 754],
  ["Thyphlo Ruins Skyview Tower", 754],
  ["Upland Zorana Skyview Tower", 1053],
]);

// --- Core Logic ---

function processEntries(layerName, layerData, places, stats) {
  for (const entry of Object.values(layerData)) {
    if (!isNamedPlace(entry)) continue;

    const name = entry.name.trim();
    const place = getOrCreatePlace(layerName, name, places);

    const points = entry.locations.map(loc => new Point(loc));
    stats.points += place.add(...points);

    checkTower(place, stats);
    stats.places++;
  }
}

function checkTower(place, stats) {
  const isTower =
    place.layer === "Surface" &&
    place.name.includes("Skyview Tower") &&
    launchHeights.has(place.name);

  if (!isTower) return;

  const z = launchHeights.get(place.name);
  const [base] = place.points;
  if (!base) return;

  const launch = new Point({ x: base.x, y: base.y, z });
  if (place.add(launch)) {
    stats.points++;
    stats.launches++;
    console.log(`  + Launch height added to: ${place.name}`);
  }
}

// --- Utilities ---

function getOrCreatePlace(layer, name, places) {
  const path = `${layer}/${name}`;
  if (!places.has(path)) {
    places.set(path, new Place(layer, name));
  }
  return places.get(path);
}

function isNamedPlace(entry) {
  return (
    (entry.type === "LocationArea" || entry.type === "LocationMarker") &&
    typeof entry.name === "string" &&
    entry.name.trim() !== "" &&
    Array.isArray(entry.locations) &&
    entry.locations.length > 0
  );
}

function getLayerFromPath(path) {
  if (path.includes("depths")) return "Depths";
  if (path.includes("sky")) return "Sky";
  if (path.includes("cave")) return "Cave";
  return "Surface";
}

// --- Entry Point ---

main();
