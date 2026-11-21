import type { FanoutPairIds, FlowNode } from "../types.ts";
import { nodeBox } from "./geometry.ts";

export function remapFanout(pair: FanoutPairIds | undefined, ids: ReadonlyMap<string, string>): FanoutPairIds | undefined {
  if (!pair) return undefined;
  const fanId = ids.get(pair.fanId), mergeId = ids.get(pair.mergeId);
  return fanId && mergeId ? { fanId, mergeId } : undefined;
}

export function remapLaneNode(node: FlowNode, ids: ReadonlyMap<string, string>): void {
  if (node.fanout) node.fanout = remapFanout(node.fanout, ids);
  if (node.masterOf) node.masterOf = ids.get(node.masterOf);
  if (node.generatedBy) {
    delete node.generatedBy;
    delete node.generatedRevision;
    delete node.itemKey;
    delete node.itemTitle;
    delete node.masterNodeId;
    delete node.laneIndex;
    delete node.overridden;
    delete node.removed;
  }
}

/** A portable pair contains just its mother lane. Its frame should fit that lane. */
export function authoredPairHeight(group: FlowNode, allNodes: FlowNode[]): number {
  if (!group.fanout || !allNodes.some(node => node.generatedBy === group.fanout!.fanId)) return group.height;
  const children = allNodes.filter(node => node.parentId === group.id && !node.generatedBy);
  return Math.max(180, ...children.map(node => node.y - group.y + nodeBox(node).h + 24));
}
