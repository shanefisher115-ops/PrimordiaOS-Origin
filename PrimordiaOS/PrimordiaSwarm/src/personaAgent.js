"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyPersona = classifyPersona;
const personaLib_1 = require("./personaLib");
const SCORING_RULES = [
    // --- Persona 1: Laser/Plasma Job Shop - Head Crash & Tip-Up Slugs ---
    {
        personaId: "P1",
        category: "Machines",
        terms: ["laser", "fiber laser", "co2 laser", "plasma", "slat", "trumpf", "bystronic", "amada", "mitsubishi laser", "mazak optiplex"],
        points: 35,
        reason: "Operates high-power laser/plasma cutting systems susceptible to slat-bed collision"
    },
    {
        personaId: "P1",
        category: "Materials",
        terms: ["mild steel", "carbon steel", "galvanized", "cold roll", "sheet metal", "hot rolled", "thin gauge"],
        points: 15,
        reason: "High-volume sheet metal fabrication with dense small-part nesting profiles"
    },
    {
        personaId: "P1",
        category: "Role",
        terms: ["laser programmer", "laser operator", "nesting", "sheet metal", "sheetmetal", "fab lead"],
        points: 20,
        reason: "Direct responsibility for rapid-motion CAM toolpaths and slat-bed nesting safety"
    },
    {
        personaId: "P1",
        category: "Pain Signal",
        terms: ["head crash", "collision", "slug", "tip-up", "tip up", "micro-tab", "microtab", "slat bed", "nozzle"],
        points: 40,
        reason: "Explicit pain trigger around slug tip-ups destroying optical laser heads"
    },
    // --- Persona 2: High-Alloy Aerospace/Medical Fab - Yield & Thermal Control ---
    {
        personaId: "P2",
        category: "Materials",
        terms: ["ti-6al-4v", "titanium", "inconel", "316l", "hastelloy", "monel", "nitronic", "17-4ph", "aerospace alloy", "high alloy", "superalloy"],
        points: 45,
        reason: "Processes expensive superalloys ($400-$1500/sheet) where scrap cost is critical"
    },
    {
        personaId: "P2",
        category: "Company",
        terms: ["aero", "aerospace", "medical", "space", "implant", "defense", "turbine", "alloy", "flight", "structures"],
        points: 35,
        reason: "Aerospace / Medical fabrication standard with strict thermal HAZ and yield requirements"
    },
    {
        personaId: "P2",
        category: "Pain Signal",
        terms: ["thermal", "warping", "haz", "heat affected", "scrap", "yield", "expensive material", "alloy scrap"],
        points: 40,
        reason: "Explicit vulnerability to thermal distortion, residual stress, and costly sheet waste"
    },
    {
        personaId: "P2",
        category: "Role",
        terms: ["materials engineer", "manufacturing engineer", "metallurgist", "quality director", "aerospace engineer"],
        points: 20,
        reason: "Focus on metallurgical integrity, geometric tolerances, and material yield metrics"
    },
    // --- Persona 3: Multi-Process CNC + Weld - Unified Stack & AI Copilots ---
    {
        personaId: "P3",
        category: "Machines",
        terms: ["cnc", "mill", "lathe", "5-axis", "multi-axis", "weld", "welder", "robotic weld", "press brake", "integrex", "hermle", "haas", "dmg mori"],
        points: 30,
        reason: "Multi-process facility operating combined subtractive machining and robotic fabrication"
    },
    {
        personaId: "P3",
        category: "Company",
        terms: ["cnc", "weld", "multi-fab", "dynamics", "precision", "contract manufacturing", "machining", "tool & die"],
        points: 25,
        reason: "Contract shop handling diverse customer geometry requiring cross-process CAM suites"
    },
    {
        personaId: "P3",
        category: "Role",
        terms: ["production engineer", "director of operations", "cam programmer", "machinist", "operations director", "shop owner"],
        points: 20,
        reason: "Managing shop-floor knowledge gaps, fragmented tool stacks, and junior operator onboarding"
    },
    {
        personaId: "P3",
        category: "Pain Signal",
        terms: ["silos", "post-processor", "retiring", "knowledge gap", "tribal knowledge", "disconnected", "software", "multi-tool"],
        points: 40,
        reason: "Explicit friction with CAD/CAM software silos and machinist skillset transition"
    }
];
function classifyPersona(prospect, customPersonas) {
    const personas = customPersonas || (0, personaLib_1.loadPersonas)();
    const textCorpus = {
        company: (prospect.company || "").toLowerCase(),
        role: (prospect.role || "").toLowerCase(),
        machines: (prospect.machines || []).join(" ").toLowerCase(),
        materials: (prospect.materials || []).join(" ").toLowerCase(),
        painTrigger: (prospect.painTrigger || "").toLowerCase()
    };
    const combinedText = `${textCorpus.company} | ${textCorpus.role} | ${textCorpus.machines} | ${textCorpus.materials} | ${textCorpus.painTrigger}`;
    const scores = { P1: 0, P2: 0, P3: 0 };
    const drivers = { P1: [], P2: [], P3: [] };
    for (const rule of SCORING_RULES) {
        for (const term of rule.terms) {
            let matched = false;
            if (rule.category === "Machines" && textCorpus.machines.includes(term))
                matched = true;
            else if (rule.category === "Materials" && textCorpus.materials.includes(term))
                matched = true;
            else if (rule.category === "Company" && textCorpus.company.includes(term))
                matched = true;
            else if (rule.category === "Role" && textCorpus.role.includes(term))
                matched = true;
            else if (rule.category === "Pain Signal" && textCorpus.painTrigger.includes(term))
                matched = true;
            else if (combinedText.includes(term))
                matched = true;
            if (matched) {
                scores[rule.personaId] = (scores[rule.personaId] || 0) + rule.points;
                drivers[rule.personaId].push({
                    matchedCategory: rule.category,
                    matchedTerm: term,
                    points: rule.points,
                    reason: rule.reason
                });
                break; // Count once per rule to avoid over-weighting repeated synonyms
            }
        }
    }
    // Find winning persona
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topId, topScore] = sorted[0];
    const runnerUpScore = sorted[1] ? sorted[1][1] : 0;
    // Calculate normalized confidence score
    let confidence = 0.5;
    if (topScore > 0) {
        const margin = topScore - runnerUpScore;
        confidence = Math.min(0.98, Math.max(0.65, Number((0.60 + (margin / (topScore + 10)) * 0.38).toFixed(2))));
    }
    // Generate clear rationale
    const winningDrivers = drivers[topId] || [];
    let rationale = `Assigned to ${topId} based on strong affinity.`;
    if (winningDrivers.length > 0) {
        const topReasons = winningDrivers.map(d => `${d.matchedCategory} ("${d.matchedTerm}")`).slice(0, 3).join(", ");
        rationale = `Identified key drivers in ${topReasons} with ${topScore} weighted match points.`;
    }
    const persona = personas.find(p => p.id === topId) ?? personas[0];
    return {
        persona,
        result: {
            personaId: persona.id,
            confidence,
            rationale,
            scoreBreakdown: scores,
            keyDrivers: winningDrivers
        }
    };
}
