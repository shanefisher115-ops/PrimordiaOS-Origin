export const GlobalTimeline = {
  write(event = {}) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      type: event.type || "system",
      title: event.title || "OS Milestone",
      summary: event.summary || "",
      data: event.data || {},
      icon: event.icon || "??"
    };
    if (typeof window !== "undefined" && window.PrimordiaOS) {
      if (!Array.isArray(window.PrimordiaOS.timeline)) window.PrimordiaOS.timeline = [];
      window.PrimordiaOS.timeline.push(entry);
    }
    console.log(`? [Global Timeline] Logged [${entry.type.toUpperCase()}]: ${entry.title}`);
    return entry;
  },
  getAll() {
    return (typeof window !== "undefined" && window.PrimordiaOS?.timeline) || [];
  }
};
