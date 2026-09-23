"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvImporter = CsvImporter;
const papaparse_1 = __importDefault(require("papaparse"));
function CsvImporter({ onImport }) {
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        papaparse_1.default.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const mappedAccounts = results.data.map((row, idx) => ({
                    id: `csv-${Date.now()}-${idx}`,
                    name: row.company || row.Company || row.name || 'Unknown Company',
                    contactName: row.contact || row.Contact || row.name || 'Operations Lead',
                    title: row.title || row.Title || 'Manufacturing Lead',
                    email: row.email || row.Email || '',
                    location: row.location || row.Location || 'US',
                    machinery: row.machinery ? row.machinery.split(';') : ['Fiber Laser'],
                    materials: row.materials ? row.materials.split(';') : ['Carbon Steel'],
                    category: row.category || 'P1',
                    matchScore: parseInt(row.matchScore || '80', 10),
                }));
                onImport(mappedAccounts);
            },
        });
    };
    return (<label className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold text-white inline-flex items-center gap-1">
      📥 Import CSV
      <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden"/>
    </label>);
}
