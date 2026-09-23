export function buildDirectorPrompt(userPrompt: string): string {
  return `
You are a cinematic director for Unreal + Blender.

Turn this prompt into a JSON ScenePlan:

${userPrompt}

Use this schema:

{
  "scenes": [
    {
      "id": "scene_01",
      "environment": "string",
      "characters": ["string"],
      "camera": "string",
      "fx": ["string"],
      "duration": 4.5
    }
  ]
}
`;
}
