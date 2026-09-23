import { Logger } from '../../core/logger';

interface SocialChannel {
  id: string;
  name: string;
  enabled: boolean;
}

const channels: SocialChannel[] = [
  { id: 'tiktok', name: 'TikTok', enabled: true },
  { id: 'youtube', name: 'YouTube', enabled: true },
  { id: 'technophysical', name: 'Technophysical', enabled: true },
  { id: 'moneyplughub', name: 'MoneyPlugHub', enabled: true },
];

export const Social = {
  enabled() {
    return channels.filter(c => c.enabled);
  },

  pushToChannel(channelId: string, content: any) {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;

    Logger.info('SocialGraph pushing content', { channel: channelId, contentId: content.id });
  },
};
