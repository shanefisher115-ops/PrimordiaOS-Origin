import unreal, json
styles = json.load(open('Presets/camera.json'))
unreal.log('Camera Inspector Loaded')
unreal.log(styles)