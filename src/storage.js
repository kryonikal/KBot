import fs from "fs";
import path from "path";

export function ensureFile(filePath, defaultJson = {}) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultJson, null, 2));
}

export function readJson(filePath) {
  ensureFile(filePath, {});
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, obj) {
  ensureFile(filePath, {});
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}