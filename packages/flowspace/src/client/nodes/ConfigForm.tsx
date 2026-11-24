import { useEffect, useId, useMemo, useState } from "react";
import { z } from "zod";
import type { FlowEdge, JsonObject, JsonValue, TeamModelRoute } from "../../types.ts";
import type { NodeDescriptor } from "../../core/nodes/types.ts";
import { mergeResultPort } from "../../core/connect.ts";
import type { CanvasBridge } from "../bridge.ts";
import { useModelRoutesState } from "../hooks/useModelRoutes.ts";
import { t } from "../i18n.ts";
import { ModelSelect } from "../TeamControls.tsx";
import { visibleDataFields } from "./dataForm.ts";

interface FieldSchema {
  type?: string;
  enum?: string[];
  default?: JsonValue;
  properties?: Record<string, FieldSchema>;
  required?: string[];
  items?: FieldSchema;
  minItems?: number;
  minimum?: number;
  maximum?: number;
}

function label(name: string) {
  const key = `flow_form_${name}`;
  const translation = t(key);
  return translation === key ? name : translation;
}

function initialValue(schema: FieldSchema, name: string): JsonValue {
  if (schema.default !== undefined) return structuredClone(schema.default);
  if (schema.enum) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries((schema.required ?? []).map(key =>
    [key, initialValue(schema.properties![key], key)]));
  if (schema.type === "array") return Array.from({ length: schema.minItems ?? 0 }, () => initialValue(schema.items!, name));
  if (schema.type === "integer" || schema.type === "number") return schema.minimum ?? 0;
  if (schema.type === "boolean") return false;
  return name === "id" ? crypto.randomUUID() : "";
}

interface FieldProps {
  name: string;
  schema: FieldSchema;
  value: JsonValue | undefined;
  optional?: boolean;
  mono?: boolean;
  dataType?: string;
  multiline?: boolean;
  change: (value: JsonValue | undefined) => void;
}

// What a node does comes first; where and how long it runs come after.
const FIRST = ["mode", "program", "action", "question", "message", "title", "options", "branches", "fields", "name", "scope", "type", "initial", "parameters"];
const rank = (key: string) => { const index = FIRST.indexOf(key); return index < 0 ? FIRST.length : index; };

function Fields({ schema, data, change, omit = [], only, dataType }: {
  schema: FieldSchema; data: JsonObject; change: (value: JsonObject) => void; omit?: string[];
  only?: readonly string[]; dataType?: string;
}) {
  const entries = Object.entries(schema.properties ?? {}).filter(([key]) => !omit.includes(key) && (!only || only.includes(key)));
  if (!only) entries.sort(([a], [b]) => rank(a) - rank(b));
  return <>{entries.map(([key, child]) =>
    <Field key={key} name={key} schema={child} value={data[key]} optional={!schema.required?.includes(key)}
      dataType={dataType}
      mono={key === "source" || (key === "value" && data.op === "regex") || (!!dataType &&
        (["path", "pattern", "delimiter", "template", "inputs"].includes(key) || (key === "value" && data.mode === "list")))}
      multiline={!!dataType && (["template", "delimiter"].includes(key) || (key === "value" && dataType === "flowspace/constant"))}
      change={value => {
        const next = { ...data };
        if (value === undefined) delete next[key];
        else next[key] = value;
        change(next);
      }} />)}</>;
}

