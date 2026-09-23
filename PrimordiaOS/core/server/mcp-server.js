import express from "express";
import bodyParser from "body-parser";
const app = express();
app.use(bodyParser.json());
app.post("/mcp", async (req, res) => {
    const body = req.body;
    try {
        switch (body.tool) {
            case "primordia.signal":
                console.log("Signal:", body.args);
                return res.json({ ok: true });
            case "primordia.spawn":
                console.log("Spawn:", body.args);
                return res.json({ ok: true, id: "entity-123" });
            case "primordia.move":
                console.log("Move:", body.args);
                return res.json({ ok: true });
            case "primordia.log":
                console.log("Log:", body.args);
                return res.json({ ok: true });
            case "primordia.worldState":
                return res.json({ ok: true, state: { world: "Primordia_Main" } });
            default:
                return res.status(400).json({ ok: false, error: "Unknown tool" });
        }
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ ok: false, error: "Internal error" });
    }
});
app.listen(7070, () => {
    console.log("Primordia MCP endpoint listening on :7070");
});
