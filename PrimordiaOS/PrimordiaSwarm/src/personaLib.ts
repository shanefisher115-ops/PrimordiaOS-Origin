import fs from "fs";
import path from "path";
import { Persona, Prospect } from "./types";

export function loadPersonas(customPath?: string): Persona[] {
  const p = customPath || path.join(__dirname, "..", "config", "personas.json");
  const raw = fs.readFileSync(p, "utf8");
  const json = JSON.parse(raw);
  return json.personas as Persona[];
}

export function loadProspects(customPath?: string): Prospect[] {
  const p = customPath || path.join(__dirname, "..", "config", "prospects.json");
  if (!fs.existsSync(p)) {
    return [];
  }
  const raw = fs.readFileSync(p, "utf8");
  const json = JSON.parse(raw);
  return json as Prospect[];
}

export function saveProspects(prospects: Prospect[], customPath?: string): string {
  const p = customPath || path.join(__dirname, "..", "config", "prospects.json");
  fs.writeFileSync(p, JSON.stringify(prospects, null, 2), "utf8");
  return p;
}

export function addProspect(prospect: Prospect, customPath?: string): Prospect[] {
  const existing = loadProspects(customPath);
  existing.push(prospect);
  saveProspects(existing, customPath);
  return existing;
}
