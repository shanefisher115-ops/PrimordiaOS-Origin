// PrimordiaSwarm Frontend Application Controller
let state = {
  stats: {},
  personas: [],
  campaigns: [],
  selectedCampaignIndex: 0,
  selectedTouchStep: 1,
  activeFilter: "ALL",
  searchQuery: ""
};

// --- DOM Elements ---
const transportLabel = document.getElementById("transport-label");
const senderDisplay = document.getElementById("sender-display");
const statTotalAccounts = document.getElementById("stat-total-accounts");
const statP1Count = document.getElementById("stat-p1-count");
const statP2Count = document.getElementById("stat-p2-count");
const statP3Count = document.getElementById("stat-p3-count");
const statAvgConfidence = document.getElementById("stat-avg-confidence");
const searchInput = document.getElementById("search-input");
const filterPills = document.querySelectorAll(".filter-pill");
const prospectsList = document.getElementById("prospects-list");
const emptyState = document.getElementById("empty-state");
const studioContent = document.getElementById("studio-content");

// Dossier Elements
const dossierPersonaBadge = document.getElementById("dossier-persona-badge");
const dossierConfidenceBadge = document.getElementById("dossier-confidence-badge");
const dossierRegionBadge = document.getElementById("dossier-region-badge");
const dossierCompanyName = document.getElementById("dossier-company-name");
const dossierContactInfo = document.getElementById("dossier-contact-info");
const dossierRoiValue = document.getElementById("dossier-roi-value");
const dossierMachines = document.getElementById("dossier-machines");
const dossierMaterials = document.getElementById("dossier-materials");
const dossierRationale = document.getElementById("dossier-rationale");
const dossierScores = document.getElementById("dossier-scores");

// Sequence & Email Elements
const sequenceTabs = document.querySelectorAll(".seq-tab");
const emailFrom = document.getElementById("email-from");
const emailTo = document.getElementById("email-to");
const emailSubject = document.getElementById("email-subject");
const emailBodyText = document.getElementById("email-body-text");
const btnCopyEmail = document.getElementById("btn-copy-email");
const btnDispatchTouch = document.getElementById("btn-dispatch-touch");

// Modals
const modalCrmSync = document.getElementById("modal-crm-sync");
const modalEnrich = document.getElementById("modal-enrich");
const modalAddProspect = document.getElementById("modal-add-prospect");
const modalTestEmail = document.getElementById("modal-test-email");
const modalSmtp = document.getElementById("modal-smtp");
const toastContainer = document.getElementById("toast-container");

// --- Fetch Initial Dashboard Data ---
async function fetchDashboardData() {
  try {
    const res = await fetch("/api/data");
    const data = await res.json();

    if (data.success) {
      state.stats = data.stats;
      state.personas = data.personas;
      state.campaigns = data.campaigns;

      renderHeaderStats();
      renderProspectsList();
      if (state.campaigns.length > 0) {
        selectProspect(state.selectedCampaignIndex || 0);
      }
    }
  } catch (err) {
    showToast("Failed to load dashboard data: " + err.message, "error");
  }
}

// --- Render Header & Metrics ---
function renderHeaderStats() {
  const { stats } = state;
  const isSmtp = stats.smtpConfig && stats.smtpConfig.provider === "smtp";
  transportLabel.textContent = isSmtp ? "Live SMTP Active" : "Sandbox Mode (Safe Test)";
  transportLabel.style.color = isSmtp ? "#34D399" : "#FBBF24";

  if (stats.sender) {
    senderDisplay.textContent = `${stats.sender.name} <${stats.sender.email}>`;
  }

  statTotalAccounts.textContent = stats.totalProspects || 0;
  statP1Count.textContent = stats.p1Count || 0;
  statP2Count.textContent = stats.p2Count || 0;
  statP3Count.textContent = stats.p3Count || 0;
  statAvgConfidence.textContent = `${Math.round(stats.avgConfidence || 0)}%`;
}

