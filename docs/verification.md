# FlowSpace 0.2 verification

Date: 2026-11-18, Asia/Shanghai. Runtime: published DeepSeek Harness **0.2.2-rc.3**, Node **24.13.0**, Windows. All runs used project-local DSH homes and test workspaces. The user's global DSH installation and daily web profile were not upgraded or edited.

## Automated checks

`pnpm check` passes Host/Client TypeScript checks, the DSH client/Host/Remote build, and **21 unit & behavior tests**:

- Sequential roots and exactly-once successor dispatch.
- Parallel fan-in with explicit confirmation.
- A1/A2 context preservation while queued.
- Scope boundaries and explicit release.
- Three-round cycles with fixed external input.
- Error, blocked, aborted and max-token endings do not advance.
- Pause and resume, native-chat defaults and node overrides.
- Duplicate completion events and multiple steering inputs in one turn.
- Restart without replay, fork identity, manual busy-node queuing, excluded roots and manually started fork drafts.
- **M02**: Independent `continuationPrompt` isolation preserving live chat `draft` during upstream auto-continuations.
- **R5**: `rerunFailed` re-executing only failed/interrupted steps and downstream while reusing completed upstream snapshots, plus `deliverables/presented` run attachment.
- **M03 & D18**: Four-state reference capsules (`pending` / `sent` / `updated` / `always`) and `rerun: "update"` admission.
- **D38, M05 & M06**: Draft auto-naming, three-tier manual draft affiliation (`Explicit > Pre-click Selected Structure/Agent > Nearest Structure`), and four-tier derived structure bridging.
- **M08**: `HostGitService` inspecting repositories, staging/committing, parsing unified diff hunks, guarding `expectedRevision`, and creating/removing isolated Git worktrees.

`pnpm test:integration` boots the complete rc.3 Host with a clearly marked deterministic model. **Eleven scenarios pass**:

1. Real DSH Sessions, model streaming and serial continuation.
2. Persisted confirmation and stable run ownership.
3. Native chat creates one workflow run.
4. Node-level native-chat disabling.
5. Native fork at the captured event prefix.
6. Native/embedded composer receives canvas references.
7. Conversation text snapshot and native spill for a reference larger than 64 KiB.
8. Four-table `storageDomain` (`documents`, `runs`, `templates`, `snapshots`), tool nodes (`git`, `changes`, `terminal`), and Host Git/structure RPCs.
9. M02 independent `continuationPrompt` preserving live session chat draft across upstream continuation.
10. Profile disable/re-enable preserves saved data.
11. Host restart preserves draft, layout, templates, snapshots and run identity, without automatically replaying work.

`node scripts/package-smoke.mjs` extracts `artifacts/dsh-flowspace-0.2.0.tgz`, loads the extracted plugin with the locked runtime dependencies, and verifies the Host service and generated `flowspace/start`, `flowspace/gitInspect`, and `flowspace/rerunFailed` endpoints. It passes.

## Real model

`pnpm test:real` used the configured **deepseek-official / deepseek-flash** route. Two Agents independently computed 42, the join consumed both outputs and computed 84, and the final sequential Agent returned a result containing **84**. All four real Session turns completed. The output and run identities are in the ignored local artifact `artifacts/real-smoke.json`.

This verifies actual model execution and inter-Session context transfer. The deterministic integration results above are not presented as real model output.

## Browser checks

Playwright exercised the plugin inside the actual DSH Web UI:

- Sidebar entry and real embedded Conversation factory.
- Two expanded Session cards, independent content and native model/permission controls.
- Sending from the canvas, automatic successor execution and confirmation release.
- Native approval takeover with “Allow once”; the downstream node stayed unstarted while approval was pending.
- Node selection, multi-selection, grouping, folding/unfolding, arranging and viewport fit.
- Actual pointer drag from a note reference handle into an Agent reference handle; the graph gained a third connection.
- JSON download and import into the same canvas without changing Session identities.
- Chinese → English → Chinese, DSH dark/light appearance, reduced motion and a 900 × 720 viewport.
- Browser reload and Host restart retained the saved canvas and conversation identities.

Local visual evidence:

- `output/playwright/flowspace-dark-zh.png`
- `output/playwright/flowspace-dark-en.png`
- `output/playwright/flowspace-900.png`
- Earlier native approval/multiple-card evidence remains under the ignored `.playwright-cli` directory.

The initial dependency-injection, stylesheet loading and React Flow measurement issues found in browser testing were fixed and retested. The screenshots use the labelled integration model.

## Current release boundaries

The plugin delivers persistent multi-session orchestration, single-main-view live Agent cards with collapsible continuation prompt bars, `conversation.composer.dock` 4-state reference capsules, four-tier derived project/branch/worktree/subagent skeleton, three-tier draft affiliation with dual-directory worktree binding, OMP-migrated Git workbench nodes, native `workspace-changes` nodes, Phase 1 `terminalController.screen()` snapshot nodes, read-only native inter-agent message wires, floating window split-docking, slot-based template synchronization, state snapshots, and failed-step downstream rerun.

