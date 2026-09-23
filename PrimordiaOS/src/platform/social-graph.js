import { Logger } from '../../core/logger';
const channels = [
    { id: 'tiktok', name: 'TikTok', enabled: true },
    { id: 'youtube', name: 'YouTube', enabled: true },
    { id: 'technophysical', name: 'Technophysical', enabled: true },
    { id: 'moneyplughub', name: 'MoneyPlugHub', enabled: true },
];
export const Social = {
    enabled() {
        return channels.filter(c => c.enabled);
    },
    pushToChannel(channelId, content) {
        const channel = channels.find(c => c.id === channelId);
        if (!channel)
            return;
        Logger.info('SocialGraph pushing content', { channel: channelId, contentId: content.id });
    },
};
