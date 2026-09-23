import { Logger } from '../core/logger';
export class UnrealBridge {
    async sendCommand(command, payload) {
        Logger.info('UnrealBridge command sent', { command, payload });
        // Placeholder: integrate with Unreal Dedicated Server
        return { success: true };
    }
}
export const unrealBridge = new UnrealBridge();
