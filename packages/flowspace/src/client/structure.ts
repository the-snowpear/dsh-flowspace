import type {
  FlowNode,
  SubagentBrief,
  WorkspaceBrief,
  WorkspaceStructureBrief,
} from "../types.ts";
import { nodeBox, type Box } from "./geometry.ts";

export type StructureKind = "project" | "branch" | "worktree" | "subagent";

export interface DerivedStructureCard {
  id: string;
  kind: StructureKind;
  title: string;
  subtitle: string;
  badge?: string;
  workspaceId: string;
  cwd: string;
  branch?: string;
  worktreePath?: string;
  sessionId?: string;
  parentAgentNodeId?: string;
  runningCount?: number;
  waitingCount?: number;
  box: Box;
}

export interface DerivedStructureLink {
  id: string;
  fromBox: Box;
  toBox: Box;
  active?: boolean;
}

export interface DraftAffiliation {
  workspaceId?: string;
  cwd?: string;
  branch?: string;
  worktreePath?: string;
}

function normSlash(p?: string): string {
  if (!p) return "";
  const v = p.replaceAll("\\", "/").replace(/\/+$/, "");
  return v.toLowerCase();
}

/**
 * Three-tier manual Agent draft affiliation resolution (design.md §5.1, M05):
 * 1. Explicit affiliation (created from a structure card menu or inspector)
 * 2. Pre-click selected canvas structure card or selected Agent/tool node's affiliation
 * 3. Geometrically nearest visible structure card to dropPoint (fallback: active workspace)
 */
export function resolveDraftAffiliation(opts: {
  explicit?: DraftAffiliation;
  preSelectedStructure?: DerivedStructureCard | null;
  preSelectedNode?: FlowNode | null;
  dropPoint?: { x: number; y: number };
  structureCards: DerivedStructureCard[];
  workspaces: WorkspaceBrief[];
  activeWorkspaceId?: string;
}): DraftAffiliation {
  if (
    opts.explicit &&
    (opts.explicit.workspaceId ||
      opts.explicit.worktreePath ||
      opts.explicit.branch ||
      opts.explicit.cwd)
  ) {
    return { ...opts.explicit };
  }

  if (opts.preSelectedStructure) {
    const s = opts.preSelectedStructure;
    return {
      workspaceId: s.workspaceId || undefined,
      cwd: s.worktreePath || s.cwd || undefined,
      branch: s.branch,
      worktreePath: s.worktreePath,
    };
  }

  if (opts.preSelectedNode) {
    const n = opts.preSelectedNode;
    if (n.workspaceId || n.worktreePath || n.branch || n.cwd) {
      return {
        workspaceId: n.workspaceId,
        cwd: n.worktreePath || n.cwd,
        branch: n.branch,
        worktreePath: n.worktreePath,
      };
    }
  }

  const candidateCards = opts.structureCards.filter(
    (c) => c.kind !== "subagent",
  );
  if (opts.dropPoint && candidateCards.length > 0) {
    const { x, y } = opts.dropPoint;
    let best = candidateCards[0];
    let bestDist = Infinity;
    for (const card of candidateCards) {
      const cx = card.box.x + card.box.w / 2;
      const cy = card.box.y + card.box.h / 2;
      const d = Math.hypot(cx - x, cy - y);
      if (d < bestDist) {
        bestDist = d;
        best = card;
      }
    }
    return {
      workspaceId: best.workspaceId || undefined,
      cwd: best.worktreePath || best.cwd || undefined,
      branch: best.branch,
      worktreePath: best.worktreePath,
    };
  }

  const activeWs =
    opts.workspaces.find((w) => w.id === opts.activeWorkspaceId) ??
    opts.workspaces[0];
  return {
    workspaceId: activeWs?.id,
    cwd: activeWs?.path,
  };
}

/**
 * Derives the read-only 4-tier skeleton (`Project -> Branch -> Worktree -> Agent -> SubAgent`, M06).
 * Collapsed intermediate tiers (`showBranches=false` or `showWorktrees=false`) are automatically bridged.
 */
