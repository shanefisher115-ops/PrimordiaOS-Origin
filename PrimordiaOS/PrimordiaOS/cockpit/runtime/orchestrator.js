function forwardToCockpit(event) {
  const data = JSON.stringify({
    panels: {
      eventBus: [event]
    }
  });

  const req = http.request(
    {
      hostname: "127.0.0.1",
      port: 3800,
      path: "/api/update",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
      }
    },
    res => {}
  );

  req.on("error", () => {
    console.log("[RUNTIME] Failed to forward event to Cockpit");
  });

  req.write(data);
  req.end();
}
