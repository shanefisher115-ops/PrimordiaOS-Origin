import unreal
fx = unreal.load_asset('/Game/FX/PulseWave')
unreal.NiagaraFunctionLibrary.spawn_system_at_location(unreal.EditorLevelLibrary.get_editor_world(), fx, unreal.Vector(0,0,0))