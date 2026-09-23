import { Logger } from '../../core/logger';
import { AgentCore } from './agentCore';
export const AgentMonitor = {
    status() {
        return AgentCore.all().map(a => ({
            id: a.id,
            realm: a.realm,
            status: 'OK'
        }));
    },
    log() {
        Logger.info('AgentMonitor status', this.status());
    }
};
