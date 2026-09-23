export class NodeVisuals {
  renderHaloMesh(nodeId: string) {
    return {
      nodeId,
      radius: 12,
      segments: 32,
      emissiveHex: "#38B2AC"
    };
  }
}