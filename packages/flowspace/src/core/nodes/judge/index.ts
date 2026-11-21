import type { NodeDescriptor } from "../types.ts";
import { ai } from "./ai.ts";
import { code } from "./code.ts";
import { condition } from "./condition.ts";
import { human } from "./human.ts";

export { ai, code, condition, human };
export { conditionRoute, type ConditionConfig } from "./condition.ts";
export type { CodeConfig } from "./code.ts";
export type { AiConfig } from "./ai.ts";
export type { HumanConfig } from "./human.ts";

export const judges: NodeDescriptor[] = [condition, code, ai, human];
