import * as cheerio from "cheerio";
import { Prospect, CampaignPackage } from "./types";
import { loadPersonas, addProspect } from "./personaLib";
import { classifyPersona } from "./personaAgent";
import { composeCampaign } from "./messageComposerAgent";

export interface EnrichedScrapeResult {
  prospect: Prospect;
  discoveredData: {
    sourceUrl: string;
    pagesCrawled: string[];
    companyName: string;
    detectedMachines: string[];
    detectedMaterials: string[];
    certifications: string[];
    emailsFound: string[];
    detectedRegion: string;
    detectedIndustry: string;
    inferredPainPoint: string;
  };
  campaign: CampaignPackage;
}

const MACHINE_DICTIONARY: { name: string; pattern: RegExp }[] = [
  { name: "Trumpf Fiber Laser", pattern: /\b(trumpf\s+(?:trulaser|fiber|co2|\d{4})|trulaser\s+\d{4})\b/i },
  { name: "Bystronic Fiber Laser", pattern: /\b(bystronic\s+(?:bystar|bysmart|fiber|\d+kw)?|bystar\s+fiber)\b/i },
  { name: "Amada Fiber Laser", pattern: /\b(amada\s+(?:ensis|ventis|regius|fiber|\d+kw)?|ensis\s+\d+kw)\b/i },
  { name: "Mazak Optiplex Laser", pattern: /\b(mazak\s+optiplex|optiplex\s+(?:3015|fiber|\d+kw))\b/i },
  { name: "Mazak Integrex 5-Axis", pattern: /\b(mazak\s+integrex|integrex\s+[ie]-\d+)\b/i },
  { name: "Haas 5-Axis / VMC", pattern: /\b(haas\s+(?:umc[-\s]?750|vf[-\s]?\d+|st[-\s]?\d+|vmc))\b/i },
  { name: "DMG Mori 5-Axis", pattern: /\b(dmg\s+mori|dmu\s+\d+|nlx\s+\d+)\b/i },
  { name: "Hermle 5-Axis Machining Center", pattern: /\b(hermle\s+[c]\d+|hermle\s+5-axis)\b/i },
  { name: "Matsuura 5-Axis Multi-Pallet", pattern: /\b(matsuura\s+(?:mam\d+|mx\d+|5-axis))\b/i },
  { name: "Makino Precision CNC", pattern: /\b(makino\s+(?:a\d+|d\d+|ps\d+|ednc))\b/i },
  { name: "Robotic Welding Cell", pattern: /\b(robotic\s+weld(?:ing|er)|otc\s+daihen|lincoln\s+robotic|fanuc\s+weld|motoman\s+weld)\b/i },
  { name: "CNC Press Brake", pattern: /\b(press\s+brake|cincinnati\s+(?:proform|maxform)|amada\s+hds|bystronic\s+xpert)\b/i },
  { name: "High-Power Fiber Laser (10kW-20kW)", pattern: /\b(1[025]kw\s+fiber|high\s+power\s+fiber\s+laser|fiber\s+laser\s+cutting)\b/i },
  { name: "Slat Bed Laser Cutting Cell", pattern: /\b(slat\s+bed|shuttle\s+table|dual\s+pallet\s+laser)\b/i },
  { name: "Waterjet Cutting System", pattern: /\b(omax|flow\s+waterjet|waterjet\s+cutting)\b/i },
  { name: "Wire EDM System", pattern: /\b(wire\s+edm|mitsubishi\s+edm|sodick)\b/i }
];

