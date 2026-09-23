// src/live/security/token-vault.ts

import fs from "fs"
import path from "path"

const VAULT_PATH = path.join(process.cwd(), "primordia-token-vault.json")

interface TokenRecord {
  service: string
  data: Record<string, string>
  updatedAt: number
}

interface VaultData {
  tokens: TokenRecord[]
}

function loadVault(): VaultData {
  if (!fs.existsSync(VAULT_PATH)) {
    return { tokens: [] }
  }
  try {
    const raw = fs.readFileSync(VAULT_PATH, "utf8")
    return JSON.parse(raw)
  } catch {
    return { tokens: [] }
  }
}

function saveVault(vault: VaultData) {
  fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2), "utf8")
}

export function getToken(service: string): TokenRecord | null {
  const vault = loadVault()
  return vault.tokens.find((t) => t.service === service) || null
}

export function setToken(service: string, data: Record<string, string>) {
  const vault = loadVault()
  const existingIndex = vault.tokens.findIndex((t) => t.service === service)

  const record: TokenRecord = {
    service,
    data,
    updatedAt: Date.now()
  }

  if (existingIndex >= 0) {
    vault.tokens[existingIndex] = record
  } else {
    vault.tokens.push(record)
  }

  saveVault(vault)

  console.log(
    `[TokenVault] Stored token for service="${service}" (keys=${Object.keys(
      data
    ).join(", ")})`
  )
}
