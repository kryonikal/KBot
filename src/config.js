import path from "path";
import { ensureFile, readJson, writeJson } from "./storage.js";

const FILE = path.resolve("data/config.json");
ensureFile(FILE, {});

export function getConfig() {
  return readJson(FILE);
}

export function setConfig(patch) {
  const cur = getConfig();
  const next = { ...cur, ...patch };
  writeJson(FILE, next);
  return next;
}