// --- Filter & Search Logic ---
function getFilteredCampaigns() {
  return state.campaigns.filter((camp, index) => {
    const p = camp.prospect;
    const persona = camp.persona;
    
    // Filter by persona pill
    if (state.activeFilter !== "ALL" && persona.id !== state.activeFilter) {
      return false;
    }

    // Search text query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchCompany = (p.company || "").toLowerCase().includes(q);
      const matchRole = (p.role || "").toLowerCase().includes(q);
      const matchContact = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().includes(q);
      const matchMachines = (p.machines || []).join(" ").toLowerCase().includes(q);
      const matchMaterials = (p.materials || []).join(" ").toLowerCase().includes(q);
      return matchCompany || matchRole || matchContact || matchMachines || matchMaterials;
    }

    return true;
  });
}

// --- Render Prospect Cards List ---
function renderProspectsList() {
  const filtered = getFilteredCampaigns();
  prospectsList.innerHTML = "";

  if (filtered.length === 0) {
    prospectsList.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">No matching prospects found.</div>`;
    return;
  }

  filtered.forEach(camp => {
    const p = camp.prospect;
    const persona = camp.persona;
    const conf = Math.round(camp.classification.confidence * 100);
    const originalIndex = state.campaigns.indexOf(camp);

    const card = document.createElement("div");
    card.className = `prospect-card ${originalIndex === state.selectedCampaignIndex ? "active" : ""}`;
    card.dataset.index = originalIndex;

    let badgeClass = "badge-p1";
    if (persona.id === "P2") badgeClass = "badge-p2";
    if (persona.id === "P3") badgeClass = "badge-p3";

    card.innerHTML = `
      <div class="prospect-card-top">
        <div>
          <div class="prospect-company">${p.company}</div>
          <div class="prospect-role">${p.firstName ? p.firstName + " " + (p.lastName || "") + " • " : ""}${p.role}</div>
        </div>
        <span class="badge ${badgeClass}">${persona.id}</span>
      </div>
      <div class="prospect-card-bottom">
        <span>${p.machines[0] ? p.machines[0].split(" ")[0] : "Machinery"} • ${p.region}</span>
        <span style="font-weight: 600; color: #34D399;">${conf}% Match</span>
      </div>
    `;

    card.addEventListener("click", () => {
      selectProspect(originalIndex);
    });

    prospectsList.appendChild(card);
  });
}

