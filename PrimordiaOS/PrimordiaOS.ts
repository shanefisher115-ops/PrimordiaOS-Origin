import { AutonomySpine } from "./kernel/autonomy-spine/AutonomySpine";
import { TrustKernel } from "./kernel/trust-kernel/TrustKernel";
import { RealmRegistry } from "./kernel/realms/RealmRegistry";
import { RealmProtocol } from "./kernel/realms/protocol/RealmProtocol";
import { AgentLifecycle } from "./kernel/agents/AgentLifecycle";

export class PrimordiaOS {
    autonomy = new AutonomySpine();
    trust = new TrustKernel();
    realms = new RealmRegistry();
    protocol = new RealmProtocol();
    agents = new AgentLifecycle();

    async submit(agentId: string, realm: string, payload: any, risk: number = 1) {
        const task = this.agents.submitTask(agentId, realm, payload, risk);

        const safe = this.autonomy.governor.validate(task);
        if (!safe.allowed) throw new Error(`Safety violation: ${safe.reason}`);

        const sdc = this.trust.sdc.validate(task);
        if (!sdc.allowed) throw new Error(`SDC violation: ${sdc.reason}`);

        const result = await this.autonomy.submitTask(task);

        this.trust.recordAttribution(task.id, task.lineage);
        this.trust.graph.addNode(task.id, "task", task);
        this.trust.graph.addEdge(task.agent, task.id, "submitted");
        this.trust.ledger.write("task_result", result);

        return result;
    }

    snapshot() {
        const state = this.autonomy.state.snapshot();
        const events = this.autonomy.bus.getLog();
        return this.trust.snapshot(state, events);
    }

    restore(snapshot: any) {
        const restored = this.trust.restore(snapshot);
        this.autonomy.state.restore(restored.state);
        this.autonomy.bus.clearLog();
        restored.events.forEach(e => this.autonomy.bus.emit(e.type, e.data));
    }
}
