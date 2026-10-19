// Machine probes: is Unreal running, how long has the user been idle, free disk. Windows first; harmless elsewhere.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { statfs } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const run = (cmd, args, timeout = 15_000) => new Promise((resolve) => {
  execFile(cmd, args, { timeout, windowsHide: true, encoding: 'utf8' }, (err, stdout) => resolve(err ? '' : stdout));
});

export const UNREAL_PROCESSES = ['UnrealEditor.exe', 'UnrealEditor-Cmd.exe', 'UE4Editor.exe'];

/** Names (lowercase) of running processes from `names`. */
export async function running(names = UNREAL_PROCESSES) {
  if (process.platform !== 'win32') return [];
  const out = (await run('tasklist', ['/NH', '/FO', 'CSV'])).toLowerCase();
  return names.filter((n) => out.includes(`"${n.toLowerCase()}"`));
}

let cached = { at: 0, value: false };
export async function unrealRunning(maxAgeMs = 60_000) {
  if (Date.now() - cached.at < maxAgeMs) return cached.value;
  cached = { at: Date.now(), value: (await running()).length > 0 };
  return cached.value;
}

/** Seconds since the last keyboard/mouse input in this session (GetLastInputInfo), or null if unknown. */
export async function idleSeconds() {
  if (process.platform !== 'win32') return null;
  const ps = 'Add-Type -TypeDefinition \'using System;using System.Runtime.InteropServices;public static class Idle{[StructLayout(LayoutKind.Sequential)]struct L{public uint s;public uint t;}[DllImport("user32.dll")]static extern bool GetLastInputInfo(ref L l);public static uint Ms(){L l=new L();l.s=8;GetLastInputInfo(ref l);return (uint)Environment.TickCount-l.t;}}\'; [Idle]::Ms()';
  // -EncodedCommand: no command-line quoting to get wrong between Node and Windows PowerShell 5.1.
  const encoded = Buffer.from(ps, 'utf16le').toString('base64');
  const exe = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const out = (await run(existsSync(exe) ? exe : 'pwsh', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded])).trim();
  const ms = Number(out);
  return Number.isFinite(ms) && out !== '' ? Math.round(ms / 1000) : null;
}

export async function freeDiskGB(dir) {
  try { const s = await statfs(dir); return (s.bavail * s.bsize) / 1e9; } catch { return null; }
}

export const freeRamGB = () => os.freemem() / 1e9;