// --- Select and Inspect Prospect ---
function selectProspect(index) {
  state.selectedCampaignIndex = index;
  const camp = state.campaigns[index];

  if (!camp) {
    emptyState.style.display = "flex";
    studioContent.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  studioContent.style.display = "block";

  // Highlight active card
  document.querySelectorAll(".prospect-card").forEach(c => {
    c.classList.toggle("active", parseInt(c.dataset.index, 10) === index);
  });

  const p = camp.prospect;
  const persona = camp.persona;
  const res = camp.classification;

  // Dossier Header
  dossierPersonaBadge.textContent = `${persona.id} - ${persona.label.split(" - ")[0]}`;
  dossierPersonaBadge.className = `badge ${persona.id === "P1" ? "badge-p1" : persona.id === "P2" ? "badge-p2" : "badge-p3"}`;
  dossierConfidenceBadge.textContent = `${Math.round(res.confidence * 100)}% Fit`;
  dossierRegionBadge.textContent = p.region || "US";

  dossierCompanyName.textContent = p.company;
  dossierContactInfo.textContent = `${p.firstName || ""} ${p.lastName || ""} • ${p.role} • ${p.email || "Email auto-synthesized"}`;
  dossierRoiValue.textContent = camp.roiCalculation.split(":")[1]?.trim() || camp.roiCalculation;

  const demoSlug = camp.slug || p.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const demoLinkEl = document.getElementById("dossier-demo-link");
  if (demoLinkEl) {
    demoLinkEl.href = `/demo/${demoSlug}`;
  }

  // Machines & Materials Tags
  dossierMachines.innerHTML = (p.machines || []).map(m => `<span class="tag-item">${m}</span>`).join("");
  dossierMaterials.innerHTML = (p.materials || []).map(mat => `<span class="tag-item">${mat}</span>`).join("");

  // Rationale & Scores
  dossierRationale.textContent = res.rationale;
  dossierScores.innerHTML = `
    <span class="score-pill">P1: ${res.scoreBreakdown.P1} pts</span>
    <span class="score-pill">P2: ${res.scoreBreakdown.P2} pts</span>
    <span class="score-pill">P3: ${res.scoreBreakdown.P3} pts</span>
  `;

  renderEmailPreview();
}

// --- Render Email Preview based on Selected Touch ---
function renderEmailPreview() {
  const camp = state.campaigns[state.selectedCampaignIndex];
  if (!camp) return;

  const touch = camp.touches.find(t => t.step === state.selectedTouchStep) || camp.touches[0];
  const p = camp.prospect;

  emailFrom.textContent = `${touch.fromName} <${touch.fromEmail}>`;
  emailTo.textContent = p.email || `${p.role.toLowerCase().replace(/[^a-z]/g, "")}@${p.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
  emailSubject.textContent = touch.subject;
  emailBodyText.textContent = touch.body;

  // Update touch tabs
  sequenceTabs.forEach(tab => {
    tab.classList.toggle("active", parseInt(tab.dataset.step, 10) === state.selectedTouchStep);
  });
}

// --- Toast Notification Helper ---
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === "success" ? "✓" : "✗"}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// --- Event Listeners ---

// Search & Filters
searchInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value;
  renderProspectsList();
});

filterPills.forEach(pill => {
  pill.addEventListener("click", () => {
    filterPills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    state.activeFilter = pill.dataset.filter;
    renderProspectsList();
  });
});

// Sequence Tabs
sequenceTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    state.selectedTouchStep = parseInt(tab.dataset.step, 10);
    renderEmailPreview();
  });
});

// Copy Email
btnCopyEmail.addEventListener("click", () => {
  const textToCopy = `Subject: ${emailSubject.textContent}\n\n${emailBodyText.textContent}`;
  navigator.clipboard.writeText(textToCopy);
  showToast("Email subject and body copied to clipboard!");
});

// Dispatch Touch
btnDispatchTouch.addEventListener("click", async () => {
  btnDispatchTouch.disabled = true;
  btnDispatchTouch.textContent = "Dispatching...";

  try {
    const res = await fetch("/api/dispatch/touch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prospectIndex: state.selectedCampaignIndex,
        touchStep: state.selectedTouchStep
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Touch ${state.selectedTouchStep} dispatched to ${data.dispatchResult.recipient}!`);
    } else {
      showToast(`Dispatch failed: ${data.dispatchResult?.error || data.error}`, "error");
    }
  } catch (err) {
    showToast("Error: " + err.message, "error");
  } finally {
    btnDispatchTouch.disabled = false;
    btnDispatchTouch.textContent = "🚀 Dispatch Touch to Recipient";
  }
});

// 0. Autonomous Shop Hunter Swarm
const modalShopHunter = document.getElementById("modal-shop-hunter");
document.getElementById("btn-open-hunter").addEventListener("click", () => {
  modalShopHunter.classList.add("active");
});
document.getElementById("btn-close-hunter-modal").addEventListener("click", () => modalShopHunter.classList.remove("active"));
document.getElementById("btn-cancel-hunter").addEventListener("click", () => modalShopHunter.classList.remove("active"));

