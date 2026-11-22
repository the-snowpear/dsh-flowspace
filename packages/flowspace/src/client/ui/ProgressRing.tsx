import { t } from "../i18n.ts";

/**
 * Shared SVG progress ring used in TeamCanvas (compact 24px ring) and TeamView (labeled 36px ring).
 */
export function ProgressRing({
  done,
  total,
  variant = "labeled",
}: {
  done: number;
  total: number;
  variant?: "compact" | "labeled";
}) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  if (variant === "compact") {
    const r = 9;
    const c = 2 * Math.PI * r;
    return (
      <svg
        className="fs-crew-ring"
        width={24}
        height={24}
        viewBox="0 0 24 24"
        aria-label={t("teamTaskProgress", { done, total })}
      >
        <circle cx={12} cy={12} r={r} />
        <circle
          cx={12}
          cy={12}
          r={r}
          className="fs-crew-ring-done"
          strokeDasharray={`${ratio * c} ${c}`}
        />
      </svg>
    );
  }
  return (
    <svg className="fs-progress-ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" pathLength={100} />
      <circle
        cx="18"
        cy="18"
        r="15"
        pathLength={100}
        style={{ strokeDashoffset: 100 - ratio * 100 }}
      />
      <text x="18" y="18">
        {Math.round(ratio * 100)}
        <tspan dx="0.5" fontSize="6">
          %
        </tspan>
      </text>
    </svg>
  );
}
