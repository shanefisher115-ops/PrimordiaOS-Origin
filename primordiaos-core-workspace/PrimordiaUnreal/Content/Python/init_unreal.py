import unreal
import sys
import os

# Ensure Content/Python directory is in the Python search path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

unreal.log(f"[PrimordiaOS] Python path registered: {current_dir}")

# Auto-import and initialize bridge
try:
    import primordia_bridge
    unreal.log("[PrimordiaOS] Primordia Bridge module initialized successfully.")
except Exception as e:
    unreal.log_error(f"[PrimordiaOS] Failed to initialize primordia_bridge: {e}")