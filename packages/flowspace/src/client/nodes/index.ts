import type { FC } from "react";
import type { FlowNode, FlowspaceDocument, FlowspaceRun, FlowspaceSnapshot } from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { judges } from "../../core/nodes/judge/index.ts";
import { fanout, mergeSort } from "../../core/nodes/fanout.ts";
import { dataDescriptors } from "../../core/nodes/data/descriptors.ts";
import { JudgeCompact, JudgeFull, MissingView } from "./judge/JudgeView.tsx";
import { DataCompact, DataFull } from "./DataPreview.tsx";
import { VariableCompact, VariableFull } from "./Variables.tsx";
import { OperationCompact, OperationFull } from "./OperationView.tsx";
import { gitExec, terminalExec } from "../../core/nodes/operations.ts";
import { humanNodes, noticeNode, triggerNode } from "../../core/nodes/interactions.ts";
import { randomNode } from "../../core/nodes/play.ts";
import { HumanChoiceFull, HumanCompact, HumanFull, NoticeFull, TriggerCompact, TriggerFull } from "./InteractionViews.tsx";

export { FlowCountdown } from "./judge/HumanApproval.tsx";
export interface NodeViewProps {
  node: FlowNode;
  run?: FlowspaceRun;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
}
type NodeView = { Compact: FC<NodeViewProps>; Full: FC<NodeViewProps> };
const views = new Map<string, NodeView>([...judges, fanout, mergeSort].map(descriptor =>
  [descriptor.flowType, { Compact: JudgeCompact, Full: JudgeFull }]));
for (const descriptor of dataDescriptors) views.set(descriptor.flowType, { Compact: DataCompact, Full: DataFull });
views.set("flowspace/variable", { Compact: VariableCompact, Full: VariableFull });
views.set("flowspace/assign", { Compact: JudgeCompact, Full: JudgeFull });
for (const descriptor of [gitExec, terminalExec])
  views.set(descriptor.flowType, { Compact: OperationCompact, Full: OperationFull });
for (const descriptor of humanNodes) views.set(descriptor.flowType, { Compact: HumanCompact, Full: HumanFull });
views.set("flowspace/human-choice", { Compact: HumanCompact, Full: HumanChoiceFull });
views.set(triggerNode.flowType, { Compact: TriggerCompact, Full: TriggerFull });
views.set(noticeNode.flowType, { Compact: JudgeCompact, Full: NoticeFull });
views.set(randomNode.flowType, { Compact: JudgeCompact, Full: JudgeFull });
const missing: NodeView = { Compact: MissingView, Full: MissingView };
export const viewOf = (flowType?: string): NodeView => views.get(flowType ?? "") ?? missing;
