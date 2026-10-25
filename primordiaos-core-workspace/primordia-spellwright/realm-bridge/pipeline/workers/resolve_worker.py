"""PrimordiaOS DaVinci Resolve worker.

    python resolve_worker.py --job job.json      run one job against the running Resolve
    python resolve_worker.py --watch <folder>    process every *.job.json dropped into a folder
                                                 (run this from Resolve: Workspace > Scripts)

A job (written by the Bolt server from UPrimordiaDaVinciSubsystem::JobToJson):
    {"project": "Primordia", "timeline": "Shot", "fps": 30,
     "stages": ["assemble", "grade", "render"],
     "clips": [{"path": "C:/r/frame_%04d.png", "sequenceStart": 1, "sequenceEnd": 120, "track": 1}],
     "grade": {"lut": "", "cdl": true, "slope": [1,1,1], "offset": [0,0,0], "power": [1,1,1], "saturation": 1, "node": 1},
     "render": {"targetDir": "C:/out", "name": "shot", "format": "mp4", "codec": "H264", "preset": ""}}

Output is JSON lines on stdout: {"progress": 0.4, "message": "..."} while working, then exactly one
{"result": {...}} or {"error": "..."}. Exit code 0 on success.

Resolve must be running. External scripts need Preferences > System > General > "External
scripting using: Local" (a DaVinci Resolve Studio setting; in the free edition run this file from
Workspace > Scripts with --watch instead).
"""

import argparse
import glob
import json
import os
import sys
import time


def emit(**msg):
    print(json.dumps(msg), flush=True)


def progress(p, message):
    emit(progress=round(max(0.0, min(1.0, p)), 3), message=message)


class JobError(Exception):
    pass


def connect():
    """The Resolve app object, from inside Resolve or through the external scripting module."""
    host = globals().get("resolve") or globals().get("app")
    if host is not None:
        r = host if hasattr(host, "GetProjectManager") else host.GetResolve()
        if r is not None:
            return r
    try:
        import DaVinciResolveScript as dvr
    except ImportError as exc:
        api = os.environ.get("RESOLVE_SCRIPT_API", "")
        raise JobError(f"cannot import DaVinciResolveScript ({exc}); set RESOLVE_SCRIPT_API (now '{api}') and add its Modules folder to PYTHONPATH")
    resolve = dvr.scriptapp("Resolve")
    if resolve is None:
        raise JobError("DaVinci Resolve is not running, or external scripting is off "
                       "(Preferences > System > General > External scripting using: Local)")
    return resolve


def open_project(resolve, name, fps):
    pm = resolve.GetProjectManager()
    current = pm.GetCurrentProject()
    if current is not None and current.GetName() == name:
        project = current
    else:
        project = pm.LoadProject(name) or pm.CreateProject(name)
    if project is None:
        raise JobError(f"could not open or create project '{name}' (is another project modal, or the name invalid?)")
    if fps and project.GetTimelineCount() == 0:
        # The frame rate is fixed once a timeline exists.
        project.SetSetting("timelineFrameRate", str(fps))
    return pm, project


def find_timeline(project, name):
    for i in range(1, project.GetTimelineCount() + 1):
        tl = project.GetTimelineByIndex(i)
        if tl is not None and tl.GetName() == name:
            return tl
    return None


def stage_assemble(project, job):
    pool = project.GetMediaPool()
    clips = job.get("clips") or []
    if not clips:
        raise JobError("assemble needs clips")
    name = job.get("timeline") or "Primordia"
    old = find_timeline(project, name)
    if old is not None:
        pool.DeleteTimelines([old])
    timeline = pool.CreateEmptyTimeline(name)
    if timeline is None:
        raise JobError(f"could not create timeline '{name}'")
    project.SetCurrentTimeline(timeline)

    placed = 0
    for i, clip in enumerate(clips):
        path = clip["path"]
        info = {"FilePath": path}
        if clip.get("sequenceStart", -1) >= 0:
            info["StartIndex"] = int(clip["sequenceStart"])
            info["EndIndex"] = int(clip["sequenceEnd"])
        items = pool.ImportMedia([info]) or pool.ImportMedia([path])
        if not items:
            raise JobError(f"Resolve could not import {path}")
        for item in items:
            append = {"mediaPoolItem": item, "trackIndex": int(clip.get("track", 1))}
            if clip.get("in", -1) >= 0:
                append["startFrame"] = int(clip["in"])
            if clip.get("out", -1) >= 0:
                append["endFrame"] = int(clip["out"])
            if clip.get("record", -1) >= 0:
                append["recordFrame"] = int(clip["record"])
            if clip.get("audio"):
                append["mediaType"] = 2
            if not pool.AppendToTimeline([append]):
                raise JobError(f"could not place {path} on the timeline")
            placed += 1
        progress(0.1 + 0.3 * (i + 1) / len(clips), f"placed {os.path.basename(path)}")
    return {"timeline": name, "clips": placed}


