// PrimordiaSim Interactive 3D Kinematics & ROI Engine
let demoData = null;
let isPaused = false;
let showEnvelope = true;
let showThermal = true;

// Active Prospect Database Fallback (for instant static hosting)
const FALLBACK_PROSPECTS = {
  "spacex": {
    company: "SpaceX — Starbase & Propulsion",
    persona: { id: "P2", label: "High-Alloy Aerospace/Medical Fab - Yield & Thermal Control" },
    machines: ["15kW Trumpf TruLaser Cell 7040 3D laser", "Hermle C62 5-Axis Gantry"],
    materials: ["SX500 Superalloy", "Inconel 718", "Ti-6Al-4V Grade 5"],
    confidence: 0.88,
    roi: "Estimated Annual Savings: ~$17,550,000 in superalloy yield and zero HAZ scrap."
  },
  "tesla": {
    company: "Tesla Gigafactory — CyberFab & Die",
    persona: { id: "P1", label: "Laser/Plasma Job Shop - Head Crash Prevention" },
    machines: ["20kW Bystronic ByStar Fiber Laser", "Schuler High-Speed Blanking Line"],
    materials: ["Ultra-Hard 30X Cold-Rolled Stainless", "A380 Cast Aluminum"],
    confidence: 0.88,
    roi: "Estimated Annual Savings: ~$48,000 in prevented head collision rebuilds."
  },
  "blue-origin": {
    company: "Blue Origin — BE-4 Engine Propulsion",
    persona: { id: "P2", label: "High-Alloy Aerospace/Medical Fab - Yield & Thermal Control" },
    machines: ["Matsuura MAM72-100H 5-Axis", "Makino D500 5-Axis Precision VMC"],
    materials: ["Haynes 282", "Inconel 718", "OFHC Copper"],
    confidence: 0.91,
    roi: "Estimated Annual Savings: ~$1,400,000 in combustion liner scrap elimination."
  },
  "relativity-space": {
    company: "Relativity Space — Stargate Additive",
    persona: { id: "P2", label: "High-Alloy Aerospace/Medical Fab - Yield & Thermal Control" },
    machines: ["Stargate 4th Gen DED Arc Cell", "DMG Mori DMU 200 5-Axis Mill"],
    materials: ["Inconel 625", "Monel K-500", "Al-Li 2195"],
    confidence: 0.89,
    roi: "Estimated Annual Savings: ~$148,000 in barrel distortion toolpath recalculation."
  },
  "anduril": {
    company: "Anduril Industries — Advanced Defense Hardware",
    persona: { id: "P3", label: "Multi-Process CNC + Weld - Unified Stack & AI Copilots" },
    machines: ["Mazak Integrex e-670H 5-Axis", "Haas UMC-1000 5-Axis"],
    materials: ["7075-T651 Aerospace Aluminum", "17-4 PH Stainless"],
    confidence: 0.90,
    roi: "Estimated Productivity Gain: 65% faster multi-machine CAM turnarounds."
  },
  "atlas-laser-fab": {
    company: "Atlas Laser Fab",
    persona: { id: "P1", label: "Laser/Plasma Job Shop - Head Crash Prevention" },
    machines: ["Trumpf TruLaser 5030 fiber laser", "Bystronic ByStar 12kW"],
    materials: ["mild steel", "304 stainless steel", "aluminum 5052"],
    confidence: 0.95,
    roi: "Estimated Annual Savings: ~$48,000 in prevented head collision rebuilds."
  },
  "great-lakes-laser-fab": {
    company: "Great Lakes Laser Fab",
    persona: { id: "P1", label: "Laser/Plasma Job Shop - Head Crash Prevention" },
    machines: ["Trumpf TruLaser 3030 6kW", "Bystronic BySprint Fiber 8kW"],
    materials: ["mild steel", "1018 cold roll", "aluminum 5052"],
    confidence: 0.92,
    roi: "Estimated Annual Savings: ~$36,000 in prevented head collision rebuilds."
  }
};

function getSlugFromUrl() {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  if (pathSegments.length > 1 && pathSegments[0] === "demo") {
    return pathSegments[1].toLowerCase();
  }
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("slug")) {
    return urlParams.get("slug").toLowerCase();
  }
  return "spacex";
}