Summary handoff (`compaction`) and Web `iframe` tool nodes are intentionally excluded per product decisions (`M01`, `M10`). Phase 2 interactive `xterm` streaming inside Terminal cards (`terminalController.attach`) remains a future enhancement (`M09`).

Canvas persistence covers text drafts, connections, layout and run records. Browser-owned unsent native attachments retain DSH's existing lifecycle. Recovery does not reconstruct an interrupted provider request: completed results are preserved, remaining captured continuations can be resumed, and interrupted nodes are explicitly rerun by the user.

Windows Web is verified. macOS/Linux, multiple simultaneous editing clients, large-graph performance and full screen-reader coverage were not validated in this first delivery.

## Canvas performance verification · 2026-11-19

Windows, RTX 4080 Laptop, Chrome 157.0.8103.79, 1440 × 900, DPR 1, published DSH 0.2.2-rc.3. Playwright drove the original museum and synthetic grids in isolated mock profiles. The harness dismissed the DSH preview notice before sampling. A grid has 200 or 500 expanded Agent nodes plus one group, with 370 or 940 continuation edges. The minimap and project guides were enabled.

Each round zoomed from 86% to 44% and back with a fixed anchor. The table gives browser animation-frame intervals in milliseconds. The first round is cold. The hot crossing window includes the frame spanning the card switch and the following 320 ms of animation. Stable P95 uses the remaining hot samples. “Maximum” includes all observed frames, including cold frames and viewport settling.

| Scene | Rounds | Stable P95 | Cold crossing max | Hot crossing max | Maximum |
|---|---:|---:|---:|---:|---:|
| Museum, backup | 10 | 77.0 | 330.5 | 166.0 | 330.5 |
| Museum, current | 10 | 30.8 | 169.0 | 107.6 | 346.0 |
| 200, overlap, backup | 3 | 1504.2 | 1507.6 | 2176.9 | 2176.9 |
| 200, overlap, current | 10 | 34.7 | 153.9 | 149.9 | 153.9 |
| 200, avoidance, backup | 3 | 1465.4 | 1765.5 | 1819.1 | 1819.1 |
| 200, avoidance, current | 10 | 50.1 | 196.1 | 188.5 | 196.1 |
| 500, overlap, current | 10 | 53.8 | 280.7 | 188.5 | 280.7 |
| 500, avoidance, current | 10 | 53.9 | 330.7 | 207.7 | 330.7 |

On the matched first three rounds at 200 nodes, hot crossing maxima fell from 2176.9 to 138.5 ms for overlap and from 1819.1 to 188.5 ms for avoidance. At 86% the 200-node world had 1440 DOM descendants compared with 20,731 in the backup. Over ten museum rounds, cumulative style recalculation fell from 7807 to 5255 ms. Cumulative layout was 553 and 551 ms respectively. The 20 ms stable P95 target and the museum/200-node crossing targets of 33/50 ms remain open.

| Scene | Pan P95 | Node drag P95 | Group drag P95 |
|---|---:|---:|---:|
| Museum | 30.7 | 30.7 | 34.9 |
| 200, overlap | 53.9 | 73.1 | 96.1 |
| 200, avoidance | 65.4 | 134.7 | 107.7 |
| 500, overlap | 53.9 | 250.0 | 176.9 |
| 500, avoidance | 57.6 | 277.0 | 230.9 |

Browser checks exercised rapid reversals across 50%, single-step undo, cancelled movement, and real embedded Conversation focus and draft retention through zoom and offscreen pan. A deterministic model requested native approval and completed after approval. The run kept its canvas origin through the test. Floating and returning the card followed by a reload preserved the session ID and the unsent text draft. Browser-owned unsent file attachments were not separately exercised.

Dark and light museum screenshots were compared at both zoom levels. Mean absolute RGB channel differences over the four full-viewport pairs ranged from 0.18 to 0.96 on a scale of 255. Both versions retain the 320 ms card transition. The separate two-round Chrome profiles include style recalculation, layout, paint, and script activity.

Local evidence is under `output/playwright/`:

- `canvas-perf-1795057719731` and `canvas-perf-1795060893136` contain the museum and grid baseline reports.
- `canvas-perf-1795060705460` contains current raw frames, drag metrics, four museum screenshots, and the native approval capture.
- `canvas-perf-1795061104763/museum.trace.json` and `canvas-perf-1795061077616/museum.trace.json` contain the before and after Chrome traces. The latter directory also contains the rapid reversal capture.

To reproduce, build with `pnpm build`, make Playwright available to Node, then run `node --expose-internals --import tsx scripts/canvas-perf.mjs museum 200-overlap 200-avoid 500-overlap 500-avoid native`. The runner uses installed Chrome. Set `FLOWSPACE_PLAYWRIGHT` to an importable Playwright module URL when installed outside the workspace, `FLOWSPACE_PERF_LIB` to test a backup bundle, and `FLOWSPACE_PERF_TRACE=1` for a separate instrumented run. The two visual checks use `FLOWSPACE_VISUAL=1` and `FLOWSPACE_REVERSAL=1`.
