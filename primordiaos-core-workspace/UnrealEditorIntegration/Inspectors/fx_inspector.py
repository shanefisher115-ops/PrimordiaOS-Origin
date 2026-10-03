import unreal, json
meta = json.load(open('UnrealFX/fx_meta.json'))
unreal.log('FX Inspector Loaded')
unreal.log(meta)