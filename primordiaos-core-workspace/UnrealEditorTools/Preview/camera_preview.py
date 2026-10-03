import unreal
cam = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(0,0,0))
cam.set_editor_property('current_focal_length', 85)