document.getElementById("btn-submit-hunter").addEventListener("click", async () => {
  const capability = document.getElementById("select-hunt-capability").value;
  const region = document.getElementById("select-hunt-region").value;
  const count = document.getElementById("select-hunt-count").value;
  const autoSyncApollo = document.getElementById("check-auto-apollo").checked;

  const btn = document.getElementById("btn-submit-hunter");
  const streamBox = document.getElementById("hunter-stream-box");

  btn.disabled = true;
  btn.textContent = "Hunting Shops...";
  streamBox.style.display = "block";
  streamBox.innerHTML = `<span class="pulse-indicator" style="display: inline-block; margin-right: 6px;"></span> Searching regional databases for ${capability.toUpperCase()} shops in ${region.toUpperCase()}...`;

  try {
    const res = await fetch("/api/hunt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, region, count, autoSyncApollo })
    });
    const data = await res.json();

    if (data.success) {
      const discovered = data.discoveredCount || 0;
      let apolloMsg = "";
      if (data.apolloSyncSummary) {
        apolloMsg = `<br><span style="color: #38BDF8; font-size: 11px;">✓ Auto-Synced ${data.apolloSyncSummary.syncedCount} leads to Apollo.io!</span>`;
      }

      streamBox.innerHTML = `
        <span style="color: #34D399; font-weight: 600;">✓ Successfully Ingested ${discovered} New Manufacturing Accounts!</span>${apolloMsg}<br>
        <div style="margin-top: 6px; font-size: 11px; color: #94A3B8;">
          ${data.newIngestedProspects.map(p => `• <strong>${p.company}</strong> (${p.region}) — ${p.machines[0]}`).join("<br>")}
        </div>
      `;

      showToast(`Ingested ${discovered} new shops & generated 3D demos!`);
      await fetchDashboardData();
      selectProspect(state.campaigns.length - 1);

      setTimeout(() => {
        modalShopHunter.classList.remove("active");
        streamBox.style.display = "none";
      }, 3500);
    } else {
      showToast("Shop Hunter failed: " + data.error, "error");
    }
  } catch (err) {
    showToast("Hunter error: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "🚀 Unleash Shop Hunter";
  }
});

// 1. 1-Click CRM Sync
document.getElementById("btn-open-crm-sync").addEventListener("click", () => {
  modalCrmSync.classList.add("active");
});
document.getElementById("btn-close-crm-modal").addEventListener("click", () => modalCrmSync.classList.remove("active"));
document.getElementById("btn-cancel-crm").addEventListener("click", () => modalCrmSync.classList.remove("active"));

document.getElementById("btn-submit-crm-sync").addEventListener("click", async () => {
  const provider = document.getElementById("select-crm-provider").value;
  const apiKey = document.getElementById("input-crm-api-key").value.trim();
  const btn = document.getElementById("btn-submit-crm-sync");
  const statusBox = document.getElementById("crm-sync-status-box");

  btn.disabled = true;
  btn.textContent = "Syncing Leads...";
  statusBox.style.display = "block";
  statusBox.innerHTML = `<span class="pulse-indicator" style="display: inline-block; margin-right: 6px;"></span> Packaging ${state.campaigns.length} campaigns with custom variables...`;

  try {
    const res = await fetch("/api/crm/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        config: apiKey ? { [provider]: { apiKey } } : undefined
      })
    });
    const data = await res.json();

    if (data.success) {
      const summary = data.summary;
      statusBox.innerHTML = `
        <span style="color: #34D399; font-weight: 600;">✓ Synced ${summary.syncedCount}/${summary.totalLeads} Leads to ${summary.provider.toUpperCase()}</span><br>
        <span style="color: #94A3B8; font-size: 11px;">Mode: ${summary.isSandbox ? "Sandbox / Simulation Mode (Mock Verified)" : "Live API Ingestion"}</span>
      `;
      showToast(`Pushed ${summary.syncedCount} leads to ${summary.provider.toUpperCase()}!`);
      setTimeout(() => {
        modalCrmSync.classList.remove("active");
        statusBox.style.display = "none";
      }, 2500);
    } else {
      showToast("CRM Sync failed: " + data.error, "error");
    }
  } catch (err) {
    showToast("Sync error: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "🚀 Push All 12 Leads";
  }
});

