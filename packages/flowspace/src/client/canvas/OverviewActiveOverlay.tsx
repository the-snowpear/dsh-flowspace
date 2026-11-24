import { memo, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Icon } from "../icons.tsx";
import { t } from "../i18n.ts";
import { nodeBox } from "../geometry.ts";
import { nodeStatusOf } from "../SurfaceViews.tsx";
import type { CanvasWorldProps } from "./canvasWorldTypes.ts";
import { useCanvasInteractionStore } from "./interactionStore.ts";
import { overviewPorts, shouldRenderDomInLod } from "./overviewScene.ts";

type ActiveOverlayProps = Pick<CanvasWorldProps,
  | "lod"
  | "connecting"
  | "nodesById"
  | "keepExpandedIds"
  | "snapshot"
  | "edgeIndex"
  | "selectNode"
  | "toggleNodeForm"
  | "launchScope"
  | "stopNode"
  | "openNodeContextMenu"
  | "startInputEdgeDrag"
  | "startPortDrag"
>;

export const OverviewActiveOverlay = memo(function OverviewActiveOverlay(props: ActiveOverlayProps) {
  const store = useCanvasInteractionStore();
  const hover = useSyncExternalStore(store.subscribeHover, () => store.getHover().nodeId);
  const subscribe = useMemo(() => (notify: () => void) => {
    const stops = [store.subscribeCamera(notify), store.subscribeDrag(notify)];
    return () => stops.forEach(stop => stop());
  }, [store]);
  const settledPose = useSyncExternalStore(subscribe, () => {
    const camera = store.getCamera();
    if (camera.moving || store.getDrag()) return "";
    return `${camera.x},${camera.y},${camera.zoom}`;
  });
  const node = hover ? props.nodesById.get(hover) : undefined;
  if (!props.lod || !settledPose || props.connecting || !node || shouldRenderDomInLod(node, props.keepExpandedIds)) return null;
  const box = nodeBox(node, true), camera = store.getCamera();
  const x = camera.x + box.x * camera.zoom, y = camera.y + box.y * camera.zoom;
  const expand = () => { props.selectNode(node.id); if (!node.expanded) props.toggleNodeForm(node.id); };
  const status = nodeStatusOf(props.snapshot, node.id);
  return <>
    <div className="fs-overview-actions" data-overview-node={node.id}
      style={{ left: x, top: Math.max(8, y - 40) }} onPointerDown={event => event.stopPropagation()}>
      <button className="icon-button" title={t("expand")} onClick={expand}><Icon name="card" /></button>
      {node.kind === "agent" || node.kind === "flow" ? <button className="icon-button" title={t("run")}
        onClick={() => props.launchScope({ kind: "single", nodeIds: [node.id] })}><Icon name="play" /></button> : null}
      {["running", "settling"].includes(status) && <button className="icon-button" title={t("stopAgent")}
        onClick={() => props.stopNode(node.id)}><Icon name="stop" /></button>}
      <button className="icon-button" title={t("inspector")} onClick={event => props.openNodeContextMenu(node, event.currentTarget)}><Icon name="more" /></button>
    </div>
    {overviewPorts(node, box, props.edgeIndex).map(port => <button key={`${port.kind}-${port.direction}-${port.id}`}
      className="fs-overview-port" data-node-id={node.id} data-port-kind={port.kind} data-port-id={port.id} data-port-direction={port.direction}
      aria-label={`${t(port.direction === "in" ? "contInput" : "contOutput")} ${port.kind}`}
      style={{ left: x + port.x * camera.zoom, top: y + port.y * camera.zoom }}
      onPointerDown={event => {
        const incoming = port.direction === "in" && props.edgeIndex.incoming.get(node.id)?.filter(edge => edge.kind === port.kind && (edge.targetPort ?? "in") === port.id).at(-1);
        if (incoming) props.startInputEdgeDrag(event, incoming);
        else props.startPortDrag(event, [node.id], port.kind, undefined, undefined, port.id, port.direction);
      }} />)}
  </>;
});

type FocusProxyProps = Pick<CanvasWorldProps,
  "lod" | "selection" | "nodesById" | "keepExpandedIds" | "toggleNodeForm" | "viewportRef"
>;

export const OverviewFocusProxy = memo(function OverviewFocusProxy(props: FocusProxyProps) {
  const store = useCanvasInteractionStore();
  const ref = useRef<HTMLDivElement>(null);
  const candidate = props.lod && props.selection.nodes.length === 1 ? props.nodesById.get(props.selection.nodes[0]) : undefined;
  const node = candidate && !shouldRenderDomInLod(candidate, props.keepExpandedIds) ? candidate : undefined;
  const id = node?.id;
  useLayoutEffect(() => {
    if (id && !document.activeElement?.closest("input,textarea,select,[contenteditable=true]")) ref.current?.focus({ preventScroll: true });
  }, [id]);
  if (!node) return null;
  return <div className="fs-overview-focus" ref={ref} role="region" aria-label={node.title} tabIndex={0}
    onKeyDown={event => {
      if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (!node.expanded) props.toggleNodeForm(node.id);
      }
      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        store.setHover({ nodeId: node.id, edgeId: null });
        requestAnimationFrame(() => props.viewportRef.current?.querySelector<HTMLButtonElement>(".fs-overview-actions button")?.focus());
      }
    }} />;
});
