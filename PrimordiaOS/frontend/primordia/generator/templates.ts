export const Templates = {
  vfx_pack: {
    build(intent) {
      return {
        scripts: [
          "batch_render_mp4.py",
          "batch_render_png.py",
          "generate_thumbnails.py"
        ],
        folders: [
          "MP4/",
          "PNG/",
          "Thumbnails/"
        ],
        docs: [
          "README.md",
          "license.txt"
        ],
        config: {
          description: intent,
          resolution: "1920x1080",
          format: "mp4 + png"
        }
      }
    }
  },

  voice_pack: {
    build(intent) {
      return {
        scripts: ["elevenlabs_generate.py"],
        folders: ["voices/", "thumbnails/"],
        docs: ["README.md", "license.txt"],
        config: { description: intent }
      }
    }
  },

  ui_kit: {
    build(intent) {
      return {
        scripts: ["generate_ui_components.js"],
        folders: ["components/", "styles/"],
        docs: ["README.md"],
        config: { description: intent }
      }
    }
  },

  automation_loop: {
    build(intent) {
      return {
        scripts: ["automation_loop.js"],
        folders: ["workflows/", "logs/"],
        docs: ["README.md"],
        config: { description: intent }
      }
    }
  },

  asset_pack: {
    build(intent) {
      return {
        scripts: ["asset_pack_builder.py"],
        folders: ["assets/", "metadata/"],
        docs: ["README.md", "license.txt"],
        config: { description: intent }
      }
    }
  }
}
