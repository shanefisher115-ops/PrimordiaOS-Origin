//! Compiles the GLSL glyphs in `shaders/` to SPIR-V with glslc.
//! glslc is found via $GLSLC, then $VULKAN_SDK/Bin, then PATH.

use std::{env, path::PathBuf, process::Command};

const GLYPHS: &[&str] = &["frame", "parse", "respond", "lz4_decode"];

fn glslc() -> PathBuf {
    if let Ok(p) = env::var("GLSLC") {
        return p.into();
    }
    if let Ok(sdk) = env::var("VULKAN_SDK") {
        for dir in ["Bin", "bin"] {
            let p = PathBuf::from(&sdk).join(dir).join(if cfg!(windows) { "glslc.exe" } else { "glslc" });
            if p.exists() {
                return p;
            }
        }
    }
    "glslc".into()
}

fn main() {
    let out = PathBuf::from(env::var("OUT_DIR").unwrap());
    let compiler = glslc();
    println!("cargo:rerun-if-changed=shaders");
    println!("cargo:rerun-if-env-changed=GLSLC");
    println!("cargo:rerun-if-env-changed=VULKAN_SDK");

    for glyph in GLYPHS {
        let status = Command::new(&compiler)
            .args(["--target-env=vulkan1.2", "-O", "-I", "shaders"])
            .arg(format!("shaders/{glyph}.comp"))
            .arg("-o")
            .arg(out.join(format!("{glyph}.spv")))
            .status()
            .unwrap_or_else(|e| panic!("could not run glslc ({}): {e}", compiler.display()));
        assert!(status.success(), "glslc failed on shaders/{glyph}.comp");
    }
}
