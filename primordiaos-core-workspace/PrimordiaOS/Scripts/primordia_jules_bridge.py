import requests
import json
import base64
import os

JULES_API = 'https://api.jules.ai/v1/process'

def encode_frame(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

def send_to_jules(frames, effect):
    encoded_frames = [encode_frame(f) for f in frames]

    payload = {
        'effect': effect,
        'frames': encoded_frames
    }

    response = requests.post(JULES_API, json=payload)
    try:
        return response.json()
    except:
        return {'error': 'Invalid response from Jules'}

def save_processed_frames(output_dir, processed):
    os.makedirs(output_dir, exist_ok=True)

    for i, frame_data in enumerate(processed.get('frames', [])):
        raw = base64.b64decode(frame_data)
        out_path = os.path.join(output_dir, f'jules_frame_{i}.png')
        with open(out_path, 'wb') as f:
            f.write(raw)

    return output_dir