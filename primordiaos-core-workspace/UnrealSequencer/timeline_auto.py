import unreal

seq = unreal.LevelSequenceFactoryNew().factory_create_new('/Game/AutoSequence')
track = seq.add_master_track(unreal.MovieSceneCameraCutTrack)
cut = track.add_section()
cut.set_start_frame(0)
cut.set_end_frame(240)