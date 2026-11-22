import type { FC } from "react";
import type { FlowNode, FlowspaceDocument, FlowspaceRun, FlowspaceSnapshot } from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";

export interface NodeViewProps {
  node: FlowNode;
  run?: FlowspaceRun;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  bridge: CanvasBridge;
}

export type NodeView = { Compact: FC<NodeViewProps>; Full: FC<NodeViewProps> };