const MATERIAL_DICTIONARY: { name: string; pattern: RegExp }[] = [
  { name: "Ti-6Al-4V Grade 5 Titanium", pattern: /\b(ti-6al-4v|titanium\s+grade\s+[25]|titanium\s+alloy)\b/i },
  { name: "Inconel 718 / 625", pattern: /\b(inconel\s+(?:718|625|x-750)?|nickel\s+alloy)\b/i },
  { name: "316L Medical-Grade Stainless", pattern: /\b(316l|surgical\s+stainless|medical\s+stainless)\b/i },
  { name: "304 Stainless Steel", pattern: /\b(304\s+stainless|304l|stainless\s+steel\s+sheet)\b/i },
  { name: "Hastelloy X / C-276", pattern: /\b(hastelloy\s+(?:x|c-276|c22)?)\b/i },
  { name: "17-4 PH Stainless Steel", pattern: /\b(17-4\s*ph|15-5\s*ph|precipitation\s+hardening)\b/i },
  { name: "4140 / 4340 Chromoly Steel", pattern: /\b(4140|4340|chromoly|alloy\s+steel)\b/i },
  { name: "1018 Cold Rolled Steel", pattern: /\b(1018|cold\s+roll(?:ed)?|carbon\s+steel\s+sheet)\b/i },
  { name: "A36 Structural Steel", pattern: /\b(a36|structural\s+steel|hot\s+rolled\s+plate)\b/i },
  { name: "Aluminum 6061-T6 / 7075-T6", pattern: /\b(6061-t6|7075-t6|5052|aluminum\s+sheet)\b/i },
  { name: "Nitronic 50 / 60", pattern: /\b(nitronic\s+(?:50|60))\b/i },
  { name: "Monel 400 / K-500", pattern: /\b(monel\s+(?:400|k-500)?)\b/i }
];

const CERTIFICATION_PATTERNS = [
  { name: "AS9100D (Aerospace)", pattern: /\b(as9100[d]?|as\s*9100)\b/i },
  { name: "ISO 13485 (Medical Devices)", pattern: /\b(iso\s*13485)\b/i },
  { name: "ISO 9001:2015", pattern: /\b(iso\s*9001(?::2015)?)\b/i },
  { name: "ITAR Registered (Defense)", pattern: /\b(itar\s*(?:registered|compliant)?)\b/i },
  { name: "NADCAP Certified", pattern: /\b(nadcap)\b/i }
];

async function fetchPageText(url: string, timeoutMs: number = 6000): Promise<{ text: string; html: string; title: string }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PrimordiaSwarm/1.0"
      }
    });

    clearTimeout(id);
    if (!res.ok) {
      return { text: "", html: "", title: "" };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove script, style, svg tags
    $("script, style, noscript, svg, iframe").remove();

    const title = $("title").text().trim();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    return { text, html, title };
  } catch (e) {
    clearTimeout(id);
    return { text: "", html: "", title: "" };
  }
}

