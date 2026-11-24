import { useEffect, useState, type FormEvent } from "react";
import type { FlowspaceDocument, TeamModel, TeamModelReplacement, TeamModelRoute, WorkflowImportRequest } from "../types.ts";
import type { CanvasBridge } from "./bridge.ts";
import { CanvasDialog } from "./CanvasDialog.tsx";
import { TeamModelPicker } from "./TeamAssetEditor.tsx";
import { useModelRoutesState } from "./hooks/useModelRoutes.ts";
import { Icon } from "./icons.tsx";
import { t } from "./i18n.ts";
import { workflowNodes } from "../core/document.ts";
import { flowRunsCode } from "../core/nodes/registry.ts";

const key = (selection: TeamModel) => JSON.stringify([selection.provider, selection.model, selection.reasoningEffort ?? ""]);

export function containsCodeNode(request: WorkflowImportRequest): boolean {
  const nodes = request.document ? workflowNodes(request.document) : request.template?.nodes;
  return !!nodes?.some(flowRunsCode);
}

export function WorkflowImportDialog({ request, bridge, onClose, onImported, initialMissing = [] }: {
  request: WorkflowImportRequest;
  bridge: CanvasBridge;
  onClose: () => void;
  onImported: (doc: FlowspaceDocument) => void;
  initialMissing?: TeamModel[];
}) {
  const [copyAssets, setCopyAssets] = useState(false);
  const [enableTriggers, setEnableTriggers] = useState(false);
  const hasTriggers = (request.template?.nodes ?? request.document?.nodes ?? []).some(node => node.flowType === "flowspace/trigger");
  const [missing, setMissing] = useState(initialMissing);
  const { routes: cachedRoutes, loaded: routesLoaded, error: routeError } = useModelRoutesState(bridge, missing.length > 0);
  const routes = routesLoaded ? cachedRoutes : undefined;
  const [replacements, setReplacements] = useState<TeamModelReplacement[]>([]);
  const [pending, setPending] = useState(false);
  const [codeConfirmed, setCodeConfirmed] = useState(false);
  const [error, setError] = useState("");
  const bundled = request.dependencies;
  const canCopy = !!(bundled?.teams?.length || bundled?.roles?.length);
  const hasCode = containsCodeNode(request);

  useEffect(() => {
    if (routeError) setError(routeError);
  }, [routeError]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (hasCode && !codeConfirmed) return;
    setPending(true);
    setError("");
    try {
      const result = await bridge.importWorkflow({ ...request, replacements, copyAssets, enableTriggers });
      if (result.kind === "imported") {
        onImported(result.document);
      } else {
        setMissing(result.models);
      }
    } catch (failure) {
      setError(String(failure));
    } finally {
      setPending(false);
    }
  }

  function replace(model: TeamModel, to: TeamModel) {
    const original = replacements.find((entry) => key(entry.to) === key(model))?.from ?? model;
    setReplacements([...replacements.filter((entry) => key(entry.from) !== key(original)), { from: original, to }]);
  }

  return (
    <CanvasDialog title={t("workflowImport")} className="fs-team-dialog" onClose={onClose} closeLabel={t("close")}>
      <form className="fs-workflow-import" onSubmit={(event) => void submit(event)}>
        {hasCode && <fieldset disabled={pending}>
          <legend>{t("flow_view_import_code")}</legend>
          <p className="inspector-description">{t("flow_view_code_sandbox")}</p>
          <label className={`fs-team-import-option${codeConfirmed ? " is-checked" : ""}`}><input type="checkbox" checked={codeConfirmed}
            onChange={event => setCodeConfirmed(event.target.checked)} /><span>{t("flow_view_accept_code")}</span></label>
        </fieldset>}
        {hasTriggers && <label className={`fs-team-import-option${enableTriggers ? " is-checked" : ""}`}><input type="checkbox" checked={enableTriggers}
          onChange={event => setEnableTriggers(event.target.checked)} /><span>{t("flow_trig_enable_import")}</span></label>}
        {canCopy && (
          <fieldset disabled={pending}>
            <legend>{t("workflowImportAssets")}</legend>
            <label className={`fs-team-import-option${!copyAssets ? " is-checked" : ""}`}><Icon name="branch" /><span>{t("workflowReuseAssets")}</span><input type="radio" name="team-import" checked={!copyAssets}
              onChange={() => setCopyAssets(false)} /></label>
            <label className={`fs-team-import-option${copyAssets ? " is-checked" : ""}`}><Icon name="copy" /><span>{t("workflowCopyAssets")}</span><input type="radio" name="team-import" checked={copyAssets}
              onChange={() => setCopyAssets(true)} /></label>
            <p className="fs-team-muted">{t("workflowAssetModeHint")}</p>
          </fieldset>
        )}
        {!!missing.length && (
          <fieldset disabled={pending}>
            <legend>{t("workflowMissingModels")}</legend>
            {missing.map((model) => (
              <TeamModelPicker key={key(model)} label={`${model.provider}/${model.model}${model.reasoningEffort ? ` (${model.reasoningEffort})` : ""}`}
                routes={routes ?? []}
                value={replacements.find((entry) => key(entry.from) === key(model))?.to ?? { provider: "", model: "" }}
                onChange={(to) => replace(model, to)} />
            ))}
          </fieldset>
        )}
        {error && <p role="alert" className="fs-team-error">{error}</p>}
        <div className="fs-team-actions">
          <button type="submit" className="button button-primary" disabled={pending || (hasCode && !codeConfirmed)}><Icon name="upload" />{t("workflowImport")}</button>
        </div>
      </form>
    </CanvasDialog>
  );
}
