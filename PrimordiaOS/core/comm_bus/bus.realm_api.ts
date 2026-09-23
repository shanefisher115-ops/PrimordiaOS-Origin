export const RealmAPI = {
  windows: {
    sendMessage(agentId: string, payload: any) {
      globalThis.WINDOWS_REALM.send(agentId, payload);
    },
    sendRPC(agentId: string, rpc: any) {
      globalThis.WINDOWS_REALM.rpc(agentId, rpc);
    }
  },

  cloud: {
    sendMessage(agentId: string, payload: any) {
      globalThis.CLOUD_REALM.send(agentId, payload);
    },
    sendRPC(agentId: string, rpc: any) {
      globalThis.CLOUD_REALM.rpc(agentId, rpc);
    }
  },

  termux: {
    sendMessage(agentId: string, payload: any) {
      globalThis.TERMUX_REALM.send(agentId, payload);
    },
    sendRPC(agentId: string, rpc: any) {
      globalThis.TERMUX_REALM.rpc(agentId, rpc);
    }
  }
};
