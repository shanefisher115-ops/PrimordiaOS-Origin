"use client"
import { useState } from "react"

export default function GeneratorPanel() {
  const [intent, setIntent] = useState("")
  const [pipelineType, setPipelineType] = useState("vfx_pack")
  const [result, setResult] = useState(null)

async function generate() {
  const res = await fetch("/api/generator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, pipelineType })
  })

  if (!res.ok) {
    console.error("API error:", res.status, await res.text())
    return
  }

  const data = await res.json()
  setResult(data)
}

  return (
    <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900">
      <h2 className="text-xl font-bold mb-4">Generator</h2>

      <label className="block mb-2">Pipeline Type</label>
      <select
        value={pipelineType}
        onChange={e => setPipelineType(e.target.value)}
        className="mb-4 p-2 bg-neutral-800 rounded"
      >
        <option value="vfx_pack">VFX Pack</option>
        <option value="voice_pack">Voice Pack</option>
        <option value="ui_kit">UI Kit</option>
        <option value="automation_loop">Automation Loop</option>
        <option value="asset_pack">Asset Pack</option>
      </select>

      <label className="block mb-2">Describe what you want</label>
      <textarea
        value={intent}
        onChange={e => setIntent(e.target.value)}
        className="w-full p-3 bg-neutral-800 rounded mb-4"
        rows={4}
      />

      <button
        onClick={generate}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
      >
        Generate Pipeline
      </button>

      {result && (
        <div className="mt-6 p-4 bg-neutral-800 rounded">
          <h3 className="font-bold mb-2">Generated Artifacts</h3>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