function Field({ name, schema, value, optional, mono, dataType, multiline, change }: FieldProps) {
  const id = useId();
  const key = `flow_data_field_${name}`;
  const title = dataType && t(key) !== key && (name !== "value" || dataType === "flowspace/constant")
    ? t(key) : label(name === "wait" ? "wait_policy" : name);
  const fieldClass = mono ? "text-field fs-data-mono" : "text-field";
  const nested = schema.type === "object" || schema.type === "array";
  // Booleans are one switch row; an unset optional boolean reads as off.
  if (schema.type === "boolean") return <div className="fs-field fs-config-field switch-row fs-config-bool">
    <label className="fs-config-label" id={id + "-label"} htmlFor={id}>{title}</label>
    <button className="switch" type="button" role="switch" id={id} aria-labelledby={id + "-label"} aria-checked={value === true}
      onClick={() => change(value !== true)} />
  </div>;
  // Optional scalars stay visible; clearing the control unsets the key instead of toggling a second switch.
  const scalar = (next: JsonValue) => change(optional && next === "" ? undefined : next);
  return <div className="fs-field fs-config-field">
    <div className="switch-row">
      <label className="field-label" id={id + "-label"} htmlFor={id}>{title}</label>
      {optional && nested && <button className="switch" type="button" role="switch" aria-label={title} aria-checked={value !== undefined}
        onClick={() => change(value === undefined ? initialValue(schema, name) : undefined)} />}
    </div>
    {(!optional || !nested || value !== undefined) && (nested ? <div role="group" aria-labelledby={id + "-label"}>
      {schema.type === "object"
        ? <Fields schema={schema} data={(value ?? {}) as JsonObject} change={change} dataType={dataType} />
        : <ArrayField name={name} schema={schema} items={(value ?? []) as JsonValue[]} change={change} dataType={dataType} />}
    </div> : schema.enum ? <select className="text-field select-field" id={id} value={String(value ?? "")}
      onChange={e => scalar(e.target.value)}>
      {optional && <option value="">—</option>}
      {schema.enum.map(option =>
        <option key={option} value={option}>{name === "wait" ? t("flow_choice_wait_" + option) :
          dataType && ["mode", "order", "kind"].includes(name) ? t("flow_data_choice_" + option) : label(option)}</option>)}</select>
      : schema.type === "number" || schema.type === "integer" ? <input className="text-field fs-data-mono" type="number" id={id}
        step={schema.type === "integer" ? 1 : "any"} min={schema.minimum} max={schema.maximum} value={String(value ?? "")}
        placeholder={optional ? t("flow_form_unset_hint") : undefined}
        onChange={e => scalar(e.target.value === "" ? "" : e.target.valueAsNumber)} />
      : multiline || ["instruction", "question", "source", "description", "message"].includes(name)
        ? <textarea className={fieldClass} rows={name === "source" || name === "value" ? 5 : 2} id={id} value={String(value ?? "")}
          placeholder={optional ? t("flow_form_unset_hint") : undefined} onChange={e => scalar(e.target.value)} />
        : <input className={fieldClass} id={id} value={String(value ?? "")}
          placeholder={optional ? t("flow_form_unset_hint") : undefined} onChange={e => scalar(e.target.value)} />)}
  </div>;
}

function ArrayField({ name, schema, items, change, dataType }: { name: string; schema: FieldSchema; items: JsonValue[];
  change: (items: JsonValue[]) => void; dataType?: string }) {
  const item = schema.items!;
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    change(next);
  }
  return <div className="fs-config-list">
    {items.map((value, index) => <fieldset className="fs-config-item" key={index}>
      <legend>{label(name)} {index + 1}</legend>
      {item.type === "object" ? <Fields schema={item} data={value as JsonObject} dataType={dataType}
        change={v => change(items.map((old, i) => i === index ? v : old))} />
        : dataType === "flowspace/template" && name === "inputs"
          ? <input className="text-field fs-data-mono fs-config-body" aria-label={t("flow_data_field_inputs")} value={String(value ?? "")}
              onChange={event => change(items.map((old, i) => i === index ? event.target.value : old))} />
        : <Field name={name} schema={item} value={value} dataType={dataType}
          change={v => change(items.map((old, i) => i === index ? v! : old))} />}
      <div className="button-row">
        <button className="button-quiet" type="button" disabled={index === 0} onClick={() => move(index, -1)}>{label("up")}</button>
        <button className="button-quiet" type="button" disabled={index + 1 === items.length} onClick={() => move(index, 1)}>{label("down")}</button>
        <button className="text-button danger" type="button" disabled={items.length <= (schema.minItems ?? 0)}
          onClick={() => change(items.filter((_, i) => i !== index))}>{label("remove")}</button>
      </div>
    </fieldset>)}
    <button className="button-quiet" type="button" onClick={() => change([...items, initialValue(item, name)])}>{t("flow_form_add", { field: label(name) })}</button>
  </div>;
}

