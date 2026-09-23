// primordia/realm-registry.ts

export type PrimordiaAgent = {
  id: string
  run: (payload: any) => Promise<any>
}

export type PrimordiaRealm = {
  id: string
  agents: Record<string, PrimordiaAgent>
}

export const RealmRegistry: Record<string, PrimordiaRealm> = {
  earth: { id: "earth", agents: {} },
  cloud: { id: "cloud", agents: {} },
  orbital: { id: "orbital", agents: {} },
  science: { id: "science", agents: {} },
  education: { id: "education", agents: {} },
  entertainment: { id: "entertainment", agents: {} },
  manufacturing: { id: "manufacturing", agents: {} },
  monetization: { id: "monetization", agents: {} },
  creator: { id: "creator", agents: {} }
}

// Register an agent into any realm
export function registerAgent(
  realmId: string,
  agent: PrimordiaAgent
) {
  const realm = RealmRegistry[realmId]
  if (!realm) throw new Error(`Realm ${realmId} does not exist`)
  realm.agents[agent.id] = agent
}
