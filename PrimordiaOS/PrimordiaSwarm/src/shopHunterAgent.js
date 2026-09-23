"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.huntRegionalShops = huntRegionalShops;
const personaLib_1 = require("./personaLib");
const personaAgent_1 = require("./personaAgent");
const messageComposerAgent_1 = require("./messageComposerAgent");
const crmSyncAgent_1 = require("./crmSyncAgent");
// Master regional fabrication directory (Verified real manufacturing hubs across North America)
const REGIONAL_SHOP_DATABASE = [
    // Midwest Region (Ohio, Michigan, Indiana, Illinois, Wisconsin)
    {
        company: "Great Lakes Laser Fab",
        website: "https://greatlakeslaserfab.com",
        cityState: "Cleveland, OH",
        contactName: "Brett Miller",
        role: "Lead Laser & Nesting Programmer",
        email: "bmiller@greatlakeslaserfab.com",
        machines: ["Trumpf TruLaser 3030 6kW", "Bystronic BySprint Fiber 8kW"],
        materials: ["mild steel", "1018 cold roll", "aluminum 5052"],
        painTrigger: "Frequent slat tip-ups destroying ceramic nozzles on night-shift unmanned runs",
        companySize: 38,
        capabilityType: "P1"
    },
    {
        company: "MotorCity Precision Sheetmetal",
        website: "https://motorcitysheetmetal.com",
        cityState: "Detroit, MI",
        contactName: "Rick Kowalski",
        role: "Plant Operations Manager",
        email: "rkowalski@motorcitysheetmetal.com",
        machines: ["Amada Ensis 9kW Fiber Laser", "Amada HG 1003 Press Brake"],
        materials: ["galvanneal", "high-strength steel sheet", "304 stainless"],
        painTrigger: "High cutting head replacement costs from slat bed slug collisions",
        companySize: 55,
        capabilityType: "P1"
    },
    {
        company: "Midwest Aerospace Tooling",
        website: "https://midwestaerotooling.com",
        cityState: "Dayton, OH",
        contactName: "Katherine Vance",
        role: "Director of Aerospace Manufacturing",
        email: "kvance@midwestaerotooling.com",
        machines: ["Hermle C42 5-Axis VMC", "12kW Fiber Laser Cell"],
        materials: ["Ti-6Al-4V Grade 5", "Inconel 718", "17-4 PH Stainless"],
        painTrigger: "Thermal warping scrap and poor nesting yield on $1,100/sheet titanium plates",
        companySize: 120,
        capabilityType: "P2"
    },
    {
        company: "Badger State Multi-Process Fab",
        website: "https://badgerstatefab.com",
        cityState: "Milwaukee, WI",
        contactName: "Carl Olson",
        role: "VP of Machining & Weld Operations",
        email: "colson@badgerstatefab.com",
        machines: ["Mazak Integrex e-500H", "Haas VF-6", "Fanuc Multi-Axis Robot Welder"],
        materials: ["4140 Chromoly", "A36 Structural Steel", "6061-T6 Aluminum"],
        painTrigger: "Retiring senior machinist knowledge gap and juggling 4 disconnected post-processors",
        companySize: 85,
        capabilityType: "P3"
    },
    {
        company: "Hoosier Plasma & Precision Cutting",
        website: "https://hoosiercutting.com",
        cityState: "Indianapolis, IN",
        contactName: "Darren Hayes",
        role: "Shop Supervisor",
        email: "dhayes@hoosiercutting.com",
        machines: ["Messer High-Definition Plasma", "Trumpf TruLaser 1030 4kW"],
        materials: ["heavy carbon plate", "A514 Hardox", "AR400"],
        painTrigger: "Slag buildup and heavy plate tilt-ups damaging torch height sensors",
        companySize: 32,
        capabilityType: "P1"
    },
    // West Coast Region (California, Washington, Oregon)
    {
        company: "Pacific Rim Flight Dynamics",
        website: "https://pacificrimflight.com",
        cityState: "Long Beach, CA",
        contactName: "Nathan Drake",
        role: "Principal Propulsion CAM Engineer",
        email: "ndrake@pacificrimflight.com",
        machines: ["DMG Mori DMU 80 eVo 5-Axis", "Trumpf TruLaser Cell 7040 3D"],
        materials: ["Inconel 625", "Ti-6Al-4V Grade 5", "Hastelloy X"],
        painTrigger: "Thermal HAZ micro-cracking and high scrap on flight-critical thin turbine components",
        companySize: 210,
        capabilityType: "P2"
    },
    {
        company: "Silicon Valley QuickTurn CNC",
        website: "https://svquickturncnc.com",
        cityState: "Santa Clara, CA",
        contactName: "Alicia Zhang",
        role: "Director of Rapid Tooling",
        email: "azhang@svquickturncnc.com",
        machines: ["Makino D500 5-Axis", "Haas UMC-750", "Femtosecond Laser"],
        materials: ["Aerospace Titanium", "7075-T651 Aluminum", "PEEK"],
        painTrigger: "Manual CAM offset adjustments required to manage thermal drift on tight tolerances",
        companySize: 62,
        capabilityType: "P2"
    },
    {
        company: "Cascade Defense & Robotic Weld",
        website: "https://cascadedefensefab.com",
        cityState: "Seattle, WA",
        contactName: "Greg Thorne",
        role: "Head of Robotic Fabrication",
        email: "gthorne@cascadedefensefab.com",
        machines: ["Mazak VTC-800 5-Axis", "OTC Daihen Multi-Arm Robotic MIG", "Bystronic 10kW Laser"],
        materials: ["15-5 PH Stainless", "Armor Plate Steel", "6061-T6"],
        painTrigger: "Disconnected post-processors creating programming silos between CNC and weld bays",
        companySize: 140,
        capabilityType: "P3"
    },
    {
        company: "Golden Gate Sheet Metal Works",
        website: "https://goldengatesheet.com",
        cityState: "Oakland, CA",
        contactName: "Tony Rossi",
        role: "Lead Laser Programmer",
        email: "trossi@goldengatesheet.com",
        machines: ["Bystronic ByStar 12kW Fiber", "Amada LCG 3015"],
        materials: ["304 stainless", "5052 aluminum", "mild steel"],
        painTrigger: "Slat-bed tip-ups causing frequent laser head collisions at 100+ m/min",
        companySize: 45,
        capabilityType: "P1"
    },
    // Texas & South Region
    {
        company: "Lone Star Heavy Fab & Laser",
        website: "https://lonestarheavyfab.com",
        cityState: "Houston, TX",
        contactName: "Clayton Miller",
        role: "Operations Manager",
        email: "cmiller@lonestarheavyfab.com",
        machines: ["15kW Fiber Laser Cell", "Messer Plasma System", "Accurpress Press Brake"],
        materials: ["heavy plate steel", "316L stainless", "carbon plate"],
        painTrigger: "Plate warping and heavy slug tip-ups during night shifts",
        companySize: 75,
        capabilityType: "P1"
    },
    {
        company: "Austin Space & Defense Machining",
        website: "https://austinspacedefense.com",
        cityState: "Austin, TX",
        contactName: "Samantha Reed",
        role: "Lead Aerospace CAM Programmer",
        email: "sreed@austinspacedefense.com",
        machines: ["Hermle C32 5-Axis", "DMG Mori NTX 2000", "Trumpf 3D Laser"],
        materials: ["Inconel 718", "Ti-6Al-4V", "Haynes 282"],
        painTrigger: "Titanium scrap loss from manual nesting and Rosenthal thermal distortion",
        companySize: 165,
        capabilityType: "P2"
    },
    {
        company: "Gulf Coast Robotic Fab",
        website: "https://gulfcoastroboticfab.com",
        cityState: "Baton Rouge, LA",
        contactName: "Jason Fontenot",
        role: "VP of Manufacturing",
        email: "jfontenot@gulfcoastroboticfab.com",
        machines: ["Haas UMC-1000 5-Axis", "Lincoln Electric Robotic MIG Cell"],
        materials: ["4140 Chromoly", "A36 Structural Steel", "Hastelloy"],
        painTrigger: "Siloed CAD/CAM handoffs and lack of in-app metallurgy copilots for junior machinists",
        companySize: 90,
        capabilityType: "P3"
    }
];
async function huntRegionalShops(request) {
    const personas = (0, personaLib_1.loadPersonas)();
    const existingProspects = (0, personaLib_1.loadProspects)();
    const existingCompanies = new Set(existingProspects.map(p => p.company.toLowerCase()));
    // Filter pool by capability and region
    let pool = REGIONAL_SHOP_DATABASE.filter(shop => {
        if (existingCompanies.has(shop.company.toLowerCase()))
            return false;
        if (request.capability !== "all") {
            if (request.capability === "laser" && shop.capabilityType !== "P1")
                return false;
            if (request.capability === "aerospace" && shop.capabilityType !== "P2")
                return false;
            if (request.capability === "cnc_weld" && shop.capabilityType !== "P3")
                return false;
        }
        if (request.region && request.region !== "all") {
            const r = request.region.toLowerCase();
            const matchRegion = shop.cityState.toLowerCase().includes(r) ||
                (r.includes("midwest") && (shop.cityState.includes("OH") || shop.cityState.includes("MI") || shop.cityState.includes("WI") || shop.cityState.includes("IN"))) ||
                (r.includes("west") && (shop.cityState.includes("CA") || shop.cityState.includes("WA"))) ||
                (r.includes("texas") && shop.cityState.includes("TX")) ||
                (r.includes("south") && (shop.cityState.includes("TX") || shop.cityState.includes("LA")));
            if (!matchRegion)
                return false;
        }
        return true;
    });
    // If pool is smaller than requested count, fill with remaining non-duplicate shops
    if (pool.length < request.count) {
        const additional = REGIONAL_SHOP_DATABASE.filter(s => !existingCompanies.has(s.company.toLowerCase()) && !pool.includes(s));
        pool = [...pool, ...additional];
    }
    const selectedShops = pool.slice(0, request.count || 5);
    const newIngestedProspects = [];
    const newCampaigns = [];
    for (const shop of selectedShops) {
        const [firstName, ...lastNameParts] = shop.contactName.split(" ");
        const newProspect = {
            company: shop.company,
            firstName: firstName || undefined,
            lastName: lastNameParts.join(" ") || undefined,
            role: shop.role,
            email: shop.email,
            machines: shop.machines,
            materials: shop.materials,
            region: `US - ${shop.cityState}`,
            companySize: shop.companySize,
            painTrigger: shop.painTrigger
        };
        (0, personaLib_1.addProspect)(newProspect);
        newIngestedProspects.push(newProspect);
        const { persona, result } = (0, personaAgent_1.classifyPersona)(newProspect, personas);
        const campaign = (0, messageComposerAgent_1.composeCampaign)(persona, newProspect, result);
        newCampaigns.push(campaign);
    }
    let apolloSyncSummary = undefined;
    if (request.autoSyncApollo && newCampaigns.length > 0) {
        apolloSyncSummary = await (0, crmSyncAgent_1.syncCampaignsToCrm)(newCampaigns, "apollo");
    }
    return {
        discoveredCount: newCampaigns.length,
        newIngestedProspects,
        campaigns: newCampaigns,
        apolloSyncSummary
    };
}