def stage_grade(project, job):
    name = job.get("timeline") or "Primordia"
    timeline = find_timeline(project, name)
    if timeline is None:
        raise JobError(f"no timeline '{name}' in project {project.GetName()} to grade")
    project.SetCurrentTimeline(timeline)
    g = job.get("grade") or {}
    node = int(g.get("node", 1))
    lut = g.get("lut") or ""
    if lut and not os.path.isfile(lut):
        raise JobError(f"LUT {lut} does not exist")
    rgb = lambda v, d: " ".join(f"{float(x):.4f}" for x in (v or d))
    cdl = {
        "NodeIndex": node,
        "Slope": rgb(g.get("slope"), [1, 1, 1]),
        "Offset": rgb(g.get("offset"), [0, 0, 0]),
        "Power": rgb(g.get("power"), [1, 1, 1]),
        "Saturation": float(g.get("saturation", 1.0)),
    }
    graded = failed = 0
    for track in range(1, timeline.GetTrackCount("video") + 1):
        for item in timeline.GetItemListInTrack("video", track) or []:
            ok = True
            if lut:
                ok &= bool(item.SetLUT(node, lut))
            if g.get("cdl", True):
                ok &= bool(item.SetCDL(cdl))
            graded += 1 if ok else 0
            failed += 0 if ok else 1
    if graded == 0:
        raise JobError("no clip accepted the grade" + (f" ({failed} refused)" if failed else " (the timeline is empty)"))
    progress(0.5, f"graded {graded} clips")
    return {"graded": graded, "refused": failed}


def stage_render(project, job):
    name = job.get("timeline") or "Primordia"
    timeline = find_timeline(project, name)
    if timeline is None:
        raise JobError(f"no timeline '{name}' to render")
    project.SetCurrentTimeline(timeline)
    r = job.get("render") or {}
    target = r.get("targetDir") or os.path.join(os.path.expanduser("~"), "Videos", "Primordia")
    os.makedirs(target, exist_ok=True)
    if r.get("preset") and not project.LoadRenderPreset(r["preset"]):
        raise JobError(f"no render preset '{r['preset']}'")
    fmt, codec = r.get("format") or "mp4", r.get("codec") or "H264"
    if not project.SetCurrentRenderFormatAndCodec(fmt, codec):
        raise JobError(f"Resolve does not offer {fmt}/{codec} here")
    custom = r.get("name") or name
    settings = {"SelectAllFrames": True, "TargetDir": target, "CustomName": custom}
    if r.get("width") and r.get("height"):
        settings.update(FormatWidth=int(r["width"]), FormatHeight=int(r["height"]))
    if not project.SetRenderSettings(settings):
        raise JobError("Resolve refused the render settings")
    started = time.time()
    job_id = project.AddRenderJob()
    if not job_id:
        raise JobError("could not add a render job")
    if not project.StartRendering([job_id]):
        raise JobError("rendering did not start")
    while project.IsRenderingInProgress():
        status = project.GetRenderJobStatus(job_id) or {}
        pct = float(status.get("CompletionPercentage", 0)) / 100.0
        progress(0.55 + 0.4 * pct, f"rendering {pct * 100:.0f}%")
        time.sleep(1.0)
    status = project.GetRenderJobStatus(job_id) or {}
    state = status.get("JobStatus", "")
    if state and state.lower() not in ("complete", "completed"):
        raise JobError(f"render ended as '{state}': {status.get('Error', '')}")
    outputs = sorted((p for p in glob.glob(os.path.join(target, custom + "*")) if os.path.getmtime(p) >= started - 1),
                     key=os.path.getmtime)
    if not outputs:
        raise JobError(f"the render finished but nothing named {custom}* appeared in {target}")
    return {"output": outputs[-1], "targetDir": target, "renderSeconds": round(time.time() - started, 1)}


def run(job):
    stages = job.get("stages") or ["assemble", "grade", "render"]
    unknown = set(stages) - {"assemble", "grade", "render"}
    if unknown:
        raise JobError(f"unknown stages {sorted(unknown)}")
    resolve = connect()
    progress(0.02, f"connected to {resolve.GetProductName()} {resolve.GetVersionString()}")
    pm, project = open_project(resolve, job.get("project") or "Primordia", job.get("fps"))
    result = {"project": project.GetName(), "timeline": job.get("timeline") or "Primordia"}
    if "assemble" in stages:
        result.update(stage_assemble(project, job))
    if "grade" in stages:
        result.update(stage_grade(project, job))
    if "render" in stages:
        resolve.OpenPage("deliver")
        result.update(stage_render(project, job))
    pm.SaveProject()
    progress(1.0, "done")
    return result


def run_file(path):
    with open(path, encoding="utf-8-sig") as f:
        job = json.load(f)
    return run(job)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--job", help="job JSON file")
    ap.add_argument("--watch", help="folder of *.job.json files to process")
    args = ap.parse_args()
    if args.watch:
        os.makedirs(args.watch, exist_ok=True)
        emit(message=f"watching {args.watch}")
        while True:
            for path in sorted(glob.glob(os.path.join(args.watch, "*.job.json"))):
                out = path[:-len(".job.json")] + ".result.json"
                try:
                    body = {"result": run_file(path)}
                except Exception as exc:
                    body = {"error": str(exc)}
                with open(out, "w", encoding="utf-8") as f:
                    json.dump(body, f)
                os.replace(path, path + ".done")
                emit(message=f"{os.path.basename(path)}: {'ok' if 'result' in body else body['error']}")
            time.sleep(2.0)
    if not args.job:
        ap.error("--job or --watch is required")
    try:
        emit(result=run_file(args.job))
        return 0
    except JobError as exc:
        emit(error=str(exc))
        return 1
    except Exception as exc:
        emit(error=f"{type(exc).__name__}: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
