import fs from 'fs';
import path from 'path';

const dirs = ['C:\\Users\\Shane\\core', 'C:\\Users\\Shane\\commands'];
const singleFiles = ['C:\\Users\\Shane\\PrimordialOS.psm1'];

function sanitizeFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Strip BOM
  while (content.charCodeAt(0) === 0xFEFF || content.startsWith('?') || content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  content = content.replace(/\uFEFF/g, '');

  // Replace unicode characters that contain byte 0x94 or multi-byte sequences
  content = content.replace(/—/g, '--'); // Em-dash (0xE2 0x80 0x94)
  content = content.replace(/–/g, '-');  // En-dash
  content = content.replace(/“/g, '"').replace(/”/g, '"'); // Smart double quotes
  content = content.replace(/‘/g, "'").replace(/’/g, "'"); // Smart single quotes
  content = content.replace(/🔥/g, '*');  // Fire emoji (has byte 0x94)
  content = content.replace(/🥇/g, '[1]').replace(/🥈/g, '[2]').replace(/🥉/g, '[3]');
  content = content.replace(/✓/g, '+');
  content = content.replace(/✗/g, 'x');
  content = content.replace(/✦/g, '*');
  content = content.replace(/⚡/g, '!');
  content = content.replace(/─/g, '-');
  content = content.replace(/·/g, ':');
  content = content.replace(/◀/g, '<');

  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  console.log(`Sanitized: ${filePath}`);
}

for (const dir of dirs) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.endsWith('.ps1') || f.endsWith('.psm1')) {
      sanitizeFile(path.join(dir, f));
    }
  }
}

for (const sf of singleFiles) {
  sanitizeFile(sf);
}

console.log('All PowerShell scripts sanitized to ASCII-safe encoding.');
