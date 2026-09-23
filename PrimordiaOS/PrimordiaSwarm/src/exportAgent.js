"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportCampaignsToJson = exportCampaignsToJson;
exports.exportLeadsToCsv = exportLeadsToCsv;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function exportCampaignsToJson(campaigns, outputDir) {
    const targetDir = outputDir || path_1.default.join(__dirname, "..", "dist", "output");
    if (!fs_1.default.existsSync(targetDir)) {
        fs_1.default.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path_1.default.join(targetDir, "campaign_export.json");
    fs_1.default.writeFileSync(filePath, JSON.stringify(campaigns, null, 2), "utf8");
    return filePath;
}
function exportLeadsToCsv(campaigns, outputDir) {
    const targetDir = outputDir || path_1.default.join(__dirname, "..", "dist", "output");
    if (!fs_1.default.existsSync(targetDir)) {
        fs_1.default.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path_1.default.join(targetDir, "outbound_leads.csv");
    const headers = [
        "From Name",
        "From Email",
        "First Name",
        "Last Name",
        "Recipient Email",
        "Company",
        "Role",
        "Persona ID",
        "Persona Label",
        "Confidence",
        "Classification Rationale",
        "Estimated ROI",
        "Touch 1 Subject",
        "Touch 1 Body",
        "Touch 2 Subject",
        "Touch 2 Body",
        "Touch 3 Subject",
        "Touch 3 Body",
        "Touch 4 Subject",
        "Touch 4 Body"
    ];
    const escapeCsv = (str) => {
        if (!str)
            return '""';
        const clean = str.replace(/"/g, '""');
        return `"${clean}"`;
    };
    const rows = campaigns.map(c => {
        const p = c.prospect;
        const t1 = c.touches.find(t => t.step === 1);
        const t2 = c.touches.find(t => t.step === 2);
        const t3 = c.touches.find(t => t.step === 3);
        const t4 = c.touches.find(t => t.step === 4);
        return [
            escapeCsv(c.fromName),
            escapeCsv(c.fromEmail),
            escapeCsv(p.firstName || ""),
            escapeCsv(p.lastName || ""),
            escapeCsv(p.email || `${p.role.toLowerCase().replace(/[^a-z]/g, "")}@${p.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`),
            escapeCsv(p.company),
            escapeCsv(p.role),
            escapeCsv(c.persona.id),
            escapeCsv(c.persona.label),
            escapeCsv(c.classification.confidence.toString()),
            escapeCsv(c.classification.rationale),
            escapeCsv(c.roiCalculation),
            escapeCsv(t1?.subject || ""),
            escapeCsv(t1?.body || ""),
            escapeCsv(t2?.subject || ""),
            escapeCsv(t2?.body || ""),
            escapeCsv(t3?.subject || ""),
            escapeCsv(t3?.body || ""),
            escapeCsv(t4?.subject || ""),
            escapeCsv(t4?.body || "")
        ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    fs_1.default.writeFileSync(filePath, csvContent, "utf8");
    return filePath;
}
