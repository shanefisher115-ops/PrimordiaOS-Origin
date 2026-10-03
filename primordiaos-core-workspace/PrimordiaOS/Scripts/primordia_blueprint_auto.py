import unreal

def build_primordia_bridge():
    bp = unreal.EditorAssetLibrary.load_asset('/Game/BP_PrimordiaBridge')
    unreal.log('Primordia Blueprint Auto: Ready')