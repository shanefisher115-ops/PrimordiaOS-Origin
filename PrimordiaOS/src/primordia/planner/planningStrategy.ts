import { vertexAiBridge } from '../../integrations/vertexAiBridge';

export const PlanningStrategy = {
  async generate(graph: any) {
    const prompt = `
Goal: ${graph.goal}
Nodes: ${graph.nodes.map(n => n.id).join(', ')}
Edges: ${graph.edges.map(e => `${e[0]} -> ${e[1]}`).join(', ')}

Generate a multi-step strategy to achieve the goal.
`;

    const result = await vertexAiBridge.runModel(prompt);
    return { graph, strategy: result };
  }
};