export function ConfigForm({ descriptor, value, bridge, connectedPorts, apply }: {
  descriptor: NodeDescriptor; value: JsonObject; bridge?: CanvasBridge;
  connectedPorts: { id: string; direction: "in" | "out" }[]; apply: (config: JsonObject) => Promise<void>;
}) {
  const schema = useMemo(() => z.toJSONSchema(descriptor.configSchema) as FieldSchema, [descriptor]);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const merge = descriptor.flowType === "flowspace/merge-sort";
  const fields = descriptor.family === "data" ? visibleDataFields(descriptor.flowType, draft) : undefined;
  const data = !!fields;
  const detailKey = merge && ["condition", "code", "ai"].includes(String(draft.sortMode))
    ? String(draft.sortMode) : fields?.find(key => ["condition", "code", "ai"].includes(key));
  const detailConfig = detailKey ? (draft[detailKey] ?? descriptor.defaultConfig[detailKey]) as JsonObject : undefined;
  const ai = descriptor.flowType === "flowspace/ai-judge" || detailKey === "ai";
  const modelFields = detailConfig ?? draft;
  const { routes, error: routeError } = useModelRoutesState(bridge, ai);
  async function submit() {
    setError("");
    setPending(true);
    try {
      await apply(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  }
  const draftPorts = descriptor.ports(draft);
  const disconnected = connectedPorts.filter(({id, direction}) => !draftPorts.some(port => port.direction === direction &&
    port.id === (merge && direction === "out" ? mergeResultPort(draft, id) : id)));
  const omitted = merge ? ["condition", "code", "ai", ...(draft.wait === "quorum" ? [] : ["quorum"]),
    ...(draft.wait === "all" ? ["cancelRest"] : [])] : ai ? ["provider", "model"] : [];
  if (data && !fields?.length) return null;
  return <div className="fs-config-form">
    <fieldset disabled={pending} style={{ display: "contents" }}>
    {(merge || data) && <Fields schema={schema} data={draft} change={setDraft}
      only={fields} omit={data ? ["condition", "code", "ai"] : omitted} dataType={data ? descriptor.flowType : undefined} />}
    {data && descriptor.flowType === "flowspace/constant" && draft.mode === "list" &&
      <p className="inspector-description">{t("flow_data_list_input_hint")}</p>}
    {data && descriptor.flowType === "flowspace/template" && <p className="inspector-description">{t("flow_data_named_hint")}</p>}
    {data && draft.mode === "template" && <p className="inspector-description">{t("flow_data_item_hint")}</p>}
    {ai && <div className="fs-field"><span className="field-label">{t("teamModel")}</span>
      <ModelSelect label={t("teamModel")} routes={routes} value={{ provider: String(modelFields.provider ?? ""), model: String(modelFields.model ?? "") }}
        onChange={model => {
          if (!model) return;
          const selected = { ...modelFields, provider: model.provider, model: model.model };
          setDraft(detailKey ? { ...draft, [detailKey]: selected } : selected);
        }} />
      {routeError && <p role="alert">{routeError}</p>}
    </div>}
    {!merge && !data && <Fields schema={schema} data={draft} change={setDraft} omit={omitted} />}
    {detailKey && detailConfig && schema.properties?.[detailKey] &&
      <Fields schema={schema.properties[detailKey]} data={detailConfig} omit={ai ? ["provider", "model"] : []}
        dataType={data ? descriptor.flowType : undefined}
        change={fields => setDraft({ ...draft, [detailKey]: fields })} />}
    {!!disconnected.length && <p className="muted">{t("flow_form_connected", { port: [...new Set(disconnected.map(port => port.id))].join(", ") })}</p>}
    {error && <pre className="file-preview" role="alert">{error}</pre>}
    <button className="button" type="button" disabled={JSON.stringify(draft) === JSON.stringify(value)} onClick={submit}>{label("apply")}</button>
    </fieldset>
  </div>;
}

export function EdgeLogicForm({ edge, apply }: { edge: FlowEdge; apply: (logic: FlowEdge["logic"]) => void }) {
  const logic = edge.logic ?? {};
  return <fieldset className="fs-config-item"><legend>{label("edge_logic")}</legend>
    <div className="switch-row fs-config-body"><span className="field-label">{label("negate")}</span>
      <button type="button" className="switch" role="switch" aria-label={label("negate")} aria-checked={!!logic.negate}
        onClick={() => apply({ ...logic, negate: !logic.negate })} /></div>
    {(["fromRound", "maxTimes", "delayMs"] as const).map(key =>
      <label className="fs-field" key={key}><span className="field-label">{label(key)}</span>
        <input className="text-field" type="number" min={0} step={1} placeholder={label("unset")} value={logic[key] ?? ""}
          onChange={e => {
            const next = { ...logic };
            if (!e.target.value) delete next[key];
            else if (e.target.validity.valid) next[key] = e.target.valueAsNumber;
            else return;
            apply(next);
          }} /></label>)}
  </fieldset>;
}
