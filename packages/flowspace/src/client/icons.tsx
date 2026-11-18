import type { NodeKind } from "../types.ts";

export const ICONS: Record<string, string> = {
  bench: "M2 3h12v10H2z M6 3v10 M6 8h8",
  hand: "M6 7.5V3.2a1 1 0 0 1 2 0V7 M8 4V2.8a1 1 0 0 1 2 0V7 M10 4.5V3.6a1 1 0 0 1 2 0v5.9a4 4 0 0 1-4 4H6.8a3.8 3.8 0 0 1-3.1-1.6L2.2 9.7a1 1 0 0 1 1.5-1.3L6 10V4.5",
  pointer: "M4.2 2.4l7.6 6.2-3.4.5 1.8 3.6-1.6.8-1.8-3.6-2.6 2.3z",
  chat: "M2.5 3.5h11v7H8l-3 2.5v-2.5H2.5z",
  canvas: "M2 3h4v3H2z M10 10h4v3h-4z M6 4.5h1.5c2 0 .5 7 2.5 7",
  home: "M2.5 8L8 3l5.5 5 M4 7v6h8V7",
  clock: "M8 2a6 6 0 1 0 0 12a6 6 0 1 0 0-12 M8 5v3l2 2",
  box: "M2.5 5L8 2l5.5 3v6L8 14l-5.5-3z M2.5 5L8 8l5.5-3 M8 8v6",
  server: "M3 3h10v4H3z M3 9h10v4H3z M5.5 5h.01 M5.5 11h.01",
  gear: "M8 5.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M8 1.5v2 M8 12.5v2 M1.5 8h2 M12.5 8h2 M3.4 3.4l1.4 1.4 M11.2 11.2l1.4 1.4 M12.6 3.4l-1.4 1.4 M4.8 11.2l-1.4 1.4",
  agent: "M3.5 6h9v6.5h-9z M8 6V3.5 M6.2 9.2h.01 M9.8 9.2h.01",
  project: "M2 4h4l1.5 2H14v7H2z",
  branch: "M5 3v10 M11 3v2.5c0 3-6 2-6 5",
  worktree: "M8 2v12 M8 6l4-2 M8 9L4 7 M8 12l4-2",
  file: "M4 2h5l3 3v9H4z M9 2v3h3",
  git: "M8 2l6 6-6 6-6-6z M8 5.5v5",
  diff: "M4 5h8 M8 2.5v5 M4 12h8",
  web: "M8 2a6 6 0 1 0 0 12a6 6 0 1 0 0-12 M2 8h12 M8 2c2.5 2 2.5 10 0 12 M8 2c-2.5 2-2.5 10 0 12",
  term: "M2 3h12v10H2z M4.5 6l2.5 2-2.5 2 M8.5 10.5h3",
  note: "M3 3h10v7l-3 3H3z M10 13v-3h3",
  board: "M2 3h12v10H2z M6 3v10 M10 3v10",
  pin: "M8 10v4 M5 10h6 M6 10V4h4v6",
  pop: "M9 3h4v4 M13 3L8 8 M11 9v4H3V5h4",
  chev: "M6 4l4 4-4 4",
  card: "M2 4h12v8H2z M2 7h12",
  eye: "M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z M8 6.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3",
  eyeoff: "M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z M3 3l10 10",
  search: "M7 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M10 10l3.5 3.5",
  plus: "M8 3v10 M3 8h10",
  fit: "M3 6V3h3 M10 3h3v3 M13 10v3h-3 M6 13H3v-3",
  tidy: "M3 4h10 M3 8h6 M3 12h8",
  group: "M3 3h4 M9 3h4 M3 13h4 M9 13h4 M3 3v4 M3 9v4 M13 3v4 M13 9v4",
  x: "M4 4l8 8 M12 4l-8 8",
  moon: "M8 2.5a5.5 5.5 0 1 0 5.5 5.5A4.5 4.5 0 0 1 8 2.5z",
  sun: "M8 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6 M8 1.5v1.8 M8 12.7v1.8 M1.5 8h1.8 M12.7 8h1.8 M3.4 3.4l1.3 1.3 M11.3 11.3l1.3 1.3 M12.6 3.4l-1.3 1.3 M4.7 11.3l-1.3 1.3",
  send: "M8 13V3 M4 7l4-4 4 4",
  undo: "M4 6h6a3 3 0 0 1 0 6H6 M6 3.5L3.5 6 6 8.5",
  redo: "M12 6H6a3 3 0 0 0 0 6h4 M10 3.5L12.5 6 10 8.5",
  more: "M4 8h.01 M8 8h.01 M12 8h.01",
  side: "M2 3h12v10H2z M10 3v10",
  sidebarLeft: "M2 3h12v10H2z M5.5 3v10",
  bottom: "M2 3h12v10H2z M2 10h12",
  play: "M5.5 3.5v9l7-4.5z",
  pause: "M5.5 3.5v9 M10.5 3.5v9",
  stop: "M4.5 4.5h7v7h-7z",
  check: "M3.5 8.5l3 3 6-7",
  off: "M4 8h8",
  bolt: "M9 2L4 9h3.5L7 14l5-7H8.5z",
  quote:
    "M3.5 5.5h3v3h-3z M9.5 5.5h3v3h-3z M6.5 8.5c0 1.6-1 2.6-2.5 3 M12.5 8.5c0 1.6-1 2.6-2.5 3",
  at: "M8 5.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M10.5 6v3.2c0 1 .7 1.6 1.5 1.6 1 0 2-1 2-2.8a6 6 0 1 0-2.6 5",
  help: "M8 2a6 6 0 1 0 0 12a6 6 0 1 0 0-12 M6.4 6.2a1.7 1.7 0 0 1 3.2.7c0 1.1-1.6 1.4-1.6 2.5 M8 11.4h.01",
  download: "M8 2.5v7.5 M5 7.5L8 10.5l3-3 M3 13h10",
  upload: "M8 10.5V3 M5 6l3-3 3 3 M3 13h10",
  trash: "M3.5 4.5h9 M6 4.5V3h4v1.5 M5 4.5l.6 8.5h4.8l.6-8.5",
  refresh: "M13 8a5 5 0 1 1-1.4-3.5 M13 2.8v3.2H9.8",
  unplug: "M5 11L11 5 M4 8L2.5 9.5a2.8 2.8 0 0 0 4 4L8 12 M12 8l1.5-1.5a2.8 2.8 0 0 0-4-4L8 4",
  grip: "M6 4.5h.01 M10 4.5h.01 M6 8h.01 M10 8h.01 M6 11.5h.01 M10 11.5h.01",
};

