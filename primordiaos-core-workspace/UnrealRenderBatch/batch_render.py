import unreal

queue = unreal.MoviePipelineQueue()
subsystem = unreal.get_editor_subsystem(unreal.MoviePipelineQueueEngineSubsystem)

jobs = [
  '/Game/AutoSequence',
  '/Game/AutoSequence2',
  '/Game/AutoSequence3'
]

for seq in jobs:
  job = queue.allocate_job(seq)
  job.output_resolution = unreal.IntPoint(1920, 1080)
  job.file_type = 'EXR'

subsystem.render(queue)