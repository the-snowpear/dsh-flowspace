import { useId } from "react";
import { Icon } from "./icons.tsx";

export function TeamMark({ icon }: { icon: string }) {
  return <span className="fs-team-mark" aria-hidden="true"><Icon name={icon} /></span>;
}

type Choice<T extends string> = { value: T; label: string; icon: string };

export function TeamSwitch<T extends string>({ label, choices, value, onChange }: {
  label: string;
  choices: [Choice<T>, Choice<T>];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="fs-team-switch" data-second={value === choices[1].value}>
      {choices.map((item) => (
        <label key={item.value}>
          <input type="radio" name={name} value={item.value} checked={value === item.value}
            onChange={() => onChange(item.value)} />
          <span><Icon name={item.icon} />{item.label}</span>
        </label>
      ))}
    </div>
  );
}
