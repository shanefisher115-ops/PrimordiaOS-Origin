import unreal
base = unreal.load_asset('/Game/Materials/BaseFX')
inst = unreal.MaterialEditingLibrary.create_material_instance(base, '/Game/Materials/Generated/PulseInst')
unreal.MaterialEditingLibrary.set_material_instance_scalar_parameter_value(inst, 'Glow', 1.0)