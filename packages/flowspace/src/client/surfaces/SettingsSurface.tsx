import type { CanvasPrefs, FlowspaceDocument } from "../../types.ts";
import { DEFAULT_LIST_LIMIT } from "../../core/content.ts";
import { getLanguage, t } from "../i18n.ts";
import { Icon } from "../icons.tsx";
import { BudgetFields } from "../nodes/PlayViews.tsx";

export function SettingsSurface({
  doc,
  prefs,
  onUpdatePrefs,
  onUpdateSettings,
  onToggleLanguage,
  onExportJson,
  onTriggerImport,
  onOpenExistingSessions,
  onLoadStarter,
}: {
  doc: FlowspaceDocument;
  prefs: Required<Pick<CanvasPrefs, "theme" | "wheel" | "wireRouting" | "snap" | "filter">>;
  onUpdatePrefs: (changes: Partial<CanvasPrefs>) => void;
  onUpdateSettings: (changes: Partial<FlowspaceDocument["settings"]>) => void;
  onToggleLanguage: (lang: "zh" | "en") => void;
  onExportJson: () => void;
  onTriggerImport: () => void;
  onOpenExistingSessions: () => void;
  onLoadStarter: () => void;
}) {
  const lang = getLanguage();
  const listLimit = doc.settings.listLimit ?? DEFAULT_LIST_LIMIT;
  return (
    <div className="fs-surface">
      <div className="surface-page settings-page">
        <header className="surface-page-header">
          <span className="eyebrow">FLOWSPACE · PREFERENCES</span>
          <h1>{t("settings")}</h1>
        </header>
        <section className="settings-section">
          <h2>{t("flow_budget_title")}</h2>
          <BudgetFields value={doc.settings.budget} update={budget => onUpdateSettings({ budget })} />
        </section>
        <section className="settings-section">
          <h2>{t("flow_trig_gate")}</h2>
          {(["cooldownSec", "dailyLimit"] as const).map(key => <label className="setting-row" key={key}>
            <span>{t(`flow_form_${key}`)}</span>
            <input className="text-field" type="number" min={key === "dailyLimit" ? 1 : 0} value={doc.settings.triggerGuards?.[key] ?? ""}
              onChange={event => onUpdateSettings({ triggerGuards: { ...doc.settings.triggerGuards,
                [key]: event.target.value ? event.target.valueAsNumber : undefined } })} />
          </label>)}
          <label className="setting-row">{t("flow_form_busy")}
            <select className="select-field" value={doc.settings.triggerGuards?.busy ?? "skip"}
              onChange={event => onUpdateSettings({ triggerGuards: { ...doc.settings.triggerGuards,
                busy: event.target.value as "skip" | "queue" | "interrupt" } })}>
              {(["skip", "queue", "interrupt"] as const).map(key => <option key={key} value={key}>{t(key === "skip" ? "flow_exec_skip" : `flow_form_${key}`)}</option>)}
            </select>
          </label>
          {typeof Notification !== "undefined" && <button type="button" className="button-quiet"
            onClick={() => { void Notification.requestPermission(); }}>{t("flow_notice_permission")}</button>}
        </section>

        <section className="settings-section">
          <h2>{t("appearance")}</h2>
          <div className="setting-row">
            <b>{t("theme")}</b>
            <div className="choice-buttons">
              {(
                [
                  ["auto", "followHost"],
                  ["dark", "dark"],
                  ["light", "light"],
                ] as const
              ).map(([val, labelKey]) => (
                <button
                  key={val}
                  type="button"
                  className={prefs.theme === val ? "selected" : ""}
                  onClick={() => onUpdatePrefs({ theme: val })}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <b>{t("language")}</b>
            <div className="choice-buttons">
              <button
                type="button"
                className={lang === "zh" ? "selected" : ""}
                onClick={() => onToggleLanguage("zh")}
              >
                {t("chinese")}
              </button>
              <button
                type="button"
                className={lang === "en" ? "selected" : ""}
                onClick={() => onToggleLanguage("en")}
              >
                {t("english")}
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>{t("interaction")}</h2>
          <div className="setting-row">
            <div>
              <b>{t("wireRouting")}</b>
              <p>
                {t(prefs.wireRouting === "avoid" ? "wireRoutingAvoidDescription" : "wireRoutingOverlapDescription")}
              </p>
            </div>
            <div className="choice-buttons" role="group" aria-label={t("wireRouting")}>
              {([
                ["avoid", "wireRoutingAvoid"],
                ["overlap", "wireRoutingOverlap"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={prefs.wireRouting === mode}
                  className={prefs.wireRouting === mode ? "selected" : ""}
                  onClick={() => onUpdatePrefs({ wireRouting: mode })}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <b>{t("wheelBehavior")}</b>
            <div className="choice-buttons">
              <button
                type="button"
                className={prefs.wheel === "zoom" ? "selected" : ""}
                onClick={() => onUpdatePrefs({ wheel: "zoom" })}
              >
                {t("zoom")}
              </button>
              <button
                type="button"
                className={prefs.wheel === "pan" ? "selected" : ""}
                onClick={() => onUpdatePrefs({ wheel: "pan" })}
              >
                {t("pan")}
              </button>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <b>{t("snapGrid")}</b>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.snap}
              className="switch"
              onClick={() => onUpdatePrefs({ snap: !prefs.snap })}
            />
          </div>
          <div className="setting-row">
            <div>
              <b>{t("reducedMotion")}</b>
              <p>{t("reducedMotionDescription")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={doc.settings.reducedMotion}
              className="switch"
              onClick={() =>
                onUpdateSettings({
                  reducedMotion: !doc.settings.reducedMotion,
                })
              }
            />
          </div>
        </section>

        <section className="settings-section">
          <h2>{t("orchestration")}</h2>
          <div className="setting-row">
            <div>
              <label htmlFor="fs-list-limit"><b>{t("flow_list_limit")}</b></label>
              <p id="fs-list-limit-description">{t("flow_list_limit_description")}</p>
            </div>
            <div className="fs-field">
              <input
                key={listLimit}
                id="fs-list-limit"
                aria-describedby="fs-list-limit-description"
                className="text-field"
                type="number"
                min={1}
                max={Number.MAX_SAFE_INTEGER}
                step={1}
                required
                defaultValue={listLimit}
                onKeyDown={event => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                onBlur={event => {
                  const field = event.currentTarget;
                  if (field.reportValidity() && field.valueAsNumber !== listLimit) {
                    onUpdateSettings({ listLimit: field.valueAsNumber });
                  }
                }}
              />
            </div>
          </div>
          <div className="setting-row">
            <div>
              <b>{t("nativeChatTriggers")}</b>
              <p>{t("nativeChatTriggersDescription")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={doc.settings.nativeChatTriggers}
              className="switch"
              onClick={() =>
                onUpdateSettings({
                  nativeChatTriggers: !doc.settings.nativeChatTriggers,
                })
              }
            />
          </div>
        </section>

        <section className="settings-section">
          <h2>{t("data")}</h2>
          <div className="setting-row">
            <b>{t("exportCanvas")}</b>
            <button type="button" className="button" onClick={onExportJson}>
              <Icon name="download" />
              <span>{t("download")}</span>
            </button>
          </div>
          <div className="setting-row">
            <b>{t("importCanvas")}</b>
            <button type="button" className="button" onClick={onTriggerImport}>
              <Icon name="upload" />
              <span>{t("import")}</span>
            </button>
          </div>
          <div className="setting-row">
            <b>{t("existingSession")}</b>
            <button
              type="button"
              className="button"
              onClick={onOpenExistingSessions}
            >
              <Icon name="chat" />
              <span>{t("existingSession")}</span>
            </button>
          </div>
          <div className="setting-row">
            <div>
              <b>{t("loadStarter")}</b>
              <p>{t("loadStarterDescription")}</p>
            </div>
            <button
              type="button"
              className="button button-primary"
              onClick={onLoadStarter}
            >
              <Icon name="plus" />
              <span>{t("useTemplate")}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
