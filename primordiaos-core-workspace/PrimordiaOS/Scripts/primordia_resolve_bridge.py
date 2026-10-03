import DaVinciResolveScript as dvr
import asyncio
import websockets
import json

resolve = dvr.scriptapp('Resolve')
pm = resolve.GetProjectManager()
project = pm.GetCurrentProject()

async def primordia_loop():
    async with websockets.connect('ws://127.0.0.1:8082') as ws:
        while True:
            msg = json.loads(await ws.recv())
            route_event(msg['type'], msg['payload'])

def route_event(event_type, payload):
    if event_type == 'timeline_add_clip':
        timeline = project.GetCurrentTimeline()
        if not timeline:
            timeline = project.CreateTimeline('PrimordiaTimeline')
            project.SetCurrentTimeline(timeline)

        clip_path = payload['path']
        timeline.InsertClips([clip_path])

    elif event_type == 'render':
        output_dir = payload['output']
        project.SetRenderSettings({'TargetDir': output_dir})
        project.AddRenderJob()
        project.StartRendering()

    elif event_type == 'grade':
        timeline = project.GetCurrentTimeline()
        if not timeline:
            return

        index = payload.get('index', 0)
        items = timeline.GetItemListInTrack('video', 1)
        if 0 <= index < len(items):
            clip = items[index]
            grade_file = payload['grade_file']
            clip.ApplyGradeFromFile(grade_file)

asyncio.run(primordia_loop())