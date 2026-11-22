import type { FlowspaceDocument, WorkflowTemplate } from "../../types.ts";
import { getLanguage, t } from "../i18n.ts";
import { BrandMark, Icon } from "../icons.tsx";
import { allTemplates, builtinTemplates } from "../templates.ts";
import { templateCapabilityBadges } from "./formatters.ts";
import { MiniGraph } from "./MiniGraph.tsx";

export interface WelcomeStudioProps {
  doc?: FlowspaceDocument;
  onSelectTemplate: (template: WorkflowTemplate) => void;
  onCreateBlankAgent: () => void;
  onBrowseLibrary: () => void;
  onImportSession?: () => void;
}

export function WelcomeStudio({
  doc,
  onSelectTemplate,
  onCreateBlankAgent,
  onBrowseLibrary,
  onImportSession,
}: WelcomeStudioProps) {
  const builtins = builtinTemplates(getLanguage());
  const featured = builtins.slice(0, 4);
  const totalCount = doc
    ? allTemplates(doc, getLanguage()).length
    : builtins.length;

  return (
    <div className="fs-welcome-overlay">
      <div
        className="fs-welcome-card fs-welcome-studio"
        style={{
          maxWidth: 784,
          padding: "24px 26px 22px",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div className="fs-welcome-mark" style={{ margin: 0, flexShrink: 0 }}>
            <BrandMark />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="eyebrow">{t("welcomeEyebrow")}</span>
            <h1 style={{ margin: "3px 0 4px", fontSize: 20 }}>
              {t("welcomeTitle")}
            </h1>
            <p style={{ margin: 0, fontSize: 12.5 }}>
              {t("welcomeStudioSubtitle")}
            </p>
          </div>
        </div>

        <div
          className="fs-welcome-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {featured.map((tpl) => {
            const badges = templateCapabilityBadges(tpl).slice(0, 2);
            return (
              <button
                key={tpl.id}
                type="button"
                className="template-card fs-blueprint-pick"
                onClick={() => onSelectTemplate(tpl)}
                style={{
                  textAlign: "left",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <div className="template-graph" style={{ height: 88 }}>
                  <MiniGraph nodes={tpl.nodes} edges={tpl.edges} wireRouting={doc?.prefs?.wireRouting} />
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <b
                    style={{
                      display: "block",
                      fontSize: 13,
                      lineHeight: 1.35,
                      marginBottom: 4,
                    }}
                  >
                    {t(tpl.title)}
                  </b>
                  <small
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      color: "var(--text-3)",
                      fontSize: 11.5,
                      lineHeight: 1.5,
                    }}
                  >
                    {t(tpl.description)}
                  </small>
                  <div className="template-meta" style={{ marginTop: 8 }}>
                    <span>{t("nodesCount", { count: tpl.nodes.length })}</span>
                    {badges.map((b, bi) => (
                      <span key={bi} className={b.warn ? "warn" : ""}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="fs-welcome-actions"
          style={{ justifyContent: "space-between", marginBottom: 14 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="button button-primary"
              onClick={onCreateBlankAgent}
            >
              <Icon name="plus" />
              <span>{t("newAgent")}</span>
            </button>
            {onImportSession && (
              <button
                type="button"
                className="button"
                onClick={onImportSession}
              >
                <Icon name="chat" />
                <span>{t("existingSession")}</span>
              </button>
            )}
          </div>
          <button type="button" className="button" onClick={onBrowseLibrary}>
            <Icon name="box" />
            <span>{t("browseAllBlueprints", { count: totalCount })}</span>
          </button>
        </div>

        <div
          className="fs-welcome-legend"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            paddingTop: 12,
            borderTop: "1px solid var(--border)",
          }}
        >
          {(["legendPillRef", "legendPillCont", "legendPillMsg"] as const).map(
            (key) => (
              <span
                key={key}
                style={{
                  fontSize: 11,
                  color: "var(--text-3)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "var(--surface-2)",
                }}
              >
                {t(key)}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