export function Icon({
  name,
  className = "ic",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d={ICONS[name] ?? ""} />
    </svg>
  );
}

export function kindIconName(kind: NodeKind | string): string {
  switch (kind) {
    case "agent":
      return "agent";
    case "file":
    case "files":
      return "file";
    case "note":
      return "note";
    case "display":
      return "quote";
    case "board":
      return "board";
    case "detail":
      return "card";
    case "group":
      return "canvas";
    case "git":
      return "git";
    case "changes":
      return "diff";
    case "terminal":
      return "term";
    case "project":
      return "project";
    case "branch":
      return "branch";
    case "worktree":
      return "worktree";
    default:
      return "card";
  }
}

export function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="fs-brand-svg">
      <defs>
        <linearGradient id="fs-brand-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#132242" />
          <stop offset="100%" stopColor="#0c1322" />
        </linearGradient>
        <linearGradient id="fs-brand-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4d7cfe" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#fs-brand-bg)" />
      <rect
        x="6"
        y="7.5"
        width="7.5"
        height="6"
        rx="2"
        fill="none"
        stroke="#4d7cfe"
        strokeWidth="1.8"
      />
      <rect
        x="18.5"
        y="18.5"
        width="7.5"
        height="6"
        rx="2"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1.8"
      />
      <path
        d="M13.5 10.5 C 18 10.5, 14 21.5, 18.5 21.5"
        fill="none"
        stroke="url(#fs-brand-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="22.2" cy="10.5" r="2.2" fill="#4cc38a" />
    </svg>
  );
}
