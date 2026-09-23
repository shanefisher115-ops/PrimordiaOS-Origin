import { EdgeCondition, ExecutionEdgeDefinition } from '../core/types.js';

export class ExecutionEdge {
  public readonly id: string;
  public readonly fromNodeId: string;
  public readonly toNodeId: string;
  public readonly condition?: EdgeCondition;
  public readonly transform?: (upstreamData: Record<string, unknown>) => Record<string, unknown>;

  constructor(def: ExecutionEdgeDefinition) {
    this.fromNodeId = def.fromNodeId;
    this.toNodeId = def.toNodeId;
    this.condition = def.condition;
    this.transform = def.transform;
    this.id = def.id ?? `${def.fromNodeId}->${def.toNodeId}`;
  }

  public evaluateCondition(upstreamOutput: Record<string, unknown>): boolean {
    if (!this.condition) {
      return true;
    }

    if (this.condition.predicate) {
      try {
        return this.condition.predicate(upstreamOutput);
      } catch {
        return false;
      }
    }

    if (!this.condition.field) {
      return true;
    }

    const value = upstreamOutput[this.condition.field];
    const targetValue = this.condition.value;

    switch (this.condition.operator) {
      case 'equals':
        return value === targetValue;
      case 'notEquals':
        return value !== targetValue;
      case 'contains':
        if (typeof value === 'string' && typeof targetValue === 'string') {
          return value.includes(targetValue);
        }
        if (Array.isArray(value)) {
          return value.includes(targetValue);
        }
        return false;
      case 'exists':
        return value !== undefined && value !== null;
      case 'greaterThan':
        return typeof value === 'number' && typeof targetValue === 'number' && value > targetValue;
      case 'lessThan':
        return typeof value === 'number' && typeof targetValue === 'number' && value < targetValue;
      default:
        return true;
    }
  }

  public transformPayload(upstreamOutput: Record<string, unknown>): Record<string, unknown> {
    if (!this.transform) {
      return upstreamOutput;
    }
    try {
      return this.transform(upstreamOutput);
    } catch {
      return upstreamOutput;
    }
  }
}
