export interface Problem {
  id: string;
  summary: string;
}

export interface Feature {
  id: string;
  summary: string;
}

export interface Persona {
  id: string;
  label: string;
  problems: Problem[];
  features: Feature[];
}

export interface Prospect {
  firstName?: string;
  lastName?: string;
  email?: string;
  company: string;
  role: string;
  machines: string[];
  materials: string[];
  region: string;
  companySize?: number;
  painTrigger?: string;
}

export interface ScoreDetail {
  matchedCategory: string;
  matchedTerm: string;
  points: number;
  reason: string;
}

export interface PersonaResult {
  personaId: string;
  confidence: number;
  rationale: string;
  scoreBreakdown: Record<string, number>;
  keyDrivers: ScoreDetail[];
}

export interface Email {
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
}

export interface TouchPoint {
  step: number;
  dayOffset: number;
  touchName: string;
  channel: "Email" | "LinkedIn" | "Phone";
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  callToAction: string;
}

export interface CampaignPackage {
  prospect: Prospect;
  persona: Persona;
  classification: PersonaResult;
  fromEmail: string;
  fromName: string;
  roiCalculation: string;
  touches: TouchPoint[];
  generatedAt: string;
}
