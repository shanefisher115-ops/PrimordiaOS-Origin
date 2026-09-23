import bpy
import sys
import os

def composite_sequence(input_dir, output_file):
    files = sorted(
        f for f in os.listdir(input_dir)
        if f.lower().endswith((".png", ".jpg"))
    )
    if not files:
        print("No frames found")
        return

    bpy.ops.sequencer.new()
    seq = bpy.context.scene.sequence_editor
    seq.sequences.new_image(
        name="Frames",
        filepath=os.path.join(input_dir, files[0]),
        channel=1,
        frame_start=1
    )

    for i, f in enumerate(files[1:], start=2):
        seq.sequences["Frames"].elements.append(
            seq.sequences["Frames"].elements[0].__class__(
                filename=f
            )
        )

    bpy.context.scene.render.filepath = output_file
    bpy.context.scene.render.image_settings.file_format = 'FFMPEG'
    bpy.context.scene.render.ffmpeg.format = 'MPEG4'
    bpy.ops.render.render(animation=True)

if __name__ == "__main__":
    input_dir = sys.argv[-2]
    output_file = sys.argv[-1]
    composite_sequence(input_dir, output_file)
