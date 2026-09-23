import { RealmEvent } from "../realms/realm-events";

export const MissionHubNotifications = {
  list: [],

  push(type, message) {
    const note = {
      id: Date.now(),
      type,
      message,
      time: new Date().toLocaleTimeString()
    };

    this.list.push(note);

    // Keep last 50 notifications
    if (this.list.length > 50) {
      this.list.shift();
    }

    RealmEvent.emit("missionhub.notification", note);
    console.log("[MissionHubNotifications]", note);
  },

  getAll() {
    return this.list.slice().reverse();
  }
};
