import type { FlowNode, FlowspaceDocument, GroupPort } from "../types.ts";
import { inferGroupPorts as coreInferGroupPorts } from "../core/geometry.ts";
import { getLanguage, type Locale } from "./i18n.ts";

export {
  alignedWireDropPosition,
  BOARD_MIN_SIZE,
  bounds,
  canvasItemBox,
  capsuleStateOf,
  clamp,
  clearBoxAlong,
  collapsedAncestor,
  COMFORT_ZOOM,
  comfortableFit,
  COMPACT_SIZE,
  computeInputHubLayout,
  dataCardHeight,
  easeView,
  endpoint,
  exchangeRoute,
  expandedGroupBox,
  fit,
  flowBranchTop,
  FULL_SIZE,
  giveRoomBack,
  groupBox,
  hubFilamentPath,
  isCompactNode,
  LOD_ZOOM,
  lockedCanvasItems,
  makeRoom,
  MOTION,
  nodeBox,
  portY,
  reflowCanvasItem,
  toWorld,
  zoomAt,
  type Box,
  type CapsuleState,
  type HubSatelliteItem,
  type InputHubLayout,
  type RectLike,
} from "../core/geometry.ts";

export function inferGroupPorts(
  doc: FlowspaceDocument,
  group: FlowNode,
  locale: Locale = getLanguage(),
): GroupPort[] {
  return coreInferGroupPorts(doc, group, locale);
}
