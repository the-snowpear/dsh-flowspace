import { Icon } from "../icons.tsx";
import { t } from "../i18n.ts";

export function Stepper({
  value,
  min = 1,
  max = 8,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <span className="fs-stepper" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={t("teamDecrease")}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Icon name="off" />
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        aria-label={t("teamIncrease")}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Icon name="plus" />
      </button>
    </span>
  );
}
