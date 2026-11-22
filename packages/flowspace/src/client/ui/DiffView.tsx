import type { DiffHunkView } from "../../types.ts";
import { t } from "../i18n.ts";

export function DiffHunks({ hunks }: { hunks: DiffHunkView[] }) {
  if (!hunks.length) {
    return <p className="muted fs-tool-empty-hint">{t("noOutput")}</p>;
  }
  return (
    <div className="fs-diff-view">
      {hunks.map((hunk, idx) => (
        <div key={idx} className="fs-diff-hunk">
          <div className="fs-diff-hunk-head">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines}{" "}
            @@
          </div>
          {hunk.lines.map((line, lIdx) => {
            const cls = line.startsWith("+")
              ? "add"
              : line.startsWith("-")
                ? "del"
                : "ctx";
            return (
              <div key={lIdx} className={`fs-diff-line ${cls}`}>
                {line}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
