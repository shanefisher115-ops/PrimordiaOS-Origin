import asyncio
import json
import os

from primordia_router import send_ws, send_to_jules

UNREAL_REALM  = 'unreal'
BLENDER_REALM = 'blender'
RESOLVE_REALM = 'resolve'

def frames_in_dir(path):
    return [
        os.path.join(path, f)
        for f in sorted(os.listdir(path))
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.exr'))
    ]

async def roundtrip():
    # 1) Unreal: drive camera / lighting / FX
    await send_ws(
        UNREAL_REALM,
        'camera',
        {'target': 'PrimordiaCam', 'x': 0, 'y': 200, 'z': 150}
    )

    await send_ws(
        UNREAL_REALM,
        'lighting',
        {'target': 'PrimordiaLight', 'intensity': 5.0}
    )

    # 2) Blender: render offline frames
    await send_ws(
        BLENDER_REALM,
        'render',
        {'output': 'C:/PrimordiaOS/Roundtrip/blender_frames/frame_####.png'}
    )

    blender_dir = 'C:/PrimordiaOS/Roundtrip/blender_frames'
    blender_frames = frames_in_dir(blender_dir)

    # 3) Jules: enhance / cleanup
    jules_result = send_to_jules(blender_frames, 'cleanup')
    processed_dir = 'C:/PrimordiaOS/Roundtrip/jules_frames'

    from primordia_jules_bridge import save_processed_frames
    save_processed_frames(processed_dir, jules_result)

    processed_frames = frames_in_dir(processed_dir)

    # 4) Resolve: build timeline + render final
    for f in processed_frames:
        await send_ws(
            RESOLVE_REALM,
            'timeline_add_clip',
            {'path': f}
        )

    await send_ws(
        RESOLVE_REALM,
        'render',
        {'output': 'C:/PrimordiaOS/Roundtrip/final_output'}
    )

    # 5) Unreal: optional playback trigger
    await send_ws(
        UNREAL_REALM,
        'fx',
        {'target': 'PrimordiaFX', 'param': 'PlaybackTrigger', 'value': 1.0}
    )

if __name__ == '__main__':
    asyncio.run(roundtrip())