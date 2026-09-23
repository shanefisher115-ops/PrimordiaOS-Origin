import Ajv from "ajv";
import schema from "./scene-plan-schema.json";

const ajv = new Ajv();
const validate = ajv.compile(schema as any);

export function assertValidScenePlan(plan: any) {
  const ok = validate(plan);
  if (!ok) {
    throw new Error("Invalid ScenePlan: " + JSON.stringify(validate.errors));
  }
}
