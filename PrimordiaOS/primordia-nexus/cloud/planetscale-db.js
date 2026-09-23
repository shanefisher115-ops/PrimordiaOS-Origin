// cloud/planetscale-db.ts
// PrimordiaOS PlanetScale DB — full implementation
// MySQL-backed ledger + snapshot persistence
import mysql from "mysql2/promise";
export class PlanetScaleDB {
    conn;
    constructor() {
        this.conn = null;
    }
    async connect() {
        this.conn = await mysql.createConnection({
            host: "your-planetscale-host",
            user: "your-user",
            password: "your-password",
            database: "primordia"
        });
        console.log("[PlanetScaleDB] Connected.");
    }
    async saveLedgerEntry(entry) {
        await this.conn.execute("INSERT INTO ledger (id, ts, topic, payload) VALUES (?, ?, ?, ?)", [entry.id, entry.ts, entry.event.topic, JSON.stringify(entry.event.payload)]);
    }
    async saveSnapshot(snapshot) {
        await this.conn.execute("INSERT INTO snapshots (id, ts, nodes) VALUES (?, ?, ?)", [snapshot.id, snapshot.ts, JSON.stringify(snapshot.nodes)]);
    }
}
export const planetScaleDB = new PlanetScaleDB();
