import unreal
job = unreal.MoviePipelineQueueEngineSubsystem().allocate_job('/Game/EditorSequence')
job.output_resolution = unreal.IntPoint(1920, 1080)
unreal.MoviePipelineQueueEngineSubsystem().render(job)