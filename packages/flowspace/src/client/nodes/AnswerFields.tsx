import type { HumanField, JsonObject, JsonValue } from "../../types.ts";
import { Icon } from "../icons.tsx";
import { t } from "../i18n.ts";

const textValue = (value: JsonValue | undefined) =>
  value === undefined || value === null ? "" : String(value);

/** Answer controls for forms, launchpads and batch answers. Labels sit above each control; toggles sit inline. */
export function AnswerFields({ fields, values, change }: {
  fields: HumanField[]; values: JsonObject; change: (name: string, value: JsonValue) => void;
}) {
  return <>{fields.map(field => {
    const name = t(field.label);
    const caption = <span className="fs-human-label">{name}{field.required && <i aria-hidden="true">*</i>}</span>;
    const value = values[field.name];
    if (field.type === "boolean") return <div key={field.name} className="fs-human-field is-inline">
      {caption}
      <button type="button" role="switch" aria-checked={value === true} aria-label={name} className="switch"
        onClick={() => change(field.name, value !== true)} />
    </div>;
    if (field.type === "like") return <div key={field.name} className="fs-human-field is-inline">
      {caption}
      <button type="button" className="button-quiet fs-human-like" aria-pressed={value === true}
        onClick={() => change(field.name, value !== true)}><Icon name="star" />{t("flow_form_like")}</button>
    </div>;
    if (field.type === "score") return <div key={field.name} className="fs-human-field is-inline">
      {caption}
      <span className="fs-human-stars" role="radiogroup" aria-label={name}>{[1, 2, 3, 4, 5].map(score =>
        <button key={score} type="button" role="radio" aria-checked={Number(value) === score} aria-label={String(score)}
          className={score <= Number(value) ? "is-on" : undefined} onClick={() => change(field.name, score)}>
          <Icon name="star" />
        </button>)}</span>
    </div>;
    return <label key={field.name} className="fs-human-field">
      {caption}
      {field.type === "select" ? <select className="text-field select-field" value={textValue(value)}
        onChange={event => change(field.name, event.target.value)}>
        <option value="">—</option>{field.choices?.map(option => <option key={option}>{option}</option>)}
      </select>
        : field.type === "review" ? <textarea className="text-field fs-human-review" rows={4} value={textValue(value)}
          onChange={event => change(field.name, event.target.value)} />
        : <input className={field.type === "number" ? "text-field fs-exec-value" : "text-field"}
          type={field.type === "number" ? "number" : "text"} value={textValue(value)}
          onChange={event => change(field.name, field.type === "number" && event.target.value ? event.target.valueAsNumber : event.target.value)} />}
    </label>;
  })}</>;
}