export function buildDerivedStructure(opts: {
  projects: WorkspaceStructureBrief[];
  hiddenWorkspaces: string[];
  showBranches: boolean;
  showWorktrees: boolean;
  visibleNodes: FlowNode[];
  lod: boolean;
  keepExpandedIds: Set<string>;
  subagents: SubagentBrief[];
  runningNodeIds: Set<string>;
  waitingNodeIds: Set<string>;
}): { cards: DerivedStructureCard[]; links: DerivedStructureLink[] } {
  const cards: DerivedStructureCard[] = [];
  const links: DerivedStructureLink[] = [];

  const shownProjects = opts.projects.filter(
    (p) => !opts.hiddenWorkspaces.includes(p.id),
  );
  if (!shownProjects.length && !opts.subagents.length) {
    return { cards, links };
  }

  const agentNodes = opts.visibleNodes.filter((n) => n.kind === "agent");
  const allBoxes = opts.visibleNodes.map((n) =>
    nodeBox(n, opts.lod, opts.keepExpandedIds.has(n.id)),
  );
  const anchorRightX = allBoxes.length
    ? Math.min(...allBoxes.map((b) => b.x)) - 96
    : -80;
  const baseTopY = allBoxes.length
    ? Math.min(...allBoxes.map((b) => b.y))
    : 140;

  const wtWidth = 224;
  const brWidth = 208;
  const projWidth = 228;

  const wtX = anchorRightX - wtWidth;
  const brX = opts.showWorktrees ? wtX - brWidth - 64 : anchorRightX - brWidth;
  const projX = opts.showBranches
    ? brX - projWidth - 64
    : opts.showWorktrees
      ? wtX - projWidth - 64
      : anchorRightX - projWidth;

  let cursorY = baseTopY;

  for (const proj of shownProjects) {
    const projAgents = agentNodes.filter(
      (a) =>
        a.workspaceId === proj.id ||
        (!a.workspaceId &&
          shownProjects[0]?.id === proj.id) ||
        (a.cwd && normSlash(a.cwd).startsWith(normSlash(proj.path))),
    );
    const runningCount = projAgents.filter((a) =>
      opts.runningNodeIds.has(a.id),
    ).length;
    const waitingCount = projAgents.filter((a) =>
      opts.waitingNodeIds.has(a.id),
    ).length;

    const projCard: DerivedStructureCard = {
      id: `struct-proj-${proj.id}`,
      kind: "project",
      title: proj.name,
      subtitle: proj.currentBranch
        ? `${proj.currentBranch} · ${proj.path.split(/[\\/]/).pop() ?? proj.path}`
        : proj.path,
      badge: proj.isGitRepo ? "Git" : undefined,
      workspaceId: proj.id,
      cwd: proj.path,
      branch: proj.currentBranch,
      runningCount,
      waitingCount,
      box: { x: projX, y: cursorY, w: projWidth, h: 74, compact: true },
    };
    cards.push(projCard);

    const branchCardByName = new Map<string, DerivedStructureCard>();
    const worktreeCardByPath = new Map<string, DerivedStructureCard>();
    let tierMaxY = cursorY + 74;

    if (proj.isGitRepo && opts.showBranches) {
      let by = cursorY;
      for (const br of proj.branches.slice(0, 12)) {
        const brCard: DerivedStructureCard = {
          id: `struct-br-${proj.id}-${br.name}`,
          kind: "branch",
          title: br.name,
          subtitle: br.worktreePath
            ? br.worktreePath.split(/[\\/]/).pop() ?? br.worktreePath
            : br.commitOid || "no worktree",
          badge:
            br.ahead || br.behind
              ? `↑${br.ahead} ↓${br.behind}`
              : br.current
                ? "HEAD"
                : undefined,
          workspaceId: proj.id,
          cwd: br.worktreePath || proj.path,
          branch: br.name,
          worktreePath: br.worktreePath,
          box: { x: brX, y: by, w: brWidth, h: 64, compact: true },
        };
        cards.push(brCard);
        branchCardByName.set(br.name, brCard);
        links.push({
          id: `slink-${projCard.id}-${brCard.id}`,
          fromBox: projCard.box,
          toBox: brCard.box,
        });
        by += 82;
      }
      tierMaxY = Math.max(tierMaxY, by);
    }

    if (proj.isGitRepo && opts.showWorktrees) {
      let wy = cursorY;
      for (const wt of proj.worktrees.slice(0, 12)) {
        const folder = wt.path.split(/[\\/]/).filter(Boolean).pop() ?? wt.path;
        const wtCard: DerivedStructureCard = {
          id: `struct-wt-${proj.id}-${normSlash(wt.path)}`,
          kind: "worktree",
          title: folder,
          subtitle: wt.branch ?? (wt.detached ? "detached HEAD" : wt.head.slice(0, 7)),
          badge: wt.isMain ? "main" : wt.locked ? "locked" : "wt",
          workspaceId: proj.id,
          cwd: wt.path,
          branch: wt.branch,
          worktreePath: wt.path,
          box: { x: wtX, y: wy, w: wtWidth, h: 64, compact: true },
        };
        cards.push(wtCard);
        worktreeCardByPath.set(normSlash(wt.path), wtCard);
        const parentBr = wt.branch
          ? branchCardByName.get(wt.branch)
          : undefined;
        const upstream = parentBr ?? projCard;
        links.push({
          id: `slink-${upstream.id}-${wtCard.id}`,
          fromBox: upstream.box,
          toBox: wtCard.box,
        });
        wy += 82;
      }
      tierMaxY = Math.max(tierMaxY, wy);
    }

    for (const agent of projAgents) {
      const aBox = nodeBox(
        agent,
        opts.lod,
        opts.keepExpandedIds.has(agent.id),
      );
      const wtKey = normSlash(agent.worktreePath || agent.cwd);
      const matchedWt = wtKey ? worktreeCardByPath.get(wtKey) : undefined;
      const matchedBr =
        (agent.branch ? branchCardByName.get(agent.branch) : undefined) ??
        (proj.currentBranch
          ? branchCardByName.get(proj.currentBranch)
          : undefined);
      const anchor = matchedWt ?? matchedBr ?? projCard;
      links.push({
        id: `slink-${anchor.id}-agent-${agent.id}`,
        fromBox: anchor.box,
        toBox: aBox,
        active: opts.runningNodeIds.has(agent.id),
      });
    }

    cursorY = tierMaxY + 48;
  }

  // Sub-Agent tier (4th/5th tier under bound parent Agent when subAgentsExpanded is true)
  for (const agent of agentNodes) {
    if (!agent.sessionId || !agent.subAgentsExpanded) continue;
    const subs = opts.subagents.filter(
      (s) => s.parentSessionId === agent.sessionId,
    );
    if (!subs.length) continue;
    const parentBox = nodeBox(
      agent,
      opts.lod,
      opts.keepExpandedIds.has(agent.id),
    );
    subs.forEach((sub, idx) => {
      const subBox: Box = {
        x: parentBox.x + 24,
        y: parentBox.y + parentBox.h + 26 + idx * 66,
        w: Math.max(232, parentBox.w - 48),
        h: 54,
        compact: true,
      };
      const subCard: DerivedStructureCard = {
        id: `struct-sub-${sub.sessionId}`,
        kind: "subagent",
        title: sub.title,
        subtitle: sub.sessionId.slice(0, 12),
        badge: sub.running ? "running" : "sub",
        workspaceId: agent.workspaceId ?? "",
        cwd: agent.worktreePath || agent.cwd || "",
        sessionId: sub.sessionId,
        parentAgentNodeId: agent.id,
        box: subBox,
      };
      cards.push(subCard);
      links.push({
        id: `slink-agent-${agent.id}-sub-${sub.sessionId}`,
        fromBox: parentBox,
        toBox: subBox,
        active: sub.running,
      });
    });
  }

  return { cards, links };
}
