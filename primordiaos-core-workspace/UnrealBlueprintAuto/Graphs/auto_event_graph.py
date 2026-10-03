import unreal

bp = unreal.EditorAssetLibrary.load_asset('/Game/BP_PrimordiaBridge')
graph = bp.get_editor_property('event_graph')
unreal.log('Auto Event Graph Generator Ready')