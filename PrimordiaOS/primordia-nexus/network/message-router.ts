// network/message-router.ts
// PrimordiaOS Internal Message Router — full implementation
// Routes internal messages between subsystems with topic mapping

import { eventBus } from "../primordia-core/shared/event-bus";

export interface RouteRule {
    from: string;
    to: string;
    transform?: (payload: any) => any;
}

export class MessageRouter {
    private rules: RouteRule[];

    constructor() {
        this.rules = [];
    }

    addRule(rule: RouteRule) {
        this.rules.push(rule);

        eventBus.subscribe(rule.from, (event) => {
            const payload = rule.transform ? rule.transform(event.payload) : event.payload;
            eventBus.emit(rule.to, payload, "router");
        });
    }

    listRules() {
        return this.rules;
    }
}

export const messageRouter = new MessageRouter();

// Default routing rules
messageRouter.addRule({
    from: "vision.snapshot.created",
    to: "simulation.sync",
    transform: (p) => ({ nodes: p.nodes, ts: p.ts })
});

messageRouter.addRule({
    from: "pipeline.antigravity.output",
    to: "dashboard.pipeline",
});
