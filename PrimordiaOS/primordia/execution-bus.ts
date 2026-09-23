// primordia/execution-bus.ts

import { RealmRegistry } from "./realm-registry"

export type PrimordiaTask = {
  realm: string
  agent: string
  payload: any
}

export const ExecutionBus = {
  async dispatch(task: PrimordiaTask) {
    const realm = RealmRegistry[task.realm]
    if (!realm) throw new Error(`Realm ${task.realm} not found`)

    const agent = realm.agents[task.agent]
    if (!agent) throw new Error(`Agent ${task.agent} not found in realm ${task.realm}`)

    return agent.run(task.payload)
  }
}
