import { useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { descriptorOf, portsOf } from "../../../core/nodes/registry.ts";
import type { PortSpec } from "../../../core/nodes/types.ts";
import type { RunStep } from "../../../types.ts";
import { flowBranchTop } from "../../geometry.ts";
import { Icon } from "../../icons.tsx";
import { t } from "../../i18n.ts";
import type { NodeViewProps } from "../index.ts";
import { CanvasPreviewContext } from "../DataPreview.tsx";

export const labelOf = (port: PortSpec) => port.label ?? (port.labelKey ? t(port.labelKey) : port.id);
const ROW = 32;

export function MissingView({ node }: NodeViewProps) {
  return <div className="node-empty">{t("flow_view_missing")} · {node.flowType}</div>;
}

/** One-line summary shared by every compact flow card: the latest route, else the descriptor summary. */
export function JudgeCompact({ node, run }: NodeViewProps) {
  const last = run?.steps.findLast(step => step.nodeId === node.id && step.route);
  const branch = portsOf(node).find(port => port.id === last?.route);
  return <span className="compact-overview-detail">{branch
    ? t("flow_view_latest", { branch: labelOf(branch) })
    : t(descriptorOf(node.flowType)!.descKey)}</span>;
}

export interface FlowShellProps extends NodeViewProps {
  /** Replaces the descriptor summary in the fixed band above the outlet rows. */
  lead?: ReactNode;
  /** Work area below the outlet rows; the card grows to fit it unless `fixedHeight` is set. */
  children?: ReactNode;
  /** Data cards size themselves from their preview; everything else is measured. */
  fixedHeight?: boolean;
  /** When set, outlets listed here become answer buttons (human choice). */
  choose?: { options: readonly string[]; pick: (portId: string) => void; busy: boolean };
}

/**
 * Every flow card body uses this skeleton so outlet sockets always line up with a labelled row:
 *   48px summary band → 32px outlet rows → work area.
 * `geometry.portY` places each outlet at `flowBranchTop + (index + .5) * 32`.
 */
export function FlowShell(props: FlowShellProps) {
  const { node, run, lead, children, fixedHeight, choose } = props;
  const steps = run?.steps.filter(step => step.nodeId === node.id) ?? [];
  const hits = new Map<string, number>();
  for (const step of steps) if (step.route) hits.set(step.route, (hits.get(step.route) ?? 0) + 1);
  const latest = steps.findLast(step => step.route)?.route;
  const outlets = portsOf(node).filter(port => port.direction === "out");
  const extra = useRef<HTMLDivElement>(null);
  const resize = useContext(CanvasPreviewContext)?.size;
  const measured = !fixedHeight && children !== undefined && children !== null && children !== false;
  useLayoutEffect(() => {
    const element = extra.current;
    if (!measured || !element || !resize) return;
    const base = flowBranchTop(node) + outlets.length * ROW;
    const apply = () => {
      if (!element.isConnected || element.offsetParent === null) return;
      // 8px gap above the work area, 12px card padding below it.
      resize(node.id, Math.ceil(base + 8 + element.offsetHeight + 12));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measured, resize, node.id, node.flowType, outlets.length]);
  return <div className={fixedHeight ? "fs-branch-body fs-data-body" : "fs-branch-body"}>
    <div className="fs-branch-description">{lead ?? <span>{t(descriptorOf(node.flowType)!.descKey)}</span>}</div>
    <div className={`fs-branch-list node-scroll${choose ? " is-choosing" : ""}`} tabIndex={choose ? -1 : 0}
      aria-label={t("flow_view_branches")}>{outlets.map(port => {
        const pickable = !!choose && !port.fixed && choose.options.includes(port.id);
        // Routes name continuation outlets; a reference outlet with the same id is never "taken".
        const routed = port.role === "continuation";
        const className = ["fs-branch-row", routed && hits.has(port.id) && "is-hit", routed && latest === port.id && "is-latest",
          port.fixed === "error" && "is-error", pickable && "is-pickable"].filter(Boolean).join(" ");
        const body = <>
          <span className="fs-branch-label">{labelOf(port)}</span>
          {pickable ? <span className="fs-branch-pick"><Icon name="chev" /></span>
            : routed && <span className="fs-branch-count">{hits.get(port.id) ?? 0}</span>}
        </>;
        return pickable
          ? <button key={port.role + ":" + port.id} type="button" data-branch-id={port.id} className={className}
            disabled={choose!.busy} onClick={event => { event.stopPropagation(); choose!.pick(port.id); }}>{body}</button>
          : <div key={port.role + ":" + port.id} data-branch-id={port.id} className={className}>{body}</div>;
      })}</div>
    {fixedHeight ? children : measured && <div className="fs-flow-extra node-scroll">
      <div className="fs-flow-extra-inner" ref={extra}>{children}</div>
    </div>}
  </div>;
}

/** Plain judges (condition, code, AI, random, merge, assign, notice). */
export function JudgeFull(props: NodeViewProps) {
  return <FlowShell {...props} />;
}

/** The latest step a human still has to answer on this node, if any. */
export function awaitingStep(props: NodeViewProps): RunStep | undefined {
  return props.run?.steps.find(step => step.nodeId === props.node.id && step.state === "awaiting" && step.human);
}
