# PrimordiaOS Cockpit UI

Cockpit UI is the mission control visualization panel for PrimordiaOS. It provides real-time monitoring of all autonomous branches.

## Government Visualization Panel

The Government Panel (`/government`) provides a physical mapping of the constitutional government of the OS.

### Branches Shown
- **Advisory Council**: The cognitive branch (AI advisors and strategy).
- **Court Realm**: The judicial branch handling verdicts and drift alerts.
- **Guardian Realm**: The safety branch managing Safe Mode and quarantines.
- **Autonomy Layer**: The constitutional decision engine and operation mode controller.
- **Constitution**: The legal seal verifying actions and tracking violations.
- **Kernel**: The executive branch handling safe execution and rollbacks.

### Metrics Displayed
- Active cases, anomalies, safe mode status, current autonomy mode, active constitutional violations, last verified consensus, last verdict, and last execution. 

### Event Visualization
- Nodes pulse when active events are occurring (e.g., drift alerts, anomalies).
- Status changes in real-time via WebSocket connections to the Message Bus.
- Connections between components represent information flows from the Advisory Council down to the Kernel.

### Constitutional Violations
- Highlighted in **Red** (`#FF4444`) with animated pulsing borders to draw immediate attention.
- Safe Mode triggers visually push the Guardian Realm into an alert state.

## Routing
- `/` - Dashboard
- `/government` - System Government
- `/court` - Court Realm
- `/guardian` - Guardian
- `/constitution` - Constitution
