// primordiaos/command-bus/bus.ts

import { Memory } from "../memory/schema";

type CommandFn = () => Promise<any>;

interface CommandRegistry {
  [name: string]: CommandFn;
}

interface SequenceRegistry {
  [name: string]: string[];
}

export class CommandBus {
  private static commands: CommandRegistry = {};
  private static sequences: SequenceRegistry = {};

  // Register a single command
  static register(name: string, fn: CommandFn) {
    CommandBus.commands[name] = fn;
  }

  // Register a multi-step sequence
  static registerSequence(name: string, steps: CommandFn[]) {
    CommandBus.sequences[name] = steps.map((fn) => {
      const key = CommandBus.findCommandName(fn);
      if (!key) throw new Error("Command must be registered before sequencing");
      return key;
    });
  }

  // Helper: find command name by reference
  private static findCommandName(fn: CommandFn): string | null {
    for (const key of Object.keys(CommandBus.commands)) {
      if (CommandBus.commands[key] === fn) return key;
    }
    return null;
  }

  // Retrieve a command by name
  static get(name: string): CommandFn | null {
    return CommandBus.commands[name] || null;
  }

  // Run a single command
  static async runCommand(name: string) {
    const cmd = CommandBus.get(name);
    if (!cmd) throw new Error(`Command not found: ${name}`);
    return await cmd();
  }

  // Run a full sequence
  static async run(name: string) {
    const steps = CommandBus.sequences[name];
    if (!steps) throw new Error(`Sequence not found: ${name}`);

    for (const stepName of steps) {
      const cmd = CommandBus.get(stepName);
      if (!cmd) throw new Error(`Command not found: ${stepName}`);

      const result = await cmd();
      Memory.set(`last_${stepName}`, result);
    }

    return true;
  }
}
