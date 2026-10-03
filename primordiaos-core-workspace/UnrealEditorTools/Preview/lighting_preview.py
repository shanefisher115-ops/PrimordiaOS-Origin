import unreal
light = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0,0,0))
light.set_editor_property('intensity', 8)