import unreal, json
styles = json.load(open('Presets/lighting.json'))
unreal.log('Lighting Inspector Loaded')
unreal.log(styles)