// 2. Scrape & Enrich from URL
document.getElementById("btn-open-enrich").addEventListener("click", () => {
  modalEnrich.classList.add("active");
});
document.getElementById("btn-close-enrich-modal").addEventListener("click", () => modalEnrich.classList.remove("active"));
document.getElementById("btn-cancel-enrich").addEventListener("click", () => modalEnrich.classList.remove("active"));

document.getElementById("btn-submit-enrich").addEventListener("click", async () => {
  const url = document.getElementById("input-enrich-url").value.trim();
  const contactName = document.getElementById("input-enrich-contact").value.trim();
  const customRole = document.getElementById("input-enrich-role").value.trim();

  if (!url) {
    showToast("Please enter a website URL", "error");
    return;
  }

  const btn = document.getElementById("btn-submit-enrich");
  const loader = document.getElementById("enrich-loader");
  btn.disabled = true;
  btn.textContent = "Crawling...";
  loader.style.display = "block";

  try {
    const res = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        overrides: {
          firstName: contactName || undefined,
          role: customRole || undefined
        }
      })
    });
    const data = await res.json();

    if (data.success) {
      showToast(`Successfully enriched "${data.result.prospect.company}"!`);
      modalEnrich.classList.remove("active");
      document.getElementById("input-enrich-url").value = "";
      document.getElementById("input-enrich-contact").value = "";
      document.getElementById("input-enrich-role").value = "";

      await fetchDashboardData();
      selectProspect(state.campaigns.length - 1);
    } else {
      showToast("Scraping error: " + data.error, "error");
    }
  } catch (err) {
    showToast("Scraper failed: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "🕷️ Crawl & Ingest";
    loader.style.display = "none";
  }
});

// 3. Add Prospect Manually
document.getElementById("btn-add-prospect").addEventListener("click", () => {
  modalAddProspect.classList.add("active");
});
document.getElementById("btn-close-add-modal").addEventListener("click", () => modalAddProspect.classList.remove("active"));
document.getElementById("btn-cancel-add").addEventListener("click", () => modalAddProspect.classList.remove("active"));

document.getElementById("form-add-prospect").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    company: document.getElementById("input-company").value,
    role: document.getElementById("input-role").value,
    firstName: document.getElementById("input-firstname").value,
    lastName: document.getElementById("input-lastname").value,
    email: document.getElementById("input-email").value,
    companySize: document.getElementById("input-size").value,
    machines: document.getElementById("input-machines").value,
    materials: document.getElementById("input-materials").value,
    painTrigger: document.getElementById("input-pain").value
  };

  try {
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      showToast(`Account "${payload.company}" ingested & classified!`);
      modalAddProspect.classList.remove("active");
      document.getElementById("form-add-prospect").reset();
      await fetchDashboardData();
      selectProspect(state.campaigns.length - 1);
    } else {
      showToast(data.error, "error");
    }
  } catch (err) {
    showToast("Failed to add prospect: " + err.message, "error");
  }
});

// 3.5. Batch Dispatch
const modalBatchDispatch = document.getElementById("modal-batch-dispatch");
document.getElementById("btn-open-batch-dispatch").addEventListener("click", () => {
  modalBatchDispatch.classList.add("active");
  const btn = document.getElementById("btn-submit-batch-dispatch");
  if (btn) btn.textContent = `🚀 Dispatch All ${state.campaigns.length} Emails`;
});
document.getElementById("btn-close-batch-modal").addEventListener("click", () => modalBatchDispatch.classList.remove("active"));
document.getElementById("btn-cancel-batch").addEventListener("click", () => modalBatchDispatch.classList.remove("active"));

