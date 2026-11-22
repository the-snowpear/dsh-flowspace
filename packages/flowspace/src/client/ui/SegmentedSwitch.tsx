import { useId, useRef } from "react";
import { useSlidingIndicator } from "../hooks/useMotion.ts";
import { Icon } from "../icons.tsx";

export interface SegmentedChoice<T extends string> {
  value: T;
  label: string;
  icon?: string;
  badge?: string | number;
}

export function SegmentedSwitch<T extends string>({
  label,
  choices,
  value,
  onChange,
  size = "md",
}: {
  label: string;
  choices: SegmentedChoice<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  const name = useId();
  const root = useRef<HTMLDivElement>(null);
  useSlidingIndicator(root, "label:has(input:checked)", [value, choices.length]);
  return (
    <div ref={root} role="radiogroup" aria-label={label} className="fs-team-switch" data-size={size}>
      {choices.map((item) => (
        <label key={item.value}>
          <input
            type="radio"
            name={name}
            value={item.value}
            checked={value === item.value}
            onChange={() => onChange(item.value)}
          />
          <span>
            {item.icon && <Icon name={item.icon} />}
            {item.label}
            {item.badge !== undefined && item.badge !== "" && <small>{item.badge}</small>}
          </span>
        </label>
      ))}
    </div>
  );
}
