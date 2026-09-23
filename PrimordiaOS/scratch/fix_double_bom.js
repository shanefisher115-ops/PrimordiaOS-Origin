import fs from 'fs';
import path from 'path';

const dirs = ['C:\\Users\\Shane\\core', 'C:\\Users\\Shane\\commands'];
const singleFiles = ['C:\\Users\\Shane\\PrimordialOS.psm1'];

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Strip all leading \uFEFF and ? characters
  while (content.charCodeAt(0) === 0xFEFF || content.startsWith('?') || content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  // Also strip any other \uFEFF inside
  content = content.replace(/\uFEFF/g, '');
  
  // Write as clean UTF-8
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  console.log(`Cleaned: ${filePath}`);
}

for (const dir of dirs) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.endsWith('.ps1') || f.endsWith('.psm1')) {
      cleanFile(path.join(dir, f));
    }
  }
}

for (const sf of singleFiles) {
  cleanFile(sf);
}

console.log('All files stripped of double BOM and cleaned.');
