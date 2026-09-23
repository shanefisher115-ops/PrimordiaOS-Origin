// ======================================================
// PRIMORDIAOS — COMMAND LINE INTERFACE (FULL IMPLEMENTATION)
// ======================================================
// Commands:
//   primordia agent:create <id> <sovereignty> <capabilities...>
//   primordia task:submit <agent> <realm> <payload>
//   primordia snapshot
//   primordia restore <file>
// ======================================================

import { PrimordiaOS } from "./PrimordiaOS";
import * as fs from "fs";

export class PrimordiaCLI {
    private os: PrimordiaOS;

    constructor(os: PrimordiaOS) {
        this.os = os;
    }

    async run(argv: string[]) {
        const [cmd, ...args] = argv;

        switch (cmd) {
            case "agent:create":
                return this.createAgent(args);

            case "task:submit":
                return this.submitTask(args);

            case "snapshot":
                return this.snapshot();

            case "restore":
                return this.restore(args);

            default:
                throw new Error(`Unknown command '${cmd}'`);
        }
    }

    // ------------------------------------------------------
    // AGENT CREATE
    // ------------------------------------------------------
    createAgent([id, sovereignty, ...caps]: string[]) {
        if (!id || !sovereignty) {
            throw new Error("Usage: primordia agent:create <id> <sovereignty> <capabilities...>");
        }

        const agent = this.os.agents.createAgent(id, sovereignty, caps);
        console.log(`Agent '${id}' created with sovereignty '${sovereignty}'`);
        return agent;
    }

    // ------------------------------------------------------
    // TASK SUBMIT
    // ------------------------------------------------------
    async submitTask([agent, realm, payload]: string[]) {
        if (!agent || !realm || !payload) {
            throw new Error("Usage: primordia task:submit <agent> <realm> <payload>");
        }

        const result = await this.os.submit(agent, realm, payload);
        console.log(`Task executed. Result:`);
        console.log(result);
        return result;
    }

    // ------------------------------------------------------
    // SNAPSHOT
    // ------------------------------------------------------
    snapshot() {
        const snap = this.os.snapshot();
        const file = `snapshot-${Date.now()}.json`;
        fs.writeFileSync(file, JSON.stringify(snap, null, 2));
        console.log(`Snapshot saved to ${file}`);
        return file;
    }

    // ------------------------------------------------------
    // RESTORE
    // ------------------------------------------------------
    restore([file]: string[]) {
        if (!file) {
            throw new Error("Usage: primordia restore <file>");
        }

        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        this.os.restore(data);

        console.log(`System restored from snapshot '${file}'`);
        return true;
    }
}
