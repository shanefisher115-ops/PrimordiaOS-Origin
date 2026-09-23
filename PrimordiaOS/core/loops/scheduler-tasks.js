export const scheduleAutopost = () => {
    cron.schedule("*/30 * * * *", () => {
        autopost("tiktok", nextPayload());
        autopost("instagram", nextPayload());
        autopost("youtube", nextPayload());
    });
};
