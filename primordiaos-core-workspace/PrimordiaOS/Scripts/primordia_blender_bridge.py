import bpy
import asyncio
import websockets
import json

async def primordia_loop():
    async with websockets.connect('ws://127.0.0.1:8081') as ws:
        while True:
            msg = json.loads(await ws.recv())
            route_event(msg['type'], msg['payload'])

def route_event(event_type, payload):
    if event_type == 'camera':
        cam = bpy.data.objects[payload['target']]
        cam.location = (payload['x'], payload['y'], payload['z'])

    elif event_type == 'lighting':
        light = bpy.data.objects[payload['target']]
        light.data.energy = payload['intensity']

    elif event_type == 'render':
        bpy.context.scene.render.filepath = payload['output']
        bpy.ops.render.render(write_still=True)

asyncio.run(primordia_loop())