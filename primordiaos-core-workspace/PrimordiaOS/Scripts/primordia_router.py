import asyncio
import websockets
import json
import requests

REALMS = {
    'unreal':  'ws://127.0.0.1:8080',
    'blender': 'ws://127.0.0.1:8081',
    'resolve': 'ws://127.0.0.1:8082'
}

JULES_API = 'https://api.jules.ai/v1/process'

async def send_ws(realm, event_type, payload):
    if realm not in REALMS:
        print(f'Unknown realm: {realm}')
        return

    msg = json.dumps({'type': event_type, 'payload': payload})

    try:
        async with websockets.connect(REALMS[realm]) as ws:
            await ws.send(msg)
    except Exception as e:
        print(f'WS error sending to {realm}: {e}')

def send_to_jules(frames, effect):
    encoded = []
    for f in frames:
        with open(f, 'rb') as fp:
            encoded.append(fp.read().hex())

    payload = {
        'effect': effect,
        'frames': encoded
    }

    try:
        r = requests.post(JULES_API, json=payload)
        return r.json()
    except Exception as e:
        return {'error': str(e)}

async def broadcast(event_type, payload):
    tasks = []
    for realm in REALMS.keys():
        tasks.append(send_ws(realm, event_type, payload))
    await asyncio.gather(*tasks)

async def route(event):
    realm = event.get('realm')
    event_type = event.get('type')
    payload = event.get('payload', {})

    if realm == 'jules':
        return send_to_jules(payload.get('frames', []), payload.get('effect'))

    elif realm == 'all':
        await broadcast(event_type, payload)
        return {'status': 'broadcasted'}

    else:
        await send_ws(realm, event_type, payload)
        return {'status': 'sent'}

async def primordia_loop():
    print('PrimordiaOS Router Online')
    while True:
        raw = input('PrimordiaOS> ')
        try:
            event = json.loads(raw)
            result = await route(event)
            print(result)
        except Exception as e:
            print(f'Router error: {e}')

if __name__ == '__main__':
    asyncio.run(primordia_loop())