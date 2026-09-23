// primordiaos/command-bus/bus.ts
import { Memory } from "../memory/schema";
export class CommandBus {
    static commands = {};
    static sequences = {};
    // Register a single command
    static register(name, fn) {
        CommandBus.commands[name] = fn;
    }
    // Register a multi-step sequence
    static registerSequence(name, steps) {
        CommandBus.sequences[name] = steps.map((fn) => {
            const key = CommandBus.findCommandName(fn);
            if (!key)
                throw new Error("Command must be registered before sequencing");
            return key;
        });
    }
    // Helper: find command name by reference
    static findCommandName(fn) {
        for (const key of Object.keys(CommandBus.commands)) {
            if (CommandBus.commands[key] === fn)
                return key;
        }
        return null;
    }
    // Retrieve a command by name
    static get(name) {
        return CommandBus.commands[name] || null;
    }
    // Run a single command
    static async runCommand(name) {
        const cmd = CommandBus.get(name);
        if (!cmd)
            throw new Error(`Command not found: ${name}`);
        return await cmd();
    }
    // Run a full sequence
    static async run(name) {
        const steps = CommandBus.sequences[name];
        if (!steps)
            throw new Error(`Sequence not found: ${name}`);
        for (const stepName of steps) {
            const cmd = CommandBus.get(stepName);
            if (!cmd)
                throw new Error(`Command not found: ${stepName}`);
            const result = await cmd();
            Memory.set(`last_${stepName}`, result);
        }
        return true;
    }
}
