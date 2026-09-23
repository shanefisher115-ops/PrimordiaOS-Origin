#!/bin/bash

echo "Creating PrimordiaUnreal directory structure..."

# Root
mkdir -p PrimordiaUnreal

# Subfolders
mkdir -p PrimordiaUnreal/WebSocket
mkdir -p PrimordiaUnreal/Blueprints
mkdir -p PrimordiaUnreal/Niagara
mkdir -p PrimordiaUnreal/Events
mkdir -p PrimordiaUnreal/WorldCommands

# Event JSON files
touch PrimordiaUnreal/Events/primordia_events.json
touch PrimordiaUnreal/Events/agent_state.json
touch PrimordiaUnreal/Events/metric_stream.json
touch PrimordiaUnreal/Events/pulse_update.json
touch PrimordiaUnreal/Events/evolution_patch.json

# World commands
cat <<EOF > PrimordiaUnreal/WorldCommands/world_commands.json
{
  "commands": [
    { "name": "SpawnPulse", "intensity": 1.0 },
    { "name": "SpawnAgent", "energy": 0.8 },
    { "name": "TriggerShockwave", "radius": 5.0 }
  ]
}
EOF

# WebSocket schema
cat <<EOF > PrimordiaUnreal/WebSocket/primordia_event_schema.ts
export interface PrimordiaEvent {
  type: string;
  timestamp: number;
  payload: any;
}
EOF

# Niagara parameter map
cat <<EOF > PrimordiaUnreal/Niagara/niagara_parameter_map.txt
AgentEnergy → float
PulseWave → float
MetricStream → float
EvolutionBurst → float
PostShockwave → float
EOF

# Blueprint plan
cat <<EOF > PrimordiaUnreal/Blueprints/BP_EngineController_plan.md
# Blueprint Engine Controller Plan

- Event BeginPlay
- Create WebSocket connection
- OnMessage → Parse JSON
- Switch on 'type'
- Set Niagara parameters
- Trigger particle bursts
- Trigger world commands
EOF

###############################################
# PrimordiaOverlay (Next.js + WebGPU layer)
###############################################

mkdir -p PrimordiaOverlay/components
mkdir -p PrimordiaOverlay/webgpu
mkdir -p PrimordiaOverlay/hud

# Overlay component
cat <<EOF > PrimordiaOverlay/components/PulseHUD.tsx
export default function PulseHUD({ pulse }) {
  return (
    <div className="pulse-hud">
      <span>PULSE: {pulse}</span>
    </div>
  );
}
EOF

# Control room layout
cat <<EOF > PrimordiaOverlay/control_room_layout.md
# Cosmic Control Room Layout

- Central nebula
- Agent orbit rings
- Metric streams
- Evolution fractal wall
- Shockwave horizon
- VR interaction nodes
EOF

###############################################
# Pixel Streaming Server
###############################################

mkdir -p PixelStreamServer

touch PixelStreamServer/start_server.sh
touch PixelStreamServer/config.json

echo "PrimordiaUnreal setup complete."
