import fs from 'fs';
import path from 'path';

const dirs = ['C:\\Users\\Shane\\core', 'C:\\Users\\Shane\\commands'];
const singleFiles = ['C:\\Users\\Shane\\PrimordialOS.psm1'];

function makePureAscii(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Delta and other Greek/Unicode characters
  content = content.replace(/Δ/g, 'Delta');
  content = content.replace(/[^\x00-\x7F]/g, (char) => {
    console.log(`[Non-ASCII in ${path.basename(filePath)}] U+${char.charCodeAt(0).toString(16)}: ${char}`);
    switch (char) {
      case '—': return '--';
      case '–': return '-';
      case '“': case '”': return '"';
      case '‘': case '’': return "'";
      case '✦': return '*';
      case '⚡': return '!';
      case '✓': return '+';
      case '✗': return 'x';
      case '·': return ':';
      case '─': return '-';
      case '│': return '|';
      case '┌': case '┐': case '└': case '┘': return '+';
      case '█': return '#';
      case '╔': case '╗': case '╚': case '╝': case '═': case '║': return '#';
      case 'Δ': return 'Delta';
      default: return ' ';
    }
  });

  fs.writeFileSync(filePath, content, { encoding: 'ascii' });
  console.log(`Converted to Pure ASCII: ${filePath}`);
}

for (const dir of dirs) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.endsWith('.ps1') || f.endsWith('.psm1')) {
      makePureAscii(path.join(dir, f));
    }
  }
}

for (const sf of singleFiles) {
  makePureAscii(sf);
}

console.log('All files converted to 100% Pure ASCII.');
