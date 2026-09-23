import { Logger } from '../../core/logger';
import { Social } from '../platform/social-graph';
const jobs = [];
export const autopost = {
    schedule(contentId, channel) {
        const job = {
            id: `autopost_${Date.now()}`,
            contentId,
            channel,
            scheduledAt: new Date().toISOString(),
        };
        jobs.push(job);
        Logger.info('Autopost scheduled job', job);
    },
    run(jobId) {
        const job = jobs.find(j => j.id === jobId);
        if (!job)
            return;
        Logger.info('Autopost running job', job);
        Social.pushToChannel(job.channel, { id: job.contentId });
    },
    all() {
        return jobs;
    },
};
