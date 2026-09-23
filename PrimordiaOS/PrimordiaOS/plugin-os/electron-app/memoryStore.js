// memoryStore.js — Persistent memory

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MEM_FILE = path.join(DATA_DIR, 'memory.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  if (!fs.existsSync(MEM_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(MEM_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function save(mem) {
  fs.writeFileSync(MEM_FILE, JSON.stringify(mem, null, 2), 'utf8');
}

let memory = load();

function set(key, value) {
  memory[key] = value;
  save(memory);
  return { ok: true };
}

function get(key) {
  return memory[key];
}

function list() {
  return memory;
}

function forget(key) {
  delete memory[key];
  save(memory);
  return { ok: true };
}

module.exports = {
  set,
  get,
  list,
  forget
};
