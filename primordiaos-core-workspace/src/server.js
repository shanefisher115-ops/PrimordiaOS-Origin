const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { TensorEquilibriumController } = require('./core/tensor-equilibrium');
const { TelemetryJournal } = require('./core/telemetry-journal');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const controller = new TensorEquilibriumController();
const journal = new TelemetryJournal();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/telemetry', (req, res) => {
    const logs = journal.getRecent(100);
    res.json({ success: true, count: logs.length, data: logs });
});

app.post('/api/tune', (req, res) => {
    const { bField } = req.body;
    if (typeof bField === 'number') {
        controller.tuneInduction(bField);
        res.json({ success: true, bField: controller.bFieldInduction });
    } else {
        res.status(400).json({ success: false, error: 'Invalid B-Field value' });
    }
});

controller.on('equilibrium-confirmed', (data) => {
    journal.record('EQUILIBRIUM_CONFIRMED', data);
    io.emit('tensor-telemetry', data);
});

controller.on('equilibrium-loss', (data) => {
    journal.record('EQUILIBRIUM_LOSS', data);
    io.emit('tensor-telemetry', data);
});

controller.on('cosmic-axiom', (data) => {
    journal.record('COSMIC_AXIOM', data);
    io.emit('cosmic-axiom', data);
    console.log(`[COSMIC AXIOM ETCHED] ${data.message}`);
});

server.listen(PORT, () => {
    console.log(`[PRIMORDIA] Telemetry bridge active on port ${PORT}`);
});