// --- Fetch Demo Data ---
async function initDemo() {
  const slug = getSlugFromUrl();

  // Try API first
  try {
    const res = await fetch(`/api/demo/${slug}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.campaign) {
        demoData = {
          company: data.campaign.prospect.company,
          persona: data.campaign.persona,
          machines: data.campaign.prospect.machines,
          materials: data.campaign.prospect.materials,
          confidence: data.campaign.classification.confidence,
          roi: data.campaign.roiCalculation
        };
        populatePageData();
        initCalculator();
        initSimulationCanvas();
        return;
      }
    }
  } catch (err) {
    // fallback to client-side catalog
  }

  // Fallback to static matching
  let matchedKey = Object.keys(FALLBACK_PROSPECTS).find(k => slug.includes(k) || k.includes(slug));
  const fallback = FALLBACK_PROSPECTS[matchedKey || "spacex"];

  demoData = fallback;
  populatePageData();
  initCalculator();
  initSimulationCanvas();
}

// --- Populate Tailored Company Data ---
function populatePageData() {
  if (!demoData) return;
  const p = demoData;
  const persona = p.persona;
  const conf = Math.round((p.confidence || 0.90) * 100);

  document.title = `Primordia Kinematics Simulation — ${p.company}`;
  document.getElementById("company-name-header").textContent = p.company;
  document.getElementById("hero-company").textContent = p.company;
  document.getElementById("hero-persona-tag").textContent = `${persona.id} — ${persona.label.split(" - ")[0]}`;
  document.getElementById("hero-match-tag").textContent = `${conf}% Kinematic Fit`;
  document.getElementById("hero-machines").textContent = (p.machines || []).slice(0, 2).join(" & ");
  document.getElementById("hero-materials").textContent = (p.materials || []).slice(0, 2).join(" & ");
  document.getElementById("calc-company-name").textContent = p.company;

  if (p.machines && p.machines[0]) {
    document.getElementById("active-kinematic-model").textContent = `${p.machines[0]} / 3D Collision Envelope Active`;
  }
}

// --- Interactive ROI & Scrap Calculator ---
function initCalculator() {
  const sliderSheets = document.getElementById("slider-sheets");
  const sliderCost = document.getElementById("slider-cost");
  const sliderCrashes = document.getElementById("slider-crashes");

  const valSheets = document.getElementById("val-sheets");
  const valCost = document.getElementById("val-cost");
  const valCrashes = document.getElementById("val-crashes");

  const resScrapSavings = document.getElementById("res-scrap-savings");
  const resDowntimeSavings = document.getElementById("res-downtime-savings");
  const resTotalRoi = document.getElementById("res-total-roi");

  function recalculate() {
    const sheets = parseInt(sliderSheets.value, 10);
    const costPerSheet = parseInt(sliderCost.value, 10);
    const crashesAvoided = parseInt(sliderCrashes.value, 10);

    valSheets.textContent = `${sheets} sheets/mo`;
    valCost.textContent = `$${costPerSheet.toLocaleString()}/sheet`;
    valCrashes.textContent = `${crashesAvoided} incidents/yr`;

    // MaxRects yield increase assumption: 15% sheet utilization boost
    const annualMaterialSpend = sheets * 12 * costPerSheet;
    const scrapReclaimed = Math.round(annualMaterialSpend * 0.15);

    // Head crash loss: $18,000 per incident (lens/head replacement + 24h downtime)
    const crashSavings = crashesAvoided * 18000;
    const totalSavings = scrapReclaimed + crashSavings;

    resScrapSavings.textContent = `$${scrapReclaimed.toLocaleString()}`;
    resDowntimeSavings.textContent = `$${crashSavings.toLocaleString()}`;
    resTotalRoi.textContent = `$${totalSavings.toLocaleString()}`;
  }

  sliderSheets.addEventListener("input", recalculate);
  sliderCost.addEventListener("input", recalculate);
  sliderCrashes.addEventListener("input", recalculate);

  recalculate();
}

// --- Real-Time 3D Simulation Canvas ---
function initSimulationCanvas() {
  const canvas = document.getElementById("simCanvas");
  const ctx = canvas.getContext("2d");

  const btnPause = document.getElementById("btn-pause-sim");
  const btnToggleEnvelope = document.getElementById("btn-toggle-envelope");
  const btnToggleThermal = document.getElementById("btn-toggle-thermal");
  const hudSpeed = document.getElementById("hud-speed");
  const hudClearance = document.getElementById("hud-clearance");

  btnPause.addEventListener("click", () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? "Resume" : "Pause";
  });

  btnToggleEnvelope.addEventListener("click", () => {
    showEnvelope = !showEnvelope;
    btnToggleEnvelope.classList.toggle("active", showEnvelope);
    btnToggleEnvelope.textContent = `Collision Envelope: ${showEnvelope ? "ON" : "OFF"}`;
  });

  btnToggleThermal.addEventListener("click", () => {
    showThermal = !showThermal;
    btnToggleThermal.classList.toggle("active", showThermal);
    btnToggleThermal.textContent = `Thermal Gradient: ${showThermal ? "ON" : "OFF"}`;
  });

  // Toolpath Waypoints
  const waypoints = [
    { x: 120, y: 100, isCut: true },
    { x: 260, y: 100, isCut: true },
    { x: 260, y: 220, isCut: true },
    { x: 120, y: 220, isCut: true },
    { x: 120, y: 100, isCut: true },
    // Rapid traverse to part 2
    { x: 380, y: 120, isCut: false },
    { x: 520, y: 120, isCut: true },
    { x: 520, y: 200, isCut: true },
    { x: 380, y: 200, isCut: true },
    { x: 380, y: 120, isCut: true },
    // Rapid traverse to part 3
    { x: 580, y: 240, isCut: false },
    { x: 700, y: 240, isCut: true },
    { x: 700, y: 360, isCut: true },
    { x: 580, y: 360, isCut: true },
    { x: 580, y: 240, isCut: true },
    // Rapid traverse to part 4
    { x: 220, y: 280, isCut: false },
    { x: 340, y: 280, isCut: true },
    { x: 340, y: 390, isCut: true },
    { x: 220, y: 390, isCut: true },
    { x: 220, y: 280, isCut: true }
  ];

  let currentWp = 0;
  let headX = waypoints[0].x;
  let headY = waypoints[0].y;
  let thermalRings = [];

  function drawSlatBed() {
    ctx.strokeStyle = "#1A253A";
    ctx.lineWidth = 2;
    for (let x = 60; x < canvas.width - 60; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, canvas.height - 40);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    ctx.fillRect(80, 50, canvas.width - 160, canvas.height - 100);
    ctx.strokeRect(80, 50, canvas.width - 160, canvas.height - 100);
  }

  function drawParts() {
    ctx.strokeStyle = "#0284C7";
    ctx.fillStyle = "rgba(14, 165, 233, 0.08)";
    ctx.lineWidth = 2;

    ctx.fillRect(120, 100, 140, 120);
    ctx.strokeRect(120, 100, 140, 120);

    ctx.fillRect(380, 120, 140, 80);
    ctx.strokeRect(380, 120, 140, 80);

    ctx.fillRect(580, 240, 120, 120);
    ctx.strokeRect(580, 240, 120, 120);

    ctx.fillRect(220, 280, 120, 110);
    ctx.strokeRect(220, 280, 120, 110);

    ctx.fillStyle = "#10B981";
    const tabs = [
      [190, 100], [190, 220], [120, 160], [260, 160],
      [450, 120], [450, 200], [640, 240], [640, 360],
      [280, 280], [280, 390]
    ];
    tabs.forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSlatBed();
    drawParts();

    if (showThermal && thermalRings.length > 0) {
      thermalRings.forEach((ring) => {
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${ring.alpha})`;
        ctx.fill();
        ring.radius += 0.8;
        ring.alpha -= 0.025;
      });
      thermalRings = thermalRings.filter(r => r.alpha > 0);
    }

    if (!isPaused) {
      const target = waypoints[currentWp];
      const dx = target.x - headX;
      const dy = target.y - headY;
      const dist = Math.hypot(dx, dy);

      const moveSpeed = target.isCut ? 3.5 : 8.5;
      hudSpeed.textContent = target.isCut ? "45 m/min (Active Cut)" : "125 m/min (Rapid Traverse)";
      hudClearance.textContent = target.isCut ? ">12.8 mm" : ">16.4 mm";

      if (dist < moveSpeed) {
        headX = target.x;
        headY = target.y;
        currentWp = (currentWp + 1) % waypoints.length;
      } else {
        headX += (dx / dist) * moveSpeed;
        headY += (dy / dist) * moveSpeed;
      }

      if (target.isCut && Math.random() > 0.4) {
        thermalRings.push({ x: headX, y: headY, radius: 4, alpha: 0.4 });
      }
    }

    if (showEnvelope) {
      ctx.beginPath();
      ctx.ellipse(headX, headY, 28, 16, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
      ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(headX, headY - 35);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = "#34D399";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(headX, headY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#38BDF8";
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(headX, headY, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#FDE047";
    ctx.fill();

    requestAnimationFrame(render);
  }

  render();
}

window.addEventListener("DOMContentLoaded", initDemo);
