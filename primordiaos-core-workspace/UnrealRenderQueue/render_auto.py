import unreal

job = unreal.MoviePipelineQueueEngineSubsystem().allocate_job('/Game/AutoSequence')
job.output_resolution = unreal.IntPoint(1920, 1080)
job.file_type = 'EXR'
unreal.MoviePipelineQueueEngineSubsystem().render(job)