document.getElementById("btn-submit-batch-dispatch").addEventListener("click", async () => {
  const touchStep = parseInt(document.getElementById("select-batch-touch").value, 10);
  const delayMs = parseInt(document.getElementById("select-batch-throttle").value, 10);
  const btn = document.getElementById("btn-submit-batch-dispatch");
  const progressBox = document.getElementById("batch-progress-box");
  const progressBar = document.getElementById("batch-progress-bar");
  const progressLabel = document.getElementById("batch-progress-label");
  const progressCount = document.getElementById("batch-progress-count");
  const logStream = document.getElementById("batch-log-stream");

  btn.disabled = true;
  btn.textContent = "Sending Batch...";
  progressBox.style.display = "block";
  progressBar.style.width = "25%";
  progressLabel.textContent = `Dispatching Touch ${touchStep} sequences...`;
  progressCount.textContent = `0 / ${state.campaigns.length}`;
  logStream.innerHTML = "<div>Connecting to mail transport...</div>";

  try {
    const res = await fetch("/api/dispatch/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ touchStep, delayMs })
    });
    const data = await res.json();

    if (data.success) {
      progressBar.style.width = "100%";
      progressCount.textContent = `${data.successCount} / ${data.total}`;
      progressLabel.textContent = `✓ Batch dispatch complete!`;
      
      logStream.innerHTML = data.results.map(r => `<div>[✓] Sent Touch ${touchStep} to <strong>${r.recipient}</strong> (${r.isSandbox ? "Sandbox" : "Live SMTP"})</div>`).join("");
      showToast(`Dispatched all ${data.successCount} Touch ${touchStep} emails!`);

      setTimeout(() => {
        modalBatchDispatch.classList.remove("active");
        progressBox.style.display = "none";
      }, 4000);
    } else {
      showToast("Batch dispatch error: " + data.error, "error");
    }
  } catch (err) {
    showToast("Batch error: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = `🚀 Dispatch All ${state.campaigns.length} Emails`;
  }
});

// 4. Test Email
document.getElementById("btn-test-email").addEventListener("click", () => {
  modalTestEmail.classList.add("active");
});
document.getElementById("btn-close-test-modal").addEventListener("click", () => modalTestEmail.classList.remove("active"));
document.getElementById("btn-cancel-test").addEventListener("click", () => modalTestEmail.classList.remove("active"));

document.getElementById("btn-send-test-submit").addEventListener("click", async () => {
  const toEmail = document.getElementById("input-test-email").value;
  if (!toEmail || !toEmail.includes("@")) {
    showToast("Please enter a valid email address", "error");
    return;
  }

  const btn = document.getElementById("btn-send-test-submit");
  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const res = await fetch("/api/dispatch/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail })
    });
    const data = await res.json();

    if (data.success) {
      showToast(`Test email successfully sent to ${toEmail}!`);
      modalTestEmail.classList.remove("active");
    } else {
      showToast("Dispatch failed: " + (data.result?.error || data.error), "error");
    }
  } catch (err) {
    showToast("Error: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Dispatch Test";
  }
});

// 5. SMTP Settings
document.getElementById("btn-smtp-settings").addEventListener("click", () => {
  modalSmtp.classList.add("active");
});
document.getElementById("btn-close-smtp-modal").addEventListener("click", () => modalSmtp.classList.remove("active"));
document.getElementById("btn-cancel-smtp").addEventListener("click", () => modalSmtp.classList.remove("active"));

document.getElementById("form-smtp").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    provider: document.getElementById("select-provider").value,
    host: document.getElementById("input-smtp-host").value,
    port: document.getElementById("input-smtp-port").value,
    user: document.getElementById("input-smtp-user").value,
    pass: document.getElementById("input-smtp-pass").value
  };

  try {
    const res = await fetch("/api/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      showToast("Mail server settings updated!");
      modalSmtp.classList.remove("active");
      await fetchDashboardData();
    }
  } catch (err) {
    showToast("Failed to save SMTP settings: " + err.message, "error");
  }
});

// Initial boot
fetchDashboardData();
