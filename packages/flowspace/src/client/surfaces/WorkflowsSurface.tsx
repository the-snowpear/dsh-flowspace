import type {
  CanvasSnapshot,
  FlowspaceDocument,
  FlowspaceSnapshot,
  WireRoutingMode,
  WorkflowTemplate,
} from "../../types.ts";
import type { CanvasBridge } from "../bridge.ts";
import { getLanguage, t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import { TeamLibrary } from "../TeamLibrary.tsx";
import { allTemplates, teamRevisionDifferences } from "../templates.ts";
import { formatDate, templateCapabilityBadges } from "./formatters.ts";
import { MiniGraph } from "./MiniGraph.tsx";

export function WorkflowsSurface({
  tab,
  onTabChange,
  bridge,
  doc,
  snapshot,
  onInstantiate,
  onPreviewTemplate,
  onExportTemplate,
  onImport,
  onDeleteTemplate,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onReturnCanvas,
}: {
  tab: "patterns" | "mine" | "snapshots" | "teams";
  onTabChange: (next: "patterns" | "mine" | "snapshots" | "teams") => void;
  bridge: CanvasBridge;
  doc: FlowspaceDocument;
  snapshot: FlowspaceSnapshot | null;
  onInstantiate: (template: WorkflowTemplate) => void;
  onPreviewTemplate: (template: WorkflowTemplate) => void;
  onExportTemplate: (template: WorkflowTemplate) => void;
  onImport: () => void;
  onDeleteTemplate: (templateId: string) => void;
  onRestoreSnapshot: (snap: CanvasSnapshot) => void;
  onDeleteSnapshot: (snapId: string) => void;
  onReturnCanvas: () => void;
}) {
  const templates = allTemplates(doc, getLanguage());
  const shownTemplates = templates.filter((tpl) =>
    tab === "patterns" ? tpl.builtin : !tpl.builtin,
  );
  const snapshots = doc.snapshots ?? [];

  return (
    <div className={tab === "teams" ? "fs-surface fs-team-shelf" : "fs-surface"}>
      <div className={tab === "teams" ? "surface-page fs-team-page" : "surface-page"}>
        <header className="surface-page-header">
          {tab !== "teams" && <span className="eyebrow">FLOWSPACE · STUDIO</span>}
          <h1>{t(tab === "teams" ? "teamLibraryTitle" : "workflowLibrary")}</h1>
          <p>{t(tab === "teams" ? "teamLibraryDescription" : "libraryDescription")}</p>
          <button type="button" className="button" onClick={onImport}>
            <Icon name="upload" />{t("workflowImport")}
          </button>
        </header>

        <div className="surface-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "patterns"}
            className={tab === "patterns" ? "selected" : ""}
            onClick={() => onTabChange("patterns")}
          >
            {t("builtIn")}
            <span>{templates.filter((x) => x.builtin).length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mine"}
            className={tab === "mine" ? "selected" : ""}
            onClick={() => onTabChange("mine")}
          >
            {t("mine")}
            <span>{(doc.templates ?? []).length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "snapshots"}
            className={tab === "snapshots" ? "selected" : ""}
            onClick={() => onTabChange("snapshots")}
          >
            {t("snapshots")}
            <span>{snapshots.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === "teams"}
            className={tab === "teams" ? "selected" : ""} onClick={() => onTabChange("teams")}>
            {t("teamLibrary")}
          </button>
        </div>

        {tab === "teams" ? <TeamLibrary bridge={bridge} snapshot={snapshot} /> : <div className="template-list">
          {tab !== "snapshots" ? (
            shownTemplates.length ? (
              shownTemplates.map((tpl, idx) => {
                const contCount = tpl.edges.filter(
                  (e) => e.kind === "continuation",
                ).length;
                const badges = templateCapabilityBadges(tpl);
                const teamChanges = teamRevisionDifferences(tpl, snapshot?.teamBlueprints);
                return (
                  <article
                    key={tpl.id}
                    className="template-card"
                    style={{ ["--i" as string]: idx }}
                  >
                    <div className="template-graph">
                      <MiniGraph nodes={tpl.nodes} edges={tpl.edges} wireRouting={doc.prefs?.wireRouting} />
                    </div>
                    <div className="template-text">
                      <h3 className={tpl.builtin ? "" : "user-content"}>
                        {tpl.builtin ? t(tpl.title) : tpl.title}
                      </h3>
                      <p>
                        {tpl.builtin
                          ? t(tpl.description)
                          : tpl.description || t("libraryDescription")}
                      </p>
                      <div className="template-meta">
                        <span>
                          {t("nodesCount", { count: tpl.nodes.length })}
                        </span>
                        <span>
                          {t("continuation")} {contCount}
                        </span>
                        {badges.map((b, bi) => (
                          <span key={bi} className={b.warn ? "warn" : ""}>
                            {b.label}
                          </span>
                        ))}
                        {teamChanges.map((change) => (
                          <span key={change.id} className="warn">{t("teamRevisionDifference", change)}</span>
                        ))}
                        <span>v{tpl.revision}</span>
                      </div>
                    </div>
                    <div className="template-actions">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => onInstantiate(tpl)}
                      >
                        <Icon name="plus" />
                        <span>{t("useTemplate")}</span>
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title={t("previewTemplate")}
                        onClick={() => onPreviewTemplate(tpl)}
                      >
                        <Icon name="eye" />
                      </button>
                      {!tpl.builtin && (
                        <>
                          <button type="button" className="icon-button" title={t("workflowExport")}
                            onClick={() => onExportTemplate(tpl)}><Icon name="download" /></button>
                          <button type="button" className="icon-button danger" title={t("delete")}
                            onClick={() => onDeleteTemplate(tpl.id)}><Icon name="trash" /></button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="surface-empty">
                <Icon name="box" />
                <h3>{t("noTemplates")}</h3>
                <p>{t("noTemplatesDescription")}</p>
                <button
                  type="button"
                  className="button"
                  onClick={onReturnCanvas}
                >
                  <Icon name="canvas" />
                  <span>{t("returnCanvas")}</span>
                </button>
              </div>
            )
          ) : snapshots.length ? (
            snapshots.toReversed().map((snap, idx) => (
              <article
                key={snap.id}
                className="snapshot-card"
                style={{ ["--i" as string]: idx }}
              >
                <div className="template-graph">
                  <MiniGraph
                    nodes={snap.nodes}
                    edges={snap.edges}
                    snapshot={snapshot}
                    wireRouting={doc.prefs?.wireRouting}
                  />
                </div>
                <div className="template-text">
                  <h3 className="user-content">{snap.title}</h3>
                  <p>{formatDate(snap.createdAt)}</p>
                  <div className="template-meta">
                    <span>
                      {t("nodesCount", {
                        count: snap.nodes.filter((n) => n.kind !== "group")
                          .length,
                      })}
                    </span>
                    {!!snap.summary?.drafts && (
                      <span>
                        {t("snapDrafts", { count: snap.summary.drafts })}
                      </span>
                    )}
                    {!!snap.summary?.stopping && (
                      <span className="bad">
                        {t("snapInterrupted", { count: snap.summary.stopping })}
                      </span>
                    )}
                    {!!snap.summary?.awaiting && (
                      <span className="warn">
                        {t("snapWaiting", { count: snap.summary.awaiting })}
                      </span>
                    )}
                    {!!snap.summary?.queued && (
                      <span className="warn">
                        {t("snapQueued", { count: snap.summary.queued })}
                      </span>
                    )}
                  </div>
                  {!!snap.summary?.recentOutputs?.length && (
                    <ul className="snapshot-recent">
                      {snap.summary.recentOutputs.map((out, i) => (
                        <li key={i}>
                          <Icon name="quote" />
                          <span className="user-content">
                            {out.title}：{out.snippet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="template-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => onRestoreSnapshot(snap)}
                  >
                    <Icon name="undo" />
                    <span>{t("restoreSnapshot")}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    title={t("delete")}
                    onClick={() => onDeleteSnapshot(snap.id)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="surface-empty">
              <Icon name="clock" />
              <h3>{t("noSnapshots")}</h3>
              <p>{t("noSnapshotsDescription")}</p>
              <button type="button" className="button" onClick={onReturnCanvas}>
                <Icon name="canvas" />
                <span>{t("returnCanvas")}</span>
              </button>
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}