export async function scrapeAndEnrichShop(
  targetUrl: string,
  manualOverrides?: Partial<Prospect>,
  saveToDatabase: boolean = true
): Promise<EnrichedScrapeResult> {
  let normalizedUrl = targetUrl.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  const baseOrigin = new URL(normalizedUrl).origin;
  const pagesToCrawl = [
    normalizedUrl,
    `${baseOrigin}/equipment`,
    `${baseOrigin}/equipment-list`,
    `${baseOrigin}/capabilities`,
    `${baseOrigin}/services`,
    `${baseOrigin}/materials`,
    `${baseOrigin}/about`,
    `${baseOrigin}/about-us`
  ];

  const crawledPages: string[] = [];
  let combinedCorpus = "";
  let siteTitle = "";

  for (const pageUrl of pagesToCrawl) {
    try {
      const page = await fetchPageText(pageUrl);
      if (page.text.length > 80) {
        crawledPages.push(pageUrl);
        combinedCorpus += " " + page.text;
        if (!siteTitle && page.title) {
          siteTitle = page.title;
        }
      }
    } catch (e) {
      // Continue to next page candidate
    }

    // Limit to 4 successfully crawled pages to keep scraping ultra-fast
    if (crawledPages.length >= 4) break;
  }

  // --- Entity Extraction ---

  // 1. Detect Machines
  const detectedMachines: string[] = [];
  for (const item of MACHINE_DICTIONARY) {
    if (item.pattern.test(combinedCorpus)) {
      detectedMachines.push(item.name);
    }
  }

  // 2. Detect Materials
  const detectedMaterials: string[] = [];
  for (const item of MATERIAL_DICTIONARY) {
    if (item.pattern.test(combinedCorpus)) {
      detectedMaterials.push(item.name);
    }
  }

  // 3. Detect Certifications
  const certifications: string[] = [];
  for (const item of CERTIFICATION_PATTERNS) {
    if (item.pattern.test(combinedCorpus)) {
      certifications.push(item.name);
    }
  }

  // 4. Extract Emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailsFound = Array.from(new Set(combinedCorpus.match(emailRegex) || []))
    .filter(e => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("wixpress") && !e.includes("sentry"));

  // 5. Detect Company Name
  let companyName = manualOverrides?.company || "";
  if (!companyName) {
    if (siteTitle) {
      // Clean up common title suffixes e.g. "Titan Precision | Precision CNC Machining & Sheet Metal"
      const parts = siteTitle.split(/[-–|•:]/);
      companyName = parts[0].trim();
      if (companyName.length < 3 || companyName.toLowerCase().includes("home")) {
        companyName = parts[1] ? parts[1].trim() : new URL(normalizedUrl).hostname.replace(/^www\./, "");
      }
    } else {
      companyName = new URL(normalizedUrl).hostname.replace(/^www\./, "").split(".")[0];
      companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
    }
  }

  // 6. Infer Industry & Pain Point
  let detectedIndustry = "General Precision Fabrication & Machining";
  let inferredPain = "CAM programming cycle times and scrap minimization";

  if (certifications.some(c => c.includes("AS9100") || c.includes("ITAR")) || detectedMaterials.some(m => m.includes("Titanium") || m.includes("Inconel"))) {
    detectedIndustry = "Aerospace & Defense High-Precision Fab";
    inferredPain = "Yield loss on high-cost superalloy sheets and thermal distortion warping on thin aerospace bulkheads";
  } else if (detectedMachines.some(m => m.includes("Laser") || m.includes("Trumpf") || m.includes("Bystronic") || m.includes("Amada"))) {
    detectedIndustry = "Laser & Plasma Sheet Metal Job Shop";
    inferredPain = "Slug tip-ups causing rapid-motion head collisions and night-shift downtime on slat beds";
  } else if (detectedMachines.some(m => m.includes("5-Axis") || m.includes("Robotic Weld") || m.includes("Integrex"))) {
    detectedIndustry = "Multi-Process 5-Axis CNC & Robotic Fabrication";
    inferredPain = "CAD/CAM software fragmentation, custom post-processor maintenance, and machinist talent gap";
  }

  // Fallbacks if website had low crawl volume
  if (detectedMachines.length === 0) {
    detectedMachines.push("High-Precision Fiber Laser & CNC Machining Centers");
  }
  if (detectedMaterials.length === 0) {
    detectedMaterials.push("Stainless Steel, Aluminum & Structural Alloys");
  }

  // Construct Enriched Prospect
  const prospect: Prospect = {
    company: companyName,
    firstName: manualOverrides?.firstName || undefined,
    lastName: manualOverrides?.lastName || undefined,
    role: manualOverrides?.role || (detectedIndustry.includes("Aerospace") ? "VP of Manufacturing Engineering" : "Lead Laser & CAM Programmer"),
    email: manualOverrides?.email || (emailsFound[0] || `operations@${new URL(normalizedUrl).hostname.replace(/^www\./, "")}`),
    machines: detectedMachines,
    materials: detectedMaterials,
    region: manualOverrides?.region || "US",
    companySize: manualOverrides?.companySize || (certifications.length > 1 ? 95 : 40),
    painTrigger: manualOverrides?.painTrigger || inferredPain
  };

  if (saveToDatabase) {
    addProspect(prospect);
  }

  // Run Swarm Classification & 4-Touch Sequence Generation
  const personas = loadPersonas();
  const { persona, result } = classifyPersona(prospect, personas);
  const campaign = composeCampaign(persona, prospect, result);

  return {
    prospect,
    discoveredData: {
      sourceUrl: normalizedUrl,
      pagesCrawled: crawledPages,
      companyName,
      detectedMachines,
      detectedMaterials,
      certifications,
      emailsFound,
      detectedRegion: prospect.region,
      detectedIndustry,
      inferredPainPoint: inferredPain
    },
    campaign
  };
}
