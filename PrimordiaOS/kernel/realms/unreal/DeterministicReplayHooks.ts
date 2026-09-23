export class DeterministicReplayHooks {
    static logRPC(taskId: string, rpc: any, ledger: any) {
        ledger.write("unreal_rpc", {
            taskId,
            rpc,
            timestamp: Date.now()
        });
    }
}
