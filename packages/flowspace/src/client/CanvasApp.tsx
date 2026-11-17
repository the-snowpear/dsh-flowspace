import { tr } from "./i18n.ts";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
  type NodeProps,
  type EdgeProps,
  type Node,
  type Edge,
  type Connection,
  type Dimensions,
} from "@xyflow/react";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  X,
  Settings2,
  Search,
  StickyNote,
  FileText,
  Copy,
  Layers,
  LayoutGrid,
  PanelRightClose,
  PanelRightOpen,
  Undo2,
  Redo2,
  Check,
  Clock,
  Link2,
  GitFork,
  Maximize2,
  MessageSquare,
  AlertCircle,
  Download,
  Upload,
  Trash2,
} from "lucide-react";
import type { SessionReference } from "@deepseek-ai/dsh-api-session-controller/client";
import type {
  FlowNode,
  FlowEdge,
  FlowspaceDocument,
  FlowspaceSnapshot,
  FlowspaceRun,
  LaunchPlan,
  StartRequest,
  WorkspaceBrief,
  SessionBrief,
} from "../types.ts";
import {
  emptyDocument,
  newNode,
  newEdge,
  members,
  groupDescendants,
  sample,
} from "../core/document.ts";
import type { CanvasBridge } from "./bridge.ts";
import "@xyflow/react/dist/style.css";

type GraphNode = Node<{ model: FlowNode }, "flowspace">;
type GraphEdge = Edge<
  { model: FlowEdge; active: boolean; waiting: boolean },
  "flowspace"
