import { Logger } from '../../core/logger';
import { Social } from '../platform/social-graph';

interface AutopostJob {
  id: string;
  contentId: string;
  channel: string;
  scheduledAt: string;
}

const jobs: AutopostJob[] = [];

export const autopost = {
  schedule(contentId: string, channel: string) {
    const job: AutopostJob = {
      id: `autopost_${Date.now()}`,
      contentId,
      channel,
      scheduledAt: new Date().toISOString(),
    };

    jobs.push(job);
    Logger.info('Autopost scheduled job', job);
  },

  run(jobId: string) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    Logger.info('Autopost running job', job);
    Social.pushToChannel(job.channel, { id: job.contentId });
  },

  all() {
    return jobs;
  },
};