>;
interface Actions {
  bridge: CanvasBridge;
  snapshot: FlowspaceSnapshot | null;
  editNode: (id: string, changes: Partial<FlowNode>) => void;
  launch: (request: StartRequest) => void;
  select: (id: string) => void;
  bind: (node: FlowNode) => void;
  error: (reason: unknown) => void;
  renderConversation: (
    node: FlowNode,
    reference: SessionReference,
  ) => ReactNode;
}
const ActionsContext = createContext<Actions>(null!);
const statuses: Record<string, string> = {
  input: "等待用户",
  running: "运行中",
  queued: "排队中",
  completed: "已完成",
  error: "异常",
  aborted: "已停止",
  interrupted: "待恢复",
  waiting: "等你确认",
  paused: "已暂停",
  cancelled: "已取消",
};
function statusOf(snapshot: FlowspaceSnapshot | null, id: string): string {
  if (
    snapshot?.runs.some(
      (r) =>
        ["running", "waiting", "paused"].includes(r.state) &&
        r.tokens.some(
          (t) =>
            !t.ready &&
            !t.consumed &&
            !t.dismissed &&
            r.graph.edges.find((e) => e.id === t.edgeId)?.target === id,
        ),
    )
  )
    return "waiting";
  const live = snapshot?.live.find((l) => l.nodeId === id);
  if (live?.pendingInput.length) return "input";
  if (live?.running) return "running";
  return (
    snapshot?.runs
      .flatMap((r) => r.steps)
      .filter((s) => s.nodeId === id)
      .at(-1)?.state ?? "draft"
  );
}
function Embedded({ node }: { node: FlowNode }) {
  const { bridge, renderConversation, error } = useContext(ActionsContext),
    [reference, setReference] = useState<SessionReference>();
  useEffect(() => {
    const ref = bridge.retain(node);
    ref.ready.then(() => setReference(ref)).catch(error);
    return () => ref.release();
  }, [bridge, node.sessionId]);
  return reference ? (
    <>{renderConversation(node, reference)}</>
  ) : (
    <div className="fs-loading">{tr("正在打开会话…")}</div>
  );
}
function CanvasNode({ data, selected }: NodeProps<GraphNode>) {
  const { model: node } = data,
    { snapshot, editNode, launch, select, bridge, bind, error } =
      useContext(ActionsContext);
  const [quote, setQuote] = useState("");
  const state = statusOf(snapshot, node.id),
    live = snapshot?.live.find((l) => l.nodeId === node.id);
  const waiting =
    snapshot?.runs.filter(r => ["running", "waiting", "paused"].includes(r.state)).flatMap((r) =>
      r.tokens
        .filter(
          (t) =>
            !t.ready &&
            !t.consumed &&
            !t.dismissed &&
            r.graph.edges.find((e) => e.id === t.edgeId)?.target === node.id,
        )
        .map((t) => ({ run: r, token: t })),
    ) ?? [];
  if (node.kind === "group")
    return (
      <div className={"fs-group " + (selected ? "selected" : "")}>
        <header className="fs-drag">
          <Layers size={15} />
          <b>{node.title}</b>
          <span />
          <button
            className="nodrag"
            onClick={() => editNode(node.id, { collapsed: !node.collapsed })}
          >
            {node.collapsed ? (
              <ChevronRight size={15} />
            ) : (
              <ChevronDown size={15} />
            )}
          </button>
          <button
            className="nodrag"
            title={tr("启动分组")}
            onClick={() => launch({ kind: "group", nodeIds: [node.id] })}
          >
            <Play size={14} />
          </button>
        </header>
        {node.collapsed && <small>{tr("工作流已折叠 · 展开查看节点")}</small>}
        {node.collapsed && (
          <>
            <Handle
              id="exec-in"
              type="target"
              position={Position.Left}
              className="fs-exec"
              style={{ top: 22 }}
              isConnectable={false}
            />
            <Handle
              id="exec-out"
              type="source"
              position={Position.Right}
              className="fs-exec"
              style={{ top: 22 }}
              isConnectable={false}
            />
            <Handle
              id="ref-in"
              type="target"
              position={Position.Left}
              style={{ top: 72 }}
              isConnectable={false}
            />
            <Handle
              id="ref-out"
              type="source"
              position={Position.Right}
              style={{ top: 72 }}
              isConnectable={false}
            />
          </>
        )}
      </div>
    );
  const agent = node.kind === "agent";
  return (
    <article
      className={`fs-node fs-${node.kind} ${selected ? "selected" : ""} ${state}`}
    >
      {agent && (
        <>
          <Handle
            id="exec-in"
            type="target"
            position={Position.Left}
            className="fs-exec"
            style={{ top: 27 }}
          />
          <Handle
            id="exec-out"
            type="source"
            position={Position.Right}
            className="fs-exec"
            style={{ top: 27 }}
          />
        </>
      )}
      <header
        className="fs-drag"
        onDoubleClick={() =>
          agent && editNode(node.id, { expanded: !node.expanded })
        }
      >
        <i className={`fs-kind ${state}`}>
          {agent ? (
            <Workflow size={15} />
          ) : node.kind === "note" ? (
            <StickyNote size={15} />
          ) : (
            <FileText size={15} />
          )}
        </i>
        <b>{node.title}</b>
        <button
          className="nodrag"
          title={tr("检查器")}
          onClick={() => select(node.id)}
        >
          <Settings2 size={14} />
        </button>
        {agent && (
          <button
            className="nodrag"
            title={tr("展开或收起")}
            onClick={() => {
              if (!node.sessionId && !node.expanded) bind(node);
              else editNode(node.id, { expanded: !node.expanded });
            }}
          >
            <Maximize2 size={14} />
          </button>
        )}
      </header>
      <div
        className="fs-node-body nodrag nowheel"
        onMouseUp={() => {
          const text = window.getSelection()?.toString();
          if (agent && text && text.trim()) setQuote(text);
        }}
      >
        {agent ? (
          <>
            <div className="fs-node-meta">
              <span className={"fs-status " + state}>
                <i />
                {tr(statuses[state] ?? "草稿")}
              </span>
              <span title={node.cwd}>
                {node.cwd?.split(/[\\/]/).at(-1) ?? "当前工作区"}
              </span>
            </div>
            {live?.pendingInput.length ? (
              <button
                className="fs-pending-input"
                onClick={() => editNode(node.id, { expanded: true })}
              >
                {tr("等待审批或回答 · 展开处理")}
              </button>
            ) : null}
            {!!waiting.length && (
              <div className="fs-wait">
                {waiting.map(({ run, token }) => (
                  <div key={token.id}>
                    <strong>
                      {token.boundary
                        ? tr("接续已到达分组边界")
                        : tr("下一步等待确认")}
                    </strong>
                    <p>
                      {token.source.title}：{token.source.text.slice(0, 90)}
                    </p>
                    <button
                      onClick={() =>
                        void bridge.release(run.id, token.id, true).catch(error)
                      }
                    >
                      <Check size={13} />
                      {tr("放行")}
                    </button>
                    <button
                      onClick={() =>
                        void bridge
                          .release(run.id, token.id, false)
                          .catch(error)
                      }
                    >
                      {tr("跳过")}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {node.expanded && node.sessionId ? (
              <Embedded node={node} />
            ) : (
              <>
                <textarea
                  aria-label={`${node.title}任务`}
                  placeholder={tr("写下这个 Agent 的任务…")}
                  value={node.draft || node.task}
                  onChange={(e) =>
                    editNode(node.id, {
                      draft: e.target.value,
                      task: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      launch({ kind: "single", nodeIds: [node.id] });
                    }
                  }}
                />
                {(live?.output ||
                  snapshot?.runs
                    .flatMap((r) => r.steps)
                    .filter((s) => s.nodeId === node.id)
                    .at(-1)?.output) && (
                  <p className="fs-result">
                    {(
                      live?.output ||
                      snapshot?.runs
                        .flatMap((r) => r.steps)
                        .filter((s) => s.nodeId === node.id)
                        .at(-1)?.output
                    )?.slice(0, 170)}
                  </p>
                )}
              </>
            )}
          </>
        ) : node.kind === "display" ? (
          <>
            <pre>{node.text || "等待来源结果"}</pre>
            <label className="fs-inline">
              <input
                type="checkbox"
                checked={node.fixed}
                onChange={(e) => editNode(node.id, { fixed: e.target.checked })}
              />
              {tr("固定内容")}
            </label>
          </>
        ) : (
          <textarea
            aria-label={node.title}
            placeholder={
              node.kind === "file"
                ? tr("工作区文件路径，如 src/index.ts")
                : tr("把想法留在这里…")
            }
            value={node.text}
            onChange={(e) => editNode(node.id, { text: e.target.value })}
          />
        )}
      </div>
      {agent && quote && (
        <button
          className="fs-quote-action nodrag"
          onClick={() => {
            void bridge
              .display({ nodeId: node.id, text: quote, fixed: true })
              .catch(error);
            setQuote("");
          }}
        >
          <Copy size={12} />
          {tr("引用选中文字")}
        </button>
      )}
      {agent && (
        <div className="fs-capsules nodrag">
          {snapshot?.document.edges
            .filter((e) => e.kind === "reference" && e.target === node.id)
            .map((edge) => {
              const source = snapshot.document.nodes.find(
                (n) => n.id === edge.source,
              );
              const output =
                source && snapshot.live.find((l) => l.nodeId === source.id);
              const version =
                source &&
                `${source.sessionId ?? source.id}:${output?.seq ?? source.sourceSeq ?? source.text}`;
              const state = edge.always
                ? "始终附带"
                : !edge.sentVersion
                  ? "待发"
                  : edge.sentVersion === version
                    ? "已发"
                    : "来源更新";
              return (
                <button
                  key={edge.id}
                  className={edge.sentVersion ? "sent" : ""}
                  onClick={() => select(edge.id)}
                  title={tr(state)}
                >
                  <Link2 size={10} />
                  {source?.title}
                  <small>{tr(state)}</small>
                </button>
              );
            })}
        </div>
      )}
      <footer className="nodrag">
        <span className="fs-port-label">
          <Link2 size={12} />
          {agent ? tr("上下文") : tr("引用内容")}
        </span>
        <span />
        {agent && (
          <>
            {state === "running" && (
              <button
                title={tr("停止当前 Agent")}
                onClick={() => bridge.stopNode(node.id).catch(error)}
              >
                <Square size={12} />
              </button>
            )}
            <button
              title={tr("引出结果")}
              disabled={!node.sessionId}
              onClick={() =>
                void bridge
                  .display({ nodeId: node.id, fixed: false })
                  .catch(error)
              }
            >
              <Copy size={13} />
            </button>
            {node.sessionId && (
              <button
                title={tr("打开原生对话")}
                onClick={() => bridge.openChat(node.sessionId!)}
              >
                <ArrowUpRight size={14} />
              </button>
            )}
            <button
              className="fs-run-node"
              onClick={() => launch({ kind: "single", nodeIds: [node.id] })}
            >
              <Play size={12} />
              {tr("运行")}
            </button>
          </>
        )}
      </footer>
      {agent && (
        <Handle
          id="ref-in"
          type="target"
          position={Position.Left}
          style={{ top: "auto", bottom: 20 }}
        />
      )}
      <Handle
        id="ref-out"
        type="source"
        position={Position.Right}
        style={{ top: "auto", bottom: 20 }}
      />
    </article>
  );
}
function CanvasEdge(props: EdgeProps<GraphEdge>) {
  const { data, selected, id } = props,
    [path, x, y] = getBezierPath(props),
    { select } = useContext(ActionsContext);
  if (!data) return null;
  const exec = data.model.kind === "continuation";
  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={props.markerEnd}
        style={{
          stroke: data.waiting ? "#e9af57" : exec ? "#a392ef" : "#788aa8",
          strokeWidth: selected ? 3 : exec ? 2 : 1.3,
          strokeDasharray: exec ? undefined : "5 5",
        }}
      />
      <EdgeLabelRenderer>
        <button
          className={`fs-edge-label nodrag nopan ${data.active ? "active" : ""} ${data.waiting ? "waiting" : ""}`}
          style={{ transform: `translate(-50%,-50%) translate(${x}px,${y}px)` }}
          onClick={() => select(id)}
        >
          {exec ? (
            data.model.mode === "fork" ? (
              <GitFork size={11} />
            ) : data.model.trigger === "confirm" ? (
              <Pause size={10} />
            ) : (
              <Play size={10} />
            )
          ) : (
            <Link2 size={10} />
          )}
          {selected || data.waiting
            ? data.waiting
              ? tr("等待确认")
              : exec
                ? { conclusion: "结论", session: "会话引用", fork: "分叉" }[
                    data.model.mode
                  ]
                : tr("引用")
            : ""}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
const nodeTypes = { flowspace: CanvasNode },
  edgeTypes = { flowspace: CanvasEdge };
export function CanvasApp(props: {
  bridge: CanvasBridge;
  renderConversation: Actions["renderConversation"];
}) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
function Canvas({
  bridge,
  renderConversation,
}: {
  bridge: CanvasBridge;
  renderConversation: Actions["renderConversation"];
}) {
  const snapshot = bridge.useSnapshot(),
    [doc, setDoc] = useState(emptyDocument),
    docRef = useRef(doc),
    dirty = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout>>(),
    saving = useRef(Promise.resolve()),
    [saved, setSaved] = useState(true),
    [errorText, setError] = useState("");
  const [selection, setSelection] = useState<string[]>([]),
    [inspector, setInspector] = useState(false),
    [bottom, setBottom] = useState(false),
    [settings, setSettings] = useState(false),
    [map, setMap] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<"all" | "running">("all");
  const [workspaces, setWorkspaces] = useState<WorkspaceBrief[]>([]),
    [workspace, setWorkspace] = useState(""),
    [sessionList, setSessionList] = useState<SessionBrief[] | null>(null),
    [launchDialog, setLaunchDialog] = useState<{
      request: StartRequest;
      plan: LaunchPlan;
    }>();
  const [history, setHistory] = useState<FlowspaceDocument[]>([]),
    [future, setFuture] = useState<FlowspaceDocument[]>([]),
    [menu, setMenu] = useState(false);
  const flow = useReactFlow<GraphNode, GraphEdge>(),
    initialized = useRef(false);
  const revision = useRef(0),
    sentRevision = useRef(-1);
  const [measured, setMeasured] = useState<Record<string, Dimensions>>({});
  const error = useCallback(
    (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    [],
  );
  useEffect(() => bridge.connect(), [bridge]);
  useEffect(() => {
    void bridge
      .workspaces()
      .then((list) => {
        setWorkspaces(list);
        setWorkspace(list[0]?.id ?? "");
      })
      .catch(error);
  }, [bridge]);
  useEffect(() => {
    if (!snapshot) return;
    if (!dirty.current) {
      docRef.current = snapshot.document;
      setDoc(snapshot.document);
    } else {
      const local = {
        ...docRef.current,
        nodes: docRef.current.nodes.map((n) => {
          const host = snapshot.document.nodes.find((x) => x.id === n.id);
          return host?.sessionId
            ? {
                ...n,
                sessionId: host.sessionId,
                lastSubmittedTask: host.lastSubmittedTask,
              }
            : n;
        }),
      };
      docRef.current = local;
      setDoc(local);
    }
    if (!initialized.current) {
      initialized.current = true;
      setTimeout(() => flow.setViewport(snapshot.document.viewport), 80);
    }
  }, [snapshot]);
  useEffect(() => {
    const id = bridge.takeFocus();
    if (id) {
      setSelection([id]);
      setInspector(true);
      setTimeout(
        () => flow.fitView({ nodes: [{ id }], maxZoom: 1, duration: 250 }),
        80,
      );
    }
  }, [bridge, snapshot]);
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!dirty.current) {
      await saving.current;
      return;
    }
    const current = docRef.current,
      rev = revision.current;
    if (sentRevision.current === rev) {
      await saving.current;
      return;
    }
    sentRevision.current = rev;
    const save = saving.current.then(async () => {
      await bridge.save(current);
      if (revision.current === rev) {
        dirty.current = false;
        setSaved(true);
      }
    });
    saving.current = save.catch(error);
    await save;
  }, [bridge, error]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (dirty.current) void bridge.save(docRef.current).catch(error);
      bridge.presence([]);
    },
    [bridge],
  );
  const edit = useCallback(
    (change: (d: FlowspaceDocument) => void, remember = true) => {
      const next = structuredClone(docRef.current);
      if (remember) {
        setHistory((h) => [...h.slice(-39), docRef.current]);
        setFuture([]);
      }
      change(next);
      revision.current++;
      docRef.current = next;
      setDoc(next);
      dirty.current = true;
      setSaved(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush().catch(error), 500);
    },
    [flush, error],
  );
  const editNode = useCallback(
    (id: string, changes: Partial<FlowNode>) =>
      edit(
        (d) => {
          const n = d.nodes.find((n) => n.id === id);
          if (!n) return;
          if (changes.expanded === true && !n.expanded && n.kind === "agent") {
            // Only displace cards intersecting the expanded card; keep free layout elsewhere.
            for (const other of d.nodes)
              if (
                other.id !== n.id &&
                other.kind !== "group" &&
                other.x < n.x + 540 &&
                other.x + other.width > n.x &&
                other.y < n.y + 680 &&
                other.y + 250 > n.y
              ) {
                if (other.x >= n.x + n.width) other.x = n.x + 570;
                else if (other.y > n.y) other.y = n.y + 710;
              }
            const group = d.nodes.find((g) => g.id === n.parentId);
            if (group) {
              group.width = Math.max(group.width, n.x + 550 - group.x);
              group.height = Math.max(group.height, n.y + 710 - group.y);
            }
          }
          Object.assign(n, changes);
        },
        !("draft" in changes || "text" in changes),
      ),
    [edit],
  );
  const selectedNode = doc.nodes.find((n) => n.id === selection[0]),
    selectedEdge = doc.edges.find((e) => e.id === selection[0]);
  const launch = useCallback(
    (request: StartRequest) => {
      void (async () => {
        await flush();
        if (request.kind === "global")
          setLaunchDialog({ request, plan: await bridge.plan(request) });
        else await bridge.start(request);
        setBottom(true);
      })().catch(error);
    },
    [bridge, flush],
  );
  const bind = useCallback(
    (node: FlowNode) => {
      void (async () => {
        await flush();
        const bound = await bridge.bind({
          nodeId: node.id,
          workspaceId: node.workspaceId || workspace || undefined,
          cwd: node.cwd,
        });
        editNode(bound.id, { sessionId: bound.sessionId, expanded: true });
      })().catch(error);
    },
    [bridge, flush, workspace],
  );
  const select = useCallback(
    (id: string) => {
      setSelection([id]);
      setInspector(true);
      const n = docRef.current.nodes.find((n) => n.id === id);
      if (n)
        flow.setCenter(n.x + n.width / 2, n.y + (n.expanded ? 330 : 130), {
          zoom: Math.max(flow.getZoom(), 0.7),
          duration: 180,
        });
    },
    [flow],
  );
  const add = (kind: FlowNode["kind"], position?: { x: number; y: number }) => {
    const p =
      position ??
      flow.screenToFlowPosition({
        x: window.innerWidth * 0.48,
        y: window.innerHeight * 0.35,
      });
    const n = {
      ...newNode(kind, p.x, p.y),
      workspaceId: workspace || undefined,
      cwd: workspaces.find((w) => w.id === workspace)?.path,
    };
    edit((d) => d.nodes.push(n));
    select(n.id);
    setMenu(false);
  };
  const connect = (connection: Connection) => {
    const kind = connection.sourceHandle?.startsWith("exec")
      ? "continuation"
      : "reference";
    if (
      connection.targetHandle !==
      (kind === "continuation" ? "exec-in" : "ref-in")
    ) {
      error("引用口与接续口请分别连接");
      return;
    }
    edit((d) => {
      if (
        !d.edges.some(
          (e) =>
            e.source === connection.source &&
            e.target === connection.target &&
            e.kind === kind,
        )
      )
        d.edges.push(newEdge(connection.source, connection.target, kind));
    });
  };
  const group = () => {
    const chosen = doc.nodes.filter((n) => selection.includes(n.id));
    if (!chosen.length) return;
    const x = Math.min(...chosen.map((n) => n.x)) - 30,
      y = Math.min(...chosen.map((n) => n.y)) - 55;
    const n = newNode("group", x, y);
    n.width = Math.max(...chosen.map((n) => n.x + n.width)) - x + 30;
    n.height =
      Math.max(...chosen.map((n) => n.y + (n.expanded ? 600 : 260))) - y + 30;
    edit((d) => {
      d.nodes.push(n);
      for (const child of d.nodes.filter((n) => selection.includes(n.id)))
        child.parentId = n.id;
    });
    select(n.id);
  };
  const arrange = () =>
    edit((d) => {
      const selectedGroup = d.nodes.find(
        (n) => n.id === selection[0] && n.kind === "group",
      );
      const ids = selectedGroup ? new Set(members(d, selectedGroup.id)) : null;
      const targets = d.nodes.filter(
        (n) => n.kind !== "group" && (!ids || ids.has(n.id)),
      );
      let x = selectedGroup ? selectedGroup.x + 30 : 80;
      const y = selectedGroup ? selectedGroup.y + 60 : 130;
      for (const n of targets) {
        n.x = x;
        n.y = y;
        x += (n.kind === "agent" && n.expanded ? 520 : n.width) + 85;
      }
      if (selectedGroup) {
        selectedGroup.width = x - selectedGroup.x;
        selectedGroup.height = Math.max(
          ...targets.map((n) => (n.expanded ? 740 : 330)),
          330,
        );
      }
    });
  const remove = () =>
    edit((d) => {
      const ids = new Set(selection);
      d.nodes = d.nodes.filter((n) => !ids.has(n.id));
      d.nodes.forEach((n) => {
        if (n.parentId && ids.has(n.parentId)) delete n.parentId;
      });
      d.edges = d.edges.filter(
        (e) => !ids.has(e.id) && !ids.has(e.source) && !ids.has(e.target),
      );
    });
  const undo = (redo = false) => {
    const stack = redo ? future : history,
      target = stack.at(-1);
    if (!target) return;
    const before = docRef.current;
    if (redo) {
      setFuture(stack.slice(0, -1));
      setHistory((h) => [...h, before]);
    } else {
      setHistory(stack.slice(0, -1));
      setFuture((h) => [...h, before]);
    }
    edit((d) => {
      const live = d.nodes;
      Object.assign(d, structuredClone(target));
      d.nodes = d.nodes.map((n) => {
        const old = live.find((x) => x.id === n.id);
        return old?.sessionId
          ? {
              ...n,
              sessionId: old.sessionId,
              lastSubmittedTask: old.lastSubmittedTask,
            }
          : n;
      });
    }, false);
  };
  const hidden = (n: FlowNode | undefined): boolean => {
    if (!n) return true;
    let parent = doc.nodes.find((p) => p.id === n.parentId);
    while (parent) {
      if (parent.collapsed) return true;
      parent = doc.nodes.find((p) => p.id === parent!.parentId);
    }
    return (
      filter === "running" &&
      n.kind === "agent" &&
      !["running", "waiting", "queued", "input"].includes(
        statusOf(snapshot, n.id),
      )
    );
  };
  const nodes: GraphNode[] = doc.nodes.map((n) => ({
    id: n.id,
    type: "flowspace",
    position: { x: n.x, y: n.y },
    data: { model: n },
    measured: measured[n.id],
    selected: selection.includes(n.id),
    hidden: hidden(n),
    dragHandle: ".fs-drag",
    style: {
      width:
        n.kind === "group" && n.collapsed
          ? 280
          : n.expanded && n.kind === "agent"
            ? 520
            : n.width,
      height: n.kind === "group" ? (n.collapsed ? 100 : n.height) : undefined,
      zIndex: n.kind === "group" ? -1 : undefined,
    },
  }));
  const visibleEndpoint = (id: string): string => {
    let node = doc.nodes.find((n) => n.id === id),
      result = id;
    while (node?.parentId) {
      node = doc.nodes.find((n) => n.id === node!.parentId);
      if (node?.collapsed) result = node.id;
    }
    return result;
  };
  const edges: GraphEdge[] = doc.edges
    .filter(
      (e) =>
        !hidden(doc.nodes.find((n) => n.id === visibleEndpoint(e.source))) &&
        !hidden(doc.nodes.find((n) => n.id === visibleEndpoint(e.target))) &&
        !(
          visibleEndpoint(e.source) === visibleEndpoint(e.target) &&
          visibleEndpoint(e.source) !== e.source
        ),
    )
    .map((e) => ({
      id: e.id,
      type: "flowspace",
      source: visibleEndpoint(e.source),
      target: visibleEndpoint(e.target),
      sourceHandle: e.kind === "continuation" ? "exec-out" : "ref-out",
      targetHandle: e.kind === "continuation" ? "exec-in" : "ref-in",
      selected: selection.includes(e.id),
      data: {
        model: e,
        active: statusOf(snapshot, e.target) === "running",
        waiting: statusOf(snapshot, e.target) === "waiting",
      },
    }));
  useEffect(() => {
    bridge.presence(
      doc.nodes
        .filter((n) => n.expanded && n.sessionId && !hidden(n))
        .map((n) => n.sessionId!),
    );
  }, [doc.nodes, filter]);
  const actions = useMemo<Actions>(
    () => ({
      bridge,
      snapshot,
      editNode,
      launch,
      select,
      bind,
      error,
      renderConversation,
    }),
    [bridge, snapshot, editNode, launch, bind, renderConversation],
  );
  const titleOf = (id: string) =>
    doc.nodes.find((n) => n.id === id)?.title ?? id;
  return (
    <ActionsContext.Provider value={actions}>
      <div
        className={`fs-app ${doc.settings.reducedMotion ? "fs-calm" : ""}`}
        tabIndex={-1}
        onKeyDown={(event) => {
          const target = event.target as HTMLElement;
          if (
            target.closest('input, textarea, select, [contenteditable="true"]')
          )
            return;
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "z"
          ) {
            event.preventDefault();
            undo(event.shiftKey);
          }
          if (event.key === "Delete" && selection.length) {
            event.preventDefault();
            remove();
          }
          if (
            event.key.toLowerCase() === "g" &&
            !event.ctrlKey &&
            !event.metaKey &&
            selection.length
          ) {
            event.preventDefault();
            group();
          }
        }}
      >
        <header className="fs-top">
          <div className="fs-brand">
            <Workflow size={23} />
            <div>
              <b>FlowSpace</b>
              <span>AGENT WORKSPACE</span>
            </div>
          </div>
          <div className="fs-divider" />
          <select
            aria-label={tr("工作区")}
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
          >
            <option value="">{tr("当前工作区")}</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <span className="fs-grow" />
          <span className="fs-save">
            <i className={saved ? "saved" : ""} />
            {saved ? tr("已保存") : tr("保存中")}
          </span>
          <button title={tr("设置")} onClick={() => setSettings(!settings)}>
            <Settings2 size={17} />
          </button>
          <button title={tr("检查器")} onClick={() => setInspector(!inspector)}>
            {inspector ? (
              <PanelRightClose size={17} />
            ) : (
              <PanelRightOpen size={17} />
            )}
          </button>
          <button
            className="fs-primary"
            onClick={() =>
              launch({
                kind: selection.some((id) => doc.nodes.some((n) => n.id === id))
                  ? "selection"
                  : "global",
                nodeIds: selection,
              })
            }
          >
            <Play size={14} />
            {selection.some((id) => doc.nodes.some((n) => n.id === id))
              ? tr("运行选区")
              : tr("启动工作流")}
          </button>
        </header>
        <div className="fs-workspace">
          <main
            className="fs-canvas"
            onDoubleClick={(event) => {
              if (
                (event.target as HTMLElement).classList.contains(
                  "react-flow__pane",
                )
              )
                add(
                  "agent",
                  flow.screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY,
                  }),
                );
            }}
          >
            <div className="fs-toolbar">
              <div className="fs-dropdown">
                <button onClick={() => setMenu(!menu)}>
                  <Plus size={15} />
                  {tr("添加节点")}
                  <ChevronDown size={12} />
                </button>
                {menu && (
                  <div className="fs-menu">
                    {(["agent", "note", "file"] as const).map((k) => (
                      <button key={k} onClick={() => add(k)}>
                        {k === "agent"
                          ? "Agent"
                          : k === "note"
                            ? tr("便签")
                            : tr("文件引用")}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setMenu(false);
                        void bridge
                          .sessions()
                          .then(setSessionList)
                          .catch(error);
                      }}
                    >
                      {tr("已有会话…")}
                    </button>
                    <hr />
                    <button
                      onClick={() => {
                        edit((d) =>
                          Object.assign(
                            d,
                            sample(d, "review", {
                              workspaceId: workspace || undefined,
                            }),
                          ),
                        );
                        setMenu(false);
                        setTimeout(() => flow.fitView({ padding: 0.15 }), 100);
                      }}
                    >
                      {tr("分析 → 审查 → 汇总")}
                    </button>
                    <button
                      onClick={() => {
                        edit((d) =>
                          Object.assign(
                            d,
                            sample(d, "parallel", {
                              workspaceId: workspace || undefined,
                            }),
                          ),
                        );
                        setMenu(false);
                        setTimeout(() => flow.fitView({ padding: 0.15 }), 100);
                      }}
                    >
                      {tr("两路调查 → 汇总")}
                    </button>
                  </div>
                )}
              </div>
              <button
                title={tr("分组")}
                disabled={!selection.length}
                onClick={group}
              >
                <Layers size={16} />
              </button>
              <button title={tr("整理布局")} onClick={arrange}>
                <LayoutGrid size={16} />
              </button>
              <button
                title={tr("撤销")}
                disabled={!history.length}
                onClick={() => undo()}
              >
                <Undo2 size={16} />
              </button>
              <button
                title={tr("重做")}
                disabled={!future.length}
                onClick={() => undo(true)}
              >
                <Redo2 size={16} />
              </button>
              <div className="fs-divider" />
              <Search size={14} />
              <input
                placeholder={tr("定位 Agent…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = doc.nodes.find((n) => n.title.includes(query));
                    if (n) {
                      setSelection([n.id]);
                      flow.fitView({
                        nodes: [{ id: n.id }],
                        maxZoom: 1,
                        duration: 250,
                      });
                    }
                  }
                }}
              />
              <select
                aria-label={tr("显示筛选")}
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "running")}
              >
                <option value="all">{tr("全部节点")}</option>
                <option value="running">{tr("运行与等待")}</option>
              </select>
            </div>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onConnect={connect}
              onNodeClick={(event, n) =>
                setSelection((previous) =>
                  event.shiftKey ? [...new Set([...previous, n.id])] : [n.id],
                )
              }
              onEdgeClick={(_, e) => select(e.id)}
              onPaneClick={() => {
                setSelection([]);
                setMenu(false);
              }}
              onSelectionChange={({ nodes, edges }) =>
                setSelection([
                  ...nodes.map((n) => n.id),
                  ...edges.map((e) => e.id),
                ])
              }
              onNodesChange={(changes) => {
                const dimensions = changes.filter(
                  (c) => c.type === "dimensions",
                );
                if (dimensions.length)
                  setMeasured((previous) => {
                    const next = { ...previous };
                    for (const c of dimensions)
                      if (c.type === "dimensions" && c.dimensions)
                        next[c.id] = c.dimensions;
                    return next;
                  });
                const selections = changes.filter((c) => c.type === "select");
                if (selections.length)
                  setSelection((previous) => {
                    const ids = new Set(previous);
                    for (const c of selections)
                      if (c.type === "select") {
                        if (c.selected) ids.add(c.id);
                        else ids.delete(c.id);
                      }
                    return [...ids];
                  });
                const positions = changes.filter((c) => c.type === "position");
                if (positions.length)
                  edit((d) => {
                    for (const p of positions) {
                      if (p.type !== "position" || !p.position) continue;
                      const n = d.nodes.find((n) => n.id === p.id)!;
                      const dx = p.position.x - n.x,
                        dy = p.position.y - n.y;
                      if (n.kind === "group") {
                        const ids = groupDescendants(d, n.id);
                        d.nodes
                          .filter((x) => ids.includes(x.id))
                          .forEach((x) => {
                            x.x += dx;
                            x.y += dy;
                          });
                      }
                      n.x = p.position.x;
                      n.y = p.position.y;
                    }
                  }, false);
              }}
              onNodeDragStart={() => {
                setHistory((h) => [
                  ...h.slice(-39),
                  structuredClone(docRef.current),
                ]);
                setFuture([]);
              }}
              onNodeDragStop={(_, moved) =>
                edit((d) => {
                  const node = d.nodes.find((n) => n.id === moved.id)!;
                  const parent = d.nodes
                    .filter(
                      (n) =>
                        n.kind === "group" &&
                        n.id !== node.id &&
                        !groupDescendants(d, node.id).includes(n.id) &&
                        node.x > n.x &&
                        node.y > n.y + 40 &&
                        node.x < n.x + n.width &&
                        node.y < n.y + n.height,
                    )
                    .sort((a, b) => a.width * a.height - b.width * b.height)[0];
                  if (node.kind === "group" && parent?.parentId) return;
                  node.parentId = parent?.id;
                }, false)
              }
              onMoveEnd={(_, viewport) =>
                edit((d) => {
                  d.viewport = viewport;
                }, false)
              }
              defaultViewport={doc.viewport}
              minZoom={0.2}
              maxZoom={1.6}
              deleteKeyCode={null}
              selectionOnDrag
              panOnDrag={[1, 2]}
              panActivationKeyCode="Space"
              zoomOnDoubleClick={false}
              selectionKeyCode="Shift"
              fitView={false}
            >
              <Background gap={24} size={1} color="var(--fs-grid)" />
              <Controls showInteractive={false} />
              {map && <MiniMap pannable zoomable nodeColor="#9f8be5" />}
            </ReactFlow>
            {!doc.nodes.length && (
              <div className="fs-empty">
                <div className="fs-empty-symbol">
                  <Workflow size={38} />
                </div>
                <h1>{tr("让 Agent 接着工作")}</h1>
                <p>
                  {tr("双击创建 Agent，连接上下文与下一步。")}
                  <br />
                  {tr("每个节点都是一段可以继续的真实对话。")}
                </p>
                <button className="fs-primary" onClick={() => add("agent")}>
                  <Plus size={15} />
                  {tr("创建第一个 Agent")}
                </button>
                <button
                  onClick={() => {
                    edit((d) =>
                      Object.assign(
                        d,
                        sample(d, "review", {
                          workspaceId: workspace || undefined,
                        }),
                      ),
                    );
                    setTimeout(() => flow.fitView({ padding: 0.15 }), 100);
                  }}
                >
                  {tr("从三步工作流开始")}
                  <ArrowUpRight size={13} />
                </button>
              </div>
            )}
            <div className="fs-canvas-hint">
              <span>{tr("双击创建")}</span>
              <kbd>Space</kbd>
              <span>{tr("平移")}</span>
              <kbd>Shift</kbd>
              <span>{tr("多选")}</span>
              <button onClick={() => setMap(!map)}>{tr("小地图")}</button>
            </div>
          </main>
          {inspector && (
            <aside className="fs-inspector">
              <header>
                <span>{tr("检查器")}</span>
                <button onClick={() => setInspector(false)}>
                  <X size={16} />
                </button>
              </header>
              {selectedNode ? (
                <>
                  <div className="fs-section-label">
                    {selectedNode.kind === "agent"
                      ? "AGENT"
                      : selectedNode.kind.toUpperCase()}
                  </div>
                  <label>
                    {tr("名称")}
                    <input
                      value={selectedNode.title}
                      onChange={(e) =>
                        editNode(selectedNode.id, { title: e.target.value })
                      }
                    />
                  </label>
                  {selectedNode.kind === "agent" && (
                    <>
                      <label>
                        {tr("工作区")}
                        <select
                          disabled={!!selectedNode.sessionId}
                          value={selectedNode.workspaceId ?? ""}
                          onChange={(e) =>
                            editNode(selectedNode.id, {
                              workspaceId: e.target.value || undefined,
                            })
                          }
                        >
                          <option value="">{tr("当前工作区")}</option>
                          {workspaces.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {tr("任务预设")}
                        <textarea
                          value={selectedNode.task}
                          onChange={(e) =>
                            editNode(selectedNode.id, { task: e.target.value })
                          }
                          placeholder={tr("接到上游结果后做什么")}
                        />
                      </label>
                      <label>
                        {tr("原生对话触发接续")}
                        <select
                          value={selectedNode.nativeTrigger}
                          onChange={(e) =>
                            editNode(selectedNode.id, {
                              nativeTrigger: e.target
                                .value as FlowNode["nativeTrigger"],
                            })
                          }
                        >
                          <option value="inherit">
                            {tr("继承全局（")}
                            {doc.settings.nativeChatTriggers
                              ? tr("开启")
                              : tr("关闭")}
                            ）
                          </option>
                          <option value="enabled">{tr("开启")}</option>
                          <option value="disabled">{tr("关闭")}</option>
                        </select>
                      </label>
                      <label>
                        {tr("参与方式")}
                        <select
                          value={selectedNode.participation}
                          onChange={(e) =>
                            editNode(selectedNode.id, {
                              participation: e.target
                                .value as FlowNode["participation"],
                            })
                          }
                        >
                          <option value="global">{tr("参与工作流")}</option>
                          <option value="manual">{tr("仅手动")}</option>
                          <option value="paused">{tr("暂停参与")}</option>
                        </select>
                      </label>
                      <div className="fs-inspector-note">
                        {tr(
                          "引用口提供资料。标题栏的接续口决定下一步何时运行。",
                        )}
                      </div>
                      {selectedNode.sessionId && (
                        <button
                          onClick={() =>
                            bridge.openChat(selectedNode.sessionId!)
                          }
                        >
                          <MessageSquare size={14} />
                          {tr("打开原生对话")}
                        </button>
                      )}
                    </>
                  )}
                  <button className="fs-danger" onClick={remove}>
                    <Trash2 size={14} />
                    {tr("从画布移除")}
                  </button>
                  <small>{tr("移除节点不会删除 DSH 会话。")}</small>
                </>
              ) : selectedEdge ? (
                <>
                  <div className="fs-section-label">
                    {selectedEdge.kind === "continuation"
                      ? tr("接续")
                      : tr("引用")}
                  </div>
                  <h3>
                    {titleOf(selectedEdge.source)} →{" "}
                    {titleOf(selectedEdge.target)}
                  </h3>
                  {selectedEdge.kind === "continuation" ? (
                    <>
                      <label>
                        {tr("传递内容")}
                        <select
                          value={selectedEdge.mode}
                          onChange={(e) =>
                            edit((d) => {
                              d.edges.find(
                                (x) => x.id === selectedEdge.id,
                              )!.mode = e.target.value as FlowEdge["mode"];
                            })
                          }
                        >
                          <option value="conclusion">{tr("本轮结论")}</option>
                          <option value="session">{tr("会话文本快照")}</option>
                          <option
                            value="fork"
                            disabled={
                              !!doc.nodes.find(
                                (n) => n.id === selectedEdge.target,
                              )?.sessionId
                            }
                          >
                            {tr("历史分叉（仅草稿）")}
                          </option>
                        </select>
                      </label>
                      <label>
                        {tr("触发方式")}
                        <select
                          value={selectedEdge.trigger}
                          onChange={(e) =>
                            edit((d) => {
                              d.edges.find(
                                (x) => x.id === selectedEdge.id,
                              )!.trigger = e.target
                                .value as FlowEdge["trigger"];
                            })
                          }
                        >
                          <option value="auto">{tr("自动接续")}</option>
                          <option value="confirm">{tr("等待确认")}</option>
                          <option value="off">{tr("不自动触发")}</option>
                        </select>
                      </label>
                      <label>
                        {tr("循环最多轮数")}
                        <input
                          type="number"
                          min={1}
                          value={selectedEdge.maxRounds}
                          onChange={(e) =>
                            edit((d) => {
                              d.edges.find(
                                (x) => x.id === selectedEdge.id,
                              )!.maxRounds = Number(e.target.value);
                            })
                          }
                        />
                      </label>
                      <p className="fs-inspector-note">
                        {tr(
                          "会话引用包含用户与助手文本，不包含工具过程。排队前固定内容。",
                        )}
                      </p>
                    </>
                  ) : (
                    <label className="fs-inline">
                      <input
                        type="checkbox"
                        checked={selectedEdge.always}
                        onChange={(e) =>
                          edit((d) => {
                            d.edges.find(
                              (x) => x.id === selectedEdge.id,
                            )!.always = e.target.checked;
                          })
                        }
                      />
                      {tr("每次都附带")}
                    </label>
                  )}
                  {snapshot?.runs.filter(r => ["running", "waiting", "paused"].includes(r.state)).flatMap((run) =>
                    run.tokens
                      .filter(
                        (token) =>
                          token.edgeId === selectedEdge.id &&
                          !token.ready &&
                          !token.consumed &&
                          !token.dismissed,
                      )
                      .map((token) => (
                        <div className="fs-wait" key={token.id}>
                          <strong>{tr("待发内容")}</strong>
                          <pre>{token.source.text.slice(0, 600)}</pre>
                          <button
                            onClick={() =>
                              void bridge
                                .release(run.id, token.id, true)
                                .catch(error)
                            }
                          >
                            {tr("放行")}
                          </button>
                          <button
                            onClick={() =>
                              void bridge
                                .release(run.id, token.id, false)
                                .catch(error)
                            }
                          >
                            {tr("跳过")}
                          </button>
                        </div>
                      )),
                  )}
                  <button className="fs-danger" onClick={remove}>
                    <Trash2 size={14} />
                    {tr("删除连线")}
                  </button>
                </>
              ) : (
                <div className="fs-inspector-note">
                  {tr("选择节点或连线，查看任务、上下文与接续设置。")}
                </div>
              )}
            </aside>
          )}
        </div>
        <footer className="fs-bottom-bar">
          <button onClick={() => setBottom(!bottom)}>
            <Clock size={14} />
            {tr("运行记录")}
            <span>{snapshot?.runs.length ?? 0}</span>
            {bottom ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <span className="fs-grow" />
          <small>
            {doc.nodes.filter((n) => n.kind === "agent").length}{" "}
            {tr("个 Agent ·")}
            {doc.edges.length} {tr("条连接")}
          </small>
        </footer>
        {bottom && (
          <div className="fs-runs">
            {snapshot?.runs.length ? (
              [...snapshot.runs]
                .reverse()
                .map((run) => (
                  <RunRow
                    key={run.id}
                    run={run}
                    bridge={bridge}
                    select={select}
                    error={error}
                  />
                ))
            ) : (
              <p>{tr("从一个 Agent 开始，执行轨迹会出现在这里。")}</p>
            )}
          </div>
        )}
        {errorText && (
          <div className="fs-toast" role="alert">
            <AlertCircle size={16} />
            <span>{errorText}</span>
            <button onClick={() => setError("")}>
              <X size={14} />
            </button>
          </div>
        )}
        {settings && (
          <Modal title={tr("画布设置")} close={() => setSettings(false)}>
            <label className="fs-inline">
              <input
                type="checkbox"
                checked={doc.settings.nativeChatTriggers}
                onChange={(e) =>
                  edit((d) => {
                    d.settings.nativeChatTriggers = e.target.checked;
                  })
                }
              />
              {tr("原生对话默认触发接续")}
            </label>
            <p>{tr("节点可以单独覆盖。已开始的运行保留当时的接续关系。")}</p>
            <label className="fs-inline">
              <input
                type="checkbox"
                checked={doc.settings.reducedMotion}
                onChange={(e) =>
                  edit((d) => {
                    d.settings.reducedMotion = e.target.checked;
                  })
                }
              />
              {tr("减弱动效")}
            </label>
            <hr />
            <button
              onClick={() => {
                const a = document.createElement("a"),
                  url = URL.createObjectURL(
                    new Blob([JSON.stringify(doc, null, 2)], {
                      type: "application/json",
                    }),
                  );
                a.href = url;
                a.download = "flowspace.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={15} />
              {tr("导出画布")}
            </button>
            <label className="fs-file-input">
              <Upload size={15} />
              {tr("导入画布")}
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void file
                      .text()
                      .then((text) => {
                        const data = JSON.parse(text) as FlowspaceDocument;
                        return bridge.save(data);
                      })
                      .then((result) => {
                        docRef.current = result;
                        setDoc(result);
                      })
                      .catch(error);
                }}
              />
            </label>
          </Modal>
        )}
        {sessionList && (
          <Modal title={tr("添加已有会话")} close={() => setSessionList(null)}>
            {sessionList
              .filter(
                (s) => !doc.nodes.some((n) => n.sessionId === s.sessionId),
              )
              .map((s) => (
                <button
                  className="fs-session-row"
                  key={s.sessionId}
                  onClick={() => {
                    const n = {
                      ...newNode("agent", 100, 100, s.title),
                      sessionId: s.sessionId,
                      cwd: s.cwd,
                    };
                    edit((d) => d.nodes.push(n));
                    setSessionList(null);
                  }}
                >
                  <MessageSquare size={16} />
                  <span>
                    {s.title}
                    <small>{s.cwd}</small>
                  </span>
                </button>
              ))}
          </Modal>
        )}
        {launchDialog && (
          <Modal
            title={tr("启动清单")}
            close={() => setLaunchDialog(undefined)}
          >
            {(
              [
                ["立即运行", launchDialog.plan.roots],
                ["后续接续", launchDialog.plan.later],
                ["等待确认", launchDialog.plan.confirmation],
              ] as const
            ).map(([title, ids]) => (
              <section key={title}>
                <h4>
                  {tr(title)} · {ids.length}
                </h4>
                {ids.map((id) =>
                  title === "立即运行" ? (
                    <label className="fs-inline" key={id}>
                      <input
                        type="checkbox"
                        checked={
                          !launchDialog.request.excludeRootIds?.includes(id)
                        }
                        onChange={(e) =>
                          setLaunchDialog(
                            (previous) =>
                              previous && {
                                ...previous,
                                request: {
                                  ...previous.request,
                                  excludeRootIds: e.target.checked
                                    ? previous.request.excludeRootIds?.filter(
                                        (x) => x !== id,
                                      )
                                    : [
                                        ...(previous.request.excludeRootIds ??
                                          []),
                                        id,
                                      ],
                                },
                              },
                          )
                        }
                      />
                      {titleOf(id)}
                    </label>
                  ) : (
                    <p key={id}>{titleOf(id)}</p>
                  ),
                )}
              </section>
            ))}
            {!!launchDialog.plan.skipped.length && (
              <section>
                <h4>{tr("本次不运行")}</h4>
                {launchDialog.plan.skipped.map((s) => (
                  <p key={s.nodeId}>
                    {titleOf(s.nodeId)} <small>{s.reason}</small>
                  </p>
                ))}
              </section>
            )}
            <button
              className="fs-primary"
              disabled={
                !launchDialog.plan.roots.some(
                  (id) => !launchDialog.request.excludeRootIds?.includes(id),
                )
              }
              onClick={() => {
                const request = launchDialog.request;
                setLaunchDialog(undefined);
                void bridge.start(request).catch(error);
              }}
            >
              <Play size={14} />
              {tr("确认启动")}
            </button>
          </Modal>
        )}
      </div>
    </ActionsContext.Provider>
  );
}
function RunRow({
  run,
  bridge,
  select,
  error,
}: {
  run: FlowspaceRun;
  bridge: CanvasBridge;
  select: (id: string) => void;
  error: (e: unknown) => void;
}) {
  return (
    <details
      className="fs-run-row"
      open={["waiting", "error", "interrupted"].includes(run.state)}
    >
      <summary>
        <span className={"fs-status " + run.state}>
          <i />
          {tr(statuses[run.state])}
        </span>
        <b>{run.title}</b>
        <small>
          {run.steps.filter((s) => s.state === "completed").length}/
          {run.steps.length} {tr("完成 ·")}
          {run.origin === "chat" ? tr("原生对话") : tr("画布")}
        </small>
        <span className="fs-grow" />
        {["running", "waiting"].includes(run.state) && (
          <button
            onClick={(e) => {
              e.preventDefault();
              void bridge.command(run.id, "pause").catch(error);
            }}
          >
            <Pause size={13} />
          </button>
        )}
        {["paused", "interrupted"].includes(run.state) && (
          <button
            onClick={(e) => {
              e.preventDefault();
              void bridge.command(run.id, "resume").catch(error);
            }}
          >
            <Play size={13} />
            {tr("继续")}
          </button>
        )}
        {!["completed", "cancelled"].includes(run.state) && (
          <button
            onClick={(e) => {
              e.preventDefault();
              void bridge.command(run.id, "cancel").catch(error);
            }}
          >
            <Square size={12} />
          </button>
        )}
      </summary>
      <div className="fs-run-steps">
        {run.steps.map((step) => (
          <button key={step.id} onClick={() => select(step.nodeId)}>
            <span className={"fs-status " + step.state}>
              <i />
              {tr(statuses[step.state])}
            </span>
            <b>{run.graph.nodes.find((n) => n.id === step.nodeId)?.title}</b>
            <small>
              {tr("第")}
              {step.iteration} {tr("轮")}
            </small>
            {step.error && <p>{step.error}</p>}
          </button>
        ))}
        {run.notes.map((note, i) => (
          <p key={i}>{note}</p>
        ))}
      </div>
    </details>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="fs-modal-backdrop" onClick={close}>
      <div
        ref={ref}
        className="fs-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "Tab") {
            const items = Array.from(
              ref.current!.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,textarea,[tabindex="0"]',
              ),
            );
            if (e.shiftKey && document.activeElement === items[0]) {
              e.preventDefault();
              items.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
              e.preventDefault();
              items[0]?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <button onClick={close} aria-label={tr("关闭")}>
            <X size={18} />
          </button>
        </header>
        <div className="fs-modal-body">{children}</div>
      </div>
    </div>
  );
}
