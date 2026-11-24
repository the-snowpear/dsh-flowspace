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

## Performance audit verification · 2026-11-22

The production client shrank from 3,961,577 to 1,894,111 bytes, or from 591,656 to 343,100 bytes with Node gzip. The routing worker now imports rectangle operations directly and the production builder minifies the client. This measurement covers the plugin payload.

The Host merges snapshot notifications over 16 ms. In a 500-node mock profile, one consumer received 40 snapshots from 40 simulated live updates with the baseline Host and five with the updated Host. Both delivered the final sequence number, 39. First delivery, slow consumers, reconnection through a new subscription, cancellation and disposal are covered by the feed tests. The client also reuses its run-history index when a live update preserves the reconciled runs.

Chrome 157.0.8103.79 ran eight rounds on the 500-agent overlap grid described above. Each build ran in a separate mock profile on the same machine. Frame intervals come from the browser's animation-frame timestamps. The style total covers the eight zoom-out and zoom-in pairs.

| Measurement | Original build | Updated build |
| --- | ---: | ---: |
| Pan P95 | 65.3 ms | 34.7 ms |
| Single-node drag P95 | 119.2 ms | 138.6 ms |
| Group drag P95 | 134.5 ms | 146.2 ms |
| Ordinary zoom P95 | 15.4 ms | 15.4 ms |
| Warm detail-threshold crossing P95 | 211.5 ms | 219.2 ms |
| Worst frame across the zoom passes | 242.3 ms | 315.4 ms |
| Cumulative style recalculation | 8,252 ms | 7,226 ms |

Large-scene panning improved in this comparison. Threshold crossings and node dragging still drop frames, and the observed worst frame increased. Raw samples, timing windows and screenshots are in the local reports. Original run (`output/playwright/canvas-perf-1795342935016/report.json`) · Updated run (`output/playwright/canvas-perf-1795343994374/report.json`)

`pnpm check` passed all 214 tests. The browser verified native approval, focus retention, offscreen sessions, floating cards, draft recovery after reload, and accelerated rendering with 12 active wires. The default integration run passed initial execution and cold restart. Its portable phase stopped when DSH received Win32 error 5 while granting the terminal sandbox access to the fixture directory. The original build reproduced the error. Six independent checks subsequently passed for triggers, playback and budgets, fanout, fanout policies, data transforms and watched files. In a separately authorized disposable session, the native terminal returned 42 and exit code 0 for `node -p "21 * 2"`. The terminal was closed and the session restored to `workspace-write`.

## Phase 0.6 canvas verification · 2026-11-23

Chrome 157.0.8103.79 ran at 1440 × 900 and DPR 1 on Windows with DSH 0.2.2-rc.3. Trace was off. The overlap grid ran 10 threshold-crossing rounds and 10 regular zoom rounds. The overview grid ran six 28% ↔ 42% rounds and all three 20-frame drag samples. The overview style total includes those drag samples. Baseline (`output/playwright/canvas-perf-1795412974025/report.json`) · Phase 0.6 (`output/playwright/canvas-perf-1795416481742/report.json`)

| Scenario and measurement | Baseline | Phase 0.6 | Phase 0 blocker |
| --- | ---: | ---: | --- |
| Overlap DOM at 44% | 3,137 | 1,457 | Pass (<1,600) |
| Overlap DOM at 86% | 1,664 | 1,556 | Advisory |
| Overlap regular zoom P95 | 7.8 ms | 7.8 ms | Pass (<16 ms) |
| Overlap threshold crossing P95 | 184.6 ms | 65.4 ms | Pass (≤145 ms) |
| Overlap overall warm zoom P95 / stable P95 | 76.8 / 53.8 ms | 34.7 / 11.7 ms | Advisory |
| Overlap cold / warm threshold max / overall max | 176.9 / 269.2 / 269.2 ms | 138.4 / 146.0 / 146.0 ms | Advisory |
| Overlap style recalculation total (per round) | 8,055 ms (805.5 ms) | 5,161 ms (516.1 ms) | Fail (≤5,000 ms, median 5,577 ms) |
| Overlap layout / script total | 494 / 970 ms | 393 / 1,128 ms | Advisory |
| Overlap pan P95 / max | 15.3 / 130.8 ms | 38.4 / 89.7 ms | Fail (≤18 ms P95) |
| Overlap node drag P95 / max | 65.4 / 96.2 ms | 88.4 / 104.1 ms | Fail (≤75 ms P95) |
| Overlap group drag P95 / max | 61.5 / 65.5 ms | 96.1 / 100.0 ms | Fail (≤71 ms P95) |
| Overview DOM at 28% | 6,567 | 4,591 | Pass (<4,800) |
| Overview zoom P95 / max | 23.1 / 269.2 ms | 53.7 / 142.3 ms | Fail (≤23 ms P95) |
| Overview style recalculation total (per round including drags) | 5,104 ms (850.7 ms) | 4,115 ms (685.8 ms) | Pass (≤4,500 ms) |
| Overview layout / script total | 162 / 792 ms | 219 / 815 ms | Advisory |
| Overview pan P95 / max | 53.7 / 138.5 ms | 146.2 / 157.6 ms | Fail (≤59 ms P95) |
| Overview node drag P95 / max | 119.2 / 246.1 ms | 199.9 / 419.3 ms | Fail (≤131 ms P95) |
| Overview group drag P95 / max | 157.7 / 157.8 ms | 200.2 / 230.7 ms | Fail (≤173 ms P95) |

The first overlap style total exceeded its limit by 3.2%. Two further 10-round runs on the same build produced 5,692 ms and 5,577 ms. The three-run median is 5,577 ms, or 557.7 ms per round. Second run (`output/playwright/canvas-perf-1795416658286/report.json`) · Third run (`output/playwright/canvas-perf-1795416724288/report.json`)

`pnpm check` passed all 225 tests. The browser passed all six assertions in each of `native` and `native-large`. Drag samples verified position updates, Escape cancellation and Ctrl+Z undo. The large fixture exposed a scroll reset when a mounted native conversation was hidden. The card now restores that conversation's scroll position when it reappears. A browser probe found that the installed DSH uses `content-box` for an unstyled div, so the FlowSpace reset keeps border-box sizing with tag selectors scoped outside the embedded conversations. Check log (`output/playwright/perf-phase06-final-check.log`) · Native approval capture (`output/playwright/canvas-perf-1795416481742/native-large-approval.png`)

`pnpm test:integration` passed 17 initial and three restored assertions. The portable phase stopped at `verifyOperations` when DSH returned Win32 error 5 while granting terminal sandbox access to the fixture directory. The exact pre-change Host reproduced the error. A fresh portable profile passed the other 16 assertions, and the six independent checks for triggers, playback and budgets, fanout, fanout policies, data transforms and watched files passed. Integration log (`output/playwright/perf-phase06-integration.log`) · Baseline reproduction (`output/playwright/perf-phase06-paired-host.log`) · Portable supplement (`output/playwright/perf-phase06-integration-portable.log`) · Independent checks (`output/playwright/perf-phase06-integration-independent.log`)

The verified bundle is under `.local/perf-architecture-phase06/lib`. The working tree's generated `lib/client.js` was restored byte-for-byte to the user's pre-existing local bundle.

Performance blockers remain. The work paused at Phase 0.

## Phase 0.7 canvas verification · 2026-11-23

P0.7 removed the eight moving-world transition selectors and kept the raster-layer selectors. It also removed the dynamic HUD backdrop-filter switch and its viewport refs. The benchmark used Chrome 157.0.8103.79 at 1440 × 900, DPR 1, with Trace off. It ran 10 overlap rounds and six overview rounds at 28% ↔ 42%. Pre-change baseline (`output/playwright/canvas-perf-1795412974025/report.json`) · P0.6 report (`output/playwright/canvas-perf-1795416481742/report.json`) · P0.7 report (`output/playwright/canvas-perf-1795417791850/report.json`)

| Scenario and measurement | Pre-change | P0.6 | P0.7 | P0.7 gate |
| --- | ---: | ---: | ---: | --- |
| Overlap DOM at 44% | 3,137 | 1,457 | 1,457 | Pass (<1,600) |
| Overlap regular zoom P95 | 7.8 ms | 7.8 ms | 7.8 ms | Pass (<16 ms) |
| Overlap threshold crossing P95 | 184.6 ms | 65.4 ms | 73.1 ms | Pass (≤145 ms) |
| Overlap stable P95 | 53.8 ms | 11.7 ms | 15.5 ms | Advisory |
| Overlap style recalculation total (per round) | 8,055 ms (805.5 ms) | 5,161 ms (516.1 ms) | 5,056 ms (505.6 ms) | Fail (≤5,000 ms, three-run median 5,259 ms) |
| Overlap pan P95 / max | 15.3 / 130.8 ms | 38.4 / 89.7 ms | 27.0 / 99.8 ms | First run above 25 ms, retests 19.3 and 19.1 ms P95 |
| Overlap node drag P95 / max | 65.4 / 96.2 ms | 88.4 / 104.1 ms | 88.6 / 119.3 ms | Pass (≤100 ms P95) |
| Overlap group drag P95 / max | 61.5 / 65.5 ms | 96.1 / 100.0 ms | 103.8 / 111.5 ms | First run passes (≤105 ms P95), retests 130.8 and 111.1 ms P95 |
| Overview DOM at 28% | 6,567 | 4,591 | 4,591 | Pass (<4,800) |
| Overview zoom P95 / max | 23.1 / 269.2 ms | 53.7 / 142.3 ms | 38.6 / 142.5 ms | Fail (≤23 ms P95) |
| Overview style recalculation total (per round including drags) | 5,104 ms (850.7 ms) | 4,115 ms (685.8 ms) | 3,555 ms (592.5 ms) | Pass (≤4,500 ms) |
| Overview pan P95 / max | 53.7 / 138.5 ms | 146.2 / 157.6 ms | 104.0 / 157.7 ms | Fail (≤59 ms P95) |
| Overview node drag P95 / max | 119.2 / 246.1 ms | 199.9 / 419.3 ms | 200.0 / 327.0 ms | Fail (≤165 ms P95) |
| Overview group drag P95 / max | 157.7 / 157.8 ms | 200.2 / 230.7 ms | 203.7 / 204.2 ms | Fail (≤185 ms P95) |

The first overlap style total exceeded the limit by 1.1%. The same build produced 5,452 ms and 5,259 ms in two further 10-round runs. The median was 5,259 ms, or 525.9 ms per round. Second run (`output/playwright/canvas-perf-1795417986468/report.json`) · Third run (`output/playwright/canvas-perf-1795418050116/report.json`)

`pnpm check` passed all 225 tests. `museum` completed, and `native` and `native-large` passed all six assertions each. The Host and RPC bundles matched P0.6 byte-for-byte, so the previous integration evidence applies. The verified P0.7 build is under `.local/perf-architecture-phase07/lib`, and the working tree's generated client was restored byte-for-byte to its pre-run contents. Phase 0 remains below the release criteria. Check log (`output/playwright/perf-phase07-check.log`)

The project owner approved the Phase 0 release with a waiver for the remaining performance thresholds. Phase 1 uses P0.7 as its comparison baseline. The overlap reference is 73.1 ms threshold-crossing P95 and 5,259 ms median style recalculation across three 10-round runs. The overview reference is 38.6 ms zoom P95 and 3,555 ms cumulative style recalculation across six rounds and the three drag samples.

## Phase 1 canvas verification · 2026-11-23

The client now publishes camera, drag, hover and marquee updates through the canvas interaction store. Node and group dragging transforms the registered elements and updates only the attached wire previews. Pointer release commits positions once and creates one undo entry. The routing worker accepts obstacle deltas and routes both guides and workflow wires. Avoid-mode dragging shows an overlap preview immediately and requests an avoid route after 120 ms of inactivity or after the geometry commit.

Chrome 157.0.8103.79 ran at 1440 × 900 and DPR 1 with Trace off. The overlap crossing used 10 rounds and the overview used six 28% ↔ 42% rounds. P0.7 baseline (`output/playwright/canvas-perf-1795417791850/report.json`) · Phase 1 report (`output/playwright/canvas-perf-1795421194231/report.json`)

| Scenario and metric | Baseline | Phase 1 | Phase 2 gate |
| --- | ---: | ---: | --- |
| 500-overlap crossing P95 | 73.1 ms | 26.9 ms | Pass (≤80.41 ms) |
| 500-overlap style recalculation total (per round) | 5,259 ms (525.9 ms) | 4,496 ms (449.6 ms) | Pass (≤5,784.9 ms) |
| 500-overlap node / group drag P95 | 88.6 / 103.8 ms | 19.2 / 26.9 ms | Both above the gate (<18 ms each) |
| 500-avoid node / group drag P95 | 161.5 / 188.3 ms (pre-Phase 0) | 15.4 / 38.5 ms | Node passes, group fails (<25 ms each) |
| 500-zoomed-out zoom P95 | 38.6 ms | 23.0 ms | Pass (≤42.46 ms) |
| 500-zoomed-out style recalculation total (per round including drags) | 3,555 ms (592.5 ms) | 2,999 ms (499.8 ms) | Pass (≤3,910.5 ms) |
| 500-zoomed-out node / group drag P95 | 200.0 / 203.7 ms | 26.9 / 54.0 ms | Both above the gate (<25 ms each) |

`pnpm check` passed all 227 tests, including channel isolation and worker route parity and revision rejection. The full browser suite completed and both `native` and `native-large` passed 6/6. Drag samples verified position updates, Escape cancellation and Ctrl+Z undo. Host and RPC artifacts matched the verified P0.7 build byte-for-byte. This phase inherits the recorded integration verification. Check log (`output/playwright/phase1-release-check.log`)

The overlap and overview node-drag P95 values exceeded their thresholds by less than 10% in the full run. Two retests on the same build yielded overlap node-drag P95 values of 19.2 ms and 15.4 ms, with a median of 19.2 ms. Overview node-drag retests yielded 33.3 ms and 42.3 ms, with a median of 33.3 ms. Neither median passes. The three group-drag P95 values were 26.9, 30.6 and 26.9 ms in overlap and 54.0, 42.3 and 53.7 ms in overview. Second run (`output/playwright/canvas-perf-1795421442713/report.json`) · Third run (`output/playwright/canvas-perf-1795421515267/report.json`)

The verified Phase 1 build is under `.local/perf-architecture-phase1/lib`. The working tree's generated `lib/client.js` was restored byte-for-byte to the pre-run contents. Phase 1 remains blocked on drag latency.

## Phase 1 release decision · 2026-11-23

The project owner approved Phase 1 with a waiver for the remaining drag latency and authorized Phase 2. The accepted reference is the 10-round report `canvas-perf-1795421194231`, with the previously recorded three-run node-drag medians of 19.2 ms for overlap and 33.3 ms for overview. Phase 2 retains its own absolute gates. Phase 1 report (`output/playwright/canvas-perf-1795421194231/report.json`)

## Phase 2 canvas verification · 2026-11-23

The fixed-viewport `WireCanvasStage` now owns workflow, accessory, exchange, structure and staffing wires. It uses mathematical M/L/Q/C arc sampling, persistent browser `Path2D` resources, indexed geometric hits, and one WebGL2 draw call for animated styles. Camera motion updates uniforms. Dragging updates attached wires through the interaction store. Edges whose endpoints move together reuse their paths by translation. Avoid routing retains the asynchronous worker and obstacle-revision checks. Temporary connecting wires use a small viewport overlay. Large scenes show capsules for waiting, boundary, selected and hovered edges.

The implementation adds bounded offscreen bitmaps for stationary wires and long dotted guides. Their size follows the viewport and a 192-pixel margin. This was an implementation choice after direct Canvas2D drawing caused repeated long-path rasterization. Moving edges are drawn in the same final Canvas2D pass. Theme tokens are cached outside the paint loop. The WebGL layer stops when its visible animated set is empty and falls back to animated Canvas2D on a real context-loss event.

`pnpm check` passed **229/229 tests**, including hit tolerance, nearest-edge selection, candidate filtering, stale-index removal, mathematical arc length, finite mesh caps and degenerate paths. Host and RPC output matched the archived Phase 1 build byte-for-byte. Check log (`output/playwright/phase2-final-check.log`)

`pnpm test:integration` passed **17/17 initial** and **3/3 cold-restart** assertions. The portable phase reproduced the recorded `verifyOperations` terminal sandbox failure, `SetNamedSecurityInfoW / Win32 5`. A new disposable portable profile passed the remaining **16/16 assertions**, including triggers, playback/budget, fanout, fanout policies, data transforms and watched content. The identical Host bytes and earlier paired reproduction establish the baseline comparison for the sandbox failure. Full integration log (`output/playwright/phase2-integration.log`) · Portable supplement (`output/playwright/phase2-integration-portable.log`) · Initial assertions (`.local/integration-1795429001369-34168/integration-initial.json`) · Restart assertions (`.local/integration-1795429001369-34168/integration-restored.json`) · Portable assertions (`.local/phase2-portable-1795429397208/integration-portable.json`) · Baseline reproduction (`output/playwright/perf-phase06-paired-host.log`)

The acceptance run used Chrome **157.0.8103.79**, 1440 × 900, DPR 1, Trace and selector statistics disabled, default **10 rounds** for threshold crossing and **six 28% ↔ 42% rounds** plus three drag samples for overview. `FLOWSPACE_VISUAL=1` captured both themes. The source was frozen for the run. Phase 2 report (`output/playwright/canvas-perf-1795429652386/report.json`) · Acceptance log (`output/playwright/phase2-acceptance.log`)

| Scenario and metric | Phase 1 reference | Phase 2 | Phase 2 gate | Result |
| --- | ---: | ---: | ---: | --- |
| 500-overlap canvas wire SVG paths | 99 in paired diagnostic | 0 | <10 | Pass |
| 500-avoid canvas wire SVG paths | — | 0 | <10 | Pass |
| 500-zoomed-out canvas wire SVG paths | 307 in paired diagnostic | 0 | <10 | Pass |
| 500-overlap DOM at 44% | 1,457 | 1,298 | <650 | **Blocker** |
| 500-overlap DOM at 86% | 1,556 | 1,125 | Advisory | — |
| 500-overlap regular zoom P95 | 7.7 ms | 7.8 ms | <12 ms | Pass |
| 500-overlap hot crossing P95 | 26.9 ms | 65.3 ms | <90 ms | Pass |
| 500-overlap hot crossing max | 242.2 ms | 134.7 ms | Advisory | — |
| 500-overlap cold max | 188.4 ms | 134.5 ms | Advisory | — |
| 500-overlap stable P95 | 19.1 ms | 7.8 ms | Advisory | — |
| 500-overlap style recalculation, 10 rounds | 4,496 ms / 449.6 ms per round | 4,270 ms / 427.0 ms per round | <2,500 ms | **Blocker** |
| 500-overlap layout / script totals | 361 / 961 ms | 331 / 1,148 ms | Advisory | — |
| 500-overlap pan P95 | 11.5 ms | 38.7 ms | <16 ms | **Blocker** |
| 500-overlap node drag P95 | 19.2 ms | 23.1 ms | <16 ms | **Blocker** |
| 500-overlap group drag P95 | 26.9 ms | 37.6 ms | <16 ms | **Blocker** |
| 500-avoid node drag P95 | 15.4 ms | 30.0 ms | <20 ms | **Blocker** |
| 500-avoid group drag P95 | 38.5 ms | 46.3 ms | <20 ms | **Blocker** |
| 500-avoid regular / hot crossing P95 | 7.7 / 19.2 ms | 7.8 / 65.5 ms | Advisory | — |
| 500-avoid style recalculation, 10 rounds | 3,995 ms / 399.5 ms per round | 4,301 ms / 430.1 ms per round | Advisory | — |
| 500-avoid pan P95 | 15.3 ms | 38.5 ms | Advisory | — |
| 500-zoomed-out DOM at 28% | 4,591 | 4,120 | <2,500 | **Blocker** |
| 500-zoomed-out zoom P95 | 23.0 ms | 57.6 ms | <18 ms | **Blocker** |
| 500-zoomed-out zoom max | 88.4 ms | 230.8 ms | Advisory | — |
| 500-zoomed-out pan P95 | 92.2 ms | 92.3 ms | <20 ms | **Blocker** |
| 500-zoomed-out node drag P95 | 26.9 ms primary / 33.3 ms three-run median | 196.5 ms | <20 ms | **Blocker** |
| 500-zoomed-out group drag P95 | 54.0 ms | 68.8 ms | <20 ms | **Blocker** |
| 500-zoomed-out style total, six rounds and drags | 2,999 ms / 499.8 ms per round | 2,998 ms / 499.7 ms per round | <2,500 ms | **Blocker** |
| 500-zoomed-out layout / script totals | 151 / 412 ms | 186 / 508 ms | Advisory | — |
| flow-12-1 accelerated wires | — | 12 | 12 | Pass |
| flow-12-1 camera-only buffer uploads | — | 0 | 0 | Pass |
| flow-12-1 idle main-thread time per frame | — | 1.4 ms | ≤2.0 ms | Pass |
| flow-12-1 idle frame P95 | — | 4.3 ms | <12 ms | Pass |

Both `native` and `native-large` passed **6/6**. Pan/node/group samples completed position and one-step undo checks, and the explicit Escape-cancel sample passed. The additional `wire-stage` case passed hover, selection, double-click waypoint insertion, context-menu waypoint insertion, context-menu deletion and undo. The flow case passed real context loss/restoration, both themes and idle hiding. A same-build supplemental flow run compared fallback pixels across 150 ms and verified that Canvas2D continues animating after context loss. It reported 12 accelerated wires, zero camera-only uploads, 1.7 ms main-thread time per idle frame and 4.0 ms idle P95. Fallback animation report (`output/playwright/canvas-perf-1795429957242/report.json`) · Fallback log (`output/playwright/phase2-fallback-animation.log`)

Visual inspection covered the museum's light/dark full and compact views and the 12-wire flow scene, including group fills over wires. Museum light (`output/playwright/canvas-perf-1795429652386/museum-light-full.png`) · Museum dark (`output/playwright/canvas-perf-1795429652386/museum-dark-full.png`) · Flow light (`output/playwright/canvas-perf-1795429652386/flow-12-1x-light.png`) · Flow dark (`output/playwright/canvas-perf-1795429652386/flow-12-1x-dark.png`)

At 44%, the 1,298 world descendants contain **1,275 card-layer descendants across 24 mounted cards**, 17 group descendants and zero edge capsules. At 28%, the 4,120 descendants contain **4,097 card-layer descendants across 80 cards**, 17 group descendants and zero edge capsules. The Phase 1 renderer already culled SVG to the painted area, with 99 paths in the paired overlap diagnostic and 307 at overview scale. The requested DOM thresholds are below the current card layer alone. Reducing that population requires a card-layer change beyond the Phase 2 wire migration.

Diagnostic work included direct drawing, guide clipping, style batches, bounded static bitmaps, compositing isolation and draw suppression. A separate overview trace attributed 4,870.8 ms to `Layerize` and 3,375.9 ms to `UpdateLayoutTree`, with much lower JavaScript paint costs. A same-session Phase 1 rerun also worsened from its archived reference, producing overlap node/group P95 of 38.3/46.2 ms and overview node/group P95 of 53.9/65.6 ms. These diagnostics show environmental variation and remaining browser composition cost, while the final run still shows additional Phase 2 regressions. The two-round overlap diagnostic is **951 ms style total / 475.5 ms per round** and has no acceptance status. The overview diagnostic retains six rounds and is **3,459 ms / 576.5 ms per round**. Paired Phase 1 diagnostic (`output/playwright/canvas-perf-1795428211381/report.json`) · Overview trace (`output/playwright/canvas-perf-1795427791116/overview.trace.json`)

All failed final gates exceed the 10% borderline band, so the three-run median exception does not apply. **Phase 2 remains blocked on card DOM, cumulative style recalculation, and pan/zoom/drag latency. Phase 3 is awaiting the project owner's decision.** The checked build is archived at `.local/perf-architecture-phase2/lib`. Existing edits and `.local/perf-architecture-phase1/` were preserved. The generated working-tree `packages/flowspace/lib/client.js` is restored from the pre-Phase 2 backup, with byte equality checked. The primary pre-edit backup is `.backups/2026-11-23T09-28-46-275Z`.

## P2.6 cache correction and Phase 2 release · 2026-11-23

The project owner transferred the 44%/28% DOM gates, cumulative style-recalculation gates and overview pan/zoom targets to Phase 3. P2.6 retains the calibrated performance gates below, including overview zoom ≤45 ms and no regression against a same-environment Phase 1 run. The final P2.6 build passes every remaining functional, architectural and performance blocker. Phase 2 is eligible for release to Phase 3. Execution is paused here for the requested report.

`WireCanvasStage` now caches full-opacity base wire styles. Selection dims the cached image with global alpha and draws connected or selected wires above it. Hover updates schedule a repaint without rebuilding the full wire set. Static painting groups strokes by style and calls `stroke(cachedPath2D)` individually. The caches use four LRU slots each, persistent `OffscreenCanvas` surfaces, 384/zoom padding, a 0.55–1.8 density reuse interval, and a 2,560-pixel backing-size limit per side. Camera settling reuses covering entries. Frequent short dashes maintain approximately five screen pixels of spacing below 50% zoom.

The implementation uses direct workflow strokes for full-detail overlap dragging and reusable masked copies for overview and avoid dragging. The initial overview direct-paint diagnostic reached 8.3 ms P95, meeting the requested condition for switching to the mask path. Copying the cached surface measured at most 0.1 ms. In the mask diagnostic, workflow drawing measured 0.4 ms P95 for node and group drags, and the whole wire frame callback measured 1.2/0.9 ms P95. Moving guides use a scratch copy, leaving the persistent guide image intact. Guide-worker results publish after an active drag ends. Direct-paint timings (`output/playwright/canvas-perf-1795434594178/wire-samples.json`) · Mask timings (`output/playwright/canvas-perf-1795435430595/wire-samples.json`)

Two adjacent CSS fixes were added after tracing the residual start-of-drag delay. Transparent progress bars on idle cards were still animating and creating 70 accelerated sweeps. Stopping the idle pseudo-element animation reduced the observed overview layer count from 378 to 29. The final build also keeps mounted raster-scene cards and groups on transform layers, avoiding extraction from the world layer on the first drag frames. Running progress bars retain their animation. The native regression suite covers session focus, draft, scroll, approvals, floating cards and embedded-style isolation with these rules applied. Initial layer inventory (`output/playwright/canvas-perf-1795435621728/layers.json`) · Idle-animation layer inventory (`output/playwright/canvas-perf-1795437181872/layers.json`)

`pnpm check` passed **230/230**, including the new LRU test for six overview zoom round trips, pan coverage, four-surface allocation and the backing-size cap. Host/RPC outputs match both the archived Phase 1 and Phase 2 files byte-for-byte, so the prior integration result applies, including the recorded Win32 5 exception and the passing portable supplement. Final check log (`output/playwright/phase26-final-check.log`)

The paired Phase 1 and final P2.6 runs used Chrome **157.0.8103.79**, 1440 × 900, DPR 1, **Trace off**, no selector statistics, default **10 rounds** for overlap/avoid and fixed **six 28% ↔ 42% rounds** for overview. The final P2.6 run used the frozen archive `.local/perf-architecture-phase26/lib` and `FLOWSPACE_VISUAL=1`. Every final gate passed on this run. Earlier development builds and their borderline retests are superseded by the final source and report. Same-environment Phase 1 report (`output/playwright/canvas-perf-1795434885035/report.json`) · Final P2.6 report (`output/playwright/canvas-perf-1795437524758/report.json`) · Final acceptance log (`output/playwright/phase26-final-acceptance.log`)

| Scenario and blocker | Phase 2 before P2.6 | Paired Phase 1 | Final P2.6 | Calibrated gate | Result |
| --- | ---: | ---: | ---: | --- | --- |
| 500-overlap regular zoom P95 | 7.8 ms | 11.6 ms | **4.1 ms** | <12 ms | Pass |
| 500-overlap hot crossing P95 | 65.3 ms | 92.5 ms | **27.0 ms** | <90 ms | Pass |
| 500-overlap pan P95 | 38.7 ms | 23.1 ms | **4.1 ms** | ≤25 ms | Pass |
| 500-overlap node drag P95 | 23.1 ms | 38.5 ms | **4.1 ms** | <18 ms | Pass |
| 500-overlap group drag P95 | 37.6 ms | 42.3 ms | **7.9 ms** | ≤25 ms | Pass |
| 500-avoid node drag P95 | 30.0 ms | 46.1 ms | **4.5 ms** | ≤20 ms | Pass |
| 500-avoid group drag P95 | 46.3 ms | 50.0 ms | **11.4 ms** | ≤32 ms | Pass |
| 500-zoomed-out zoom P95 | 57.6 ms | 42.3 ms | **15.5 ms** | ≤45 ms and ≤paired Phase 1 | Pass |
| 500-zoomed-out node drag P95 / max | 196.5 / 198.6 ms | 34.5 / 91.7 ms | **7.6 / 30.7 ms** | ≤50 / ≤80 ms | Pass |
| 500-zoomed-out group drag P95 / max | 68.8 / 184.6 ms | 80.6 / 95.9 ms | **11.4 / 11.5 ms** | ≤60 / ≤90 ms | Pass |
| 500-overlap / 500-avoid / overview wire paths | 0 / 0 / 0 | 99 / 99 / 307 | **0 / 0 / 0** | all zero | Pass |
| flow-12-1 accelerated wires | 12 | — | **12** | 12 | Pass |
| flow-12-1 camera-only buffer uploads | 0 | — | **0** | 0 | Pass |
| flow-12-1 idle main time per frame | 1.4 ms | — | **1.6 ms** | ≤2.0 ms | Pass |
| flow-12-1 idle frame P95 | 4.3 ms | — | **4.1 ms** | <12 ms | Pass |

The six 42% pass-first-frame intervals are **3.9, 3.9, 2.2, 3.9, 3.5 and 2.3 ms**. Their per-pass maxima are **61.6, 53.9, 50.0, 53.8, 49.8 and 53.8 ms**. The earlier repeated 200+ ms zoom-in spikes are eliminated. The maximum across both zoom directions is 130.8 ms and remains an observation metric.

`native`, `native-large` and `wire-stage` each passed **6/6**. Drag position, Escape cancellation and one-step Ctrl+Z checks all passed. `flow-12-1` passed actual WebGL context loss, animated Canvas2D fallback, restoration, idle hiding and both themes. Screenshots were inspected for wire visibility, group overlays and the low-zoom dash treatment. Museum light (`output/playwright/canvas-perf-1795437524758/museum-light-full.png`) · Museum dark overview (`output/playwright/canvas-perf-1795437524758/museum-dark-compact.png`) · Flow light (`output/playwright/canvas-perf-1795437524758/flow-12-1x-light.png`) · Flow dark (`output/playwright/canvas-perf-1795437524758/flow-12-1x-dark.png`)

The following measurements are carried into Phase 3 under the owner's calibration.

| Deferred metric | Phase 2 before P2.6 | Paired Phase 1 | Final P2.6 |
| --- | ---: | ---: | ---: |
| 500-overlap 44% DOM | 1,298 | 1,457 | 1,298 |
| 500-zoomed-out 28% DOM | 4,120 | 4,591 | 4,120 |
| 500-overlap style total, 10 rounds | 4,270 ms / 427.0 ms per round | 5,357 ms / 535.7 ms per round | 3,518 ms / 351.8 ms per round |
| 500-avoid style total, 10 rounds | 4,301 ms / 430.1 ms per round | 5,079 ms / 507.9 ms per round | 3,590 ms / 359.0 ms per round |
| Overview style total, six rounds plus drags | 2,998 ms / 499.7 ms per round | 3,621 ms / 603.5 ms per round | 1,310 ms / 218.3 ms per round |
| Overview pan P95 / max | 92.3 / 138.5 ms | 153.9 / 165.3 ms | 19.5 / 123.0 ms |

The acceptance client SHA-256 is `15dfe7a7714994d6a22ac80c115ac95dd1330467540c378937e8fc5ed386498f`. The pre-edit backup is `.backups/2026-11-23T11-36-58-820Z`, with `nodes.css` backed up separately under `.backups/2026-11-23T12-14-18-600Z`. The accepted files remain under `.local/perf-architecture-phase26/lib`, and the generated worktree `packages/flowspace/lib/client.js` was restored byte-for-byte to the pre-P2.6 backup. The earlier Phase 1 and Phase 2 archives remain available for comparison.

## Phase 3 overview implementation and terminal acceptance · 2026-11-23

Phase 3 implements the overview atlas, fixed viewport card and group-background canvases, sparse DOM handoff, native session retention, geometric pointer dispatch and keyboard bridge. The complete eleven-scenario acceptance run passed its functional assertions. One terminal performance blocker remains open. `500-overlap` accumulated **1,661 ms** of style recalculation over ten rounds, against the **<600 ms** requirement. Phase 3 is awaiting resolution of this blocker and has not received terminal signoff. The failure is outside the 10% borderline band, so a three-run median cannot qualify it. Acceptance report (`output/playwright/canvas-perf-1795448219086/report.json`) · Acceptance log (`output/playwright/phase3-final-acceptance.log`)

`OverviewCardAtlas` uses shelf packing across at most four persistent 2048 × 2048 canvases. Visual snapshot and discrete type scale form the cache key. The six overview zoom round trips remain in the 2.2 scale bucket. Camera and drag subscriptions draw the existing tiles directly, and theme/DPR changes invalidate the atlas. The card visuals include category icons, two-line grapheme-aware titles, status captions, participation styling and linked ports. Group backgrounds are painted below the wire stage, while group headers and borders stay in the transformed DOM layer. [Atlas](../packages/flowspace/src/client/canvas/OverviewCardAtlas.ts) · [Overview stage](../packages/flowspace/src/client/canvas/OverviewCanvasLayer.tsx)

The implementation waits for camera movement to settle before mounting up to six visible full cards per frame, ordered by distance from the viewport center. The overview remains underneath until each card takes over. Zooming out fades the existing shells over 140 ms before unloading their contents, with cancellation on reversal and immediate unloading for reduced motion. A small number of visited, empty slots remain in the viewport to limit sibling-selector invalidation. Native sessions and tools retain their component instances with `hidden` and `content-visibility: hidden`. Only visible slots receive `will-change`. The performance runner now waits for the overview backdrop to finish handing off to DOM, so deferred mounting remains inside the measured interval. [Mounting](../packages/flowspace/src/client/canvas/useOverviewMounts.ts) · [Retention](../packages/flowspace/src/client/canvas/ViewportCard.tsx) · [Runner](../scripts/canvas-perf.mjs)

`pnpm check` passed **233/233**, including new atlas reuse/eviction, CJK/Latin wrapping and geometric port-tolerance tests. `native` and `native-large` passed **6/6** each, including editor identity, focus, drafts, embedded scroll, approval continuity, floating windows and embedded style isolation. `wire-stage` passed **6/6**. `overview-stage` passed **9/9**, covering hover actions and ports, selection/Enter/delete/undo, double-click expansion, node/group drag/cancel/undo, menus, port connections, fast zoom reversal, atlas reuse and clipboard/Tab navigation. The existing 86% `dragSample` remains intact. The 28% `lodDragSample` verifies committed world-coordinate deltas, Escape cancellation and a single undo. Check log (`output/playwright/phase3-final-check.log`) · [Browser regression implementation](../scripts/canvas-interactions.mjs)

The first integration attempt timed out while waiting for the plugin to reopen storage after re-enabling. A fresh full rerun passed **17/17 initial** and **3/3 cold-restart** assertions, then reproduced the documented terminal sandbox `SetNamedSecurityInfoW / Win32 5` failure in `verifyOperations`. A fresh portable supplement passed the other **16/16** assertions, including the subsequent triggers, playback/budget, fanout, fanout-policy, data-transform and watched-content scenarios. All seven Host/RPC artifacts match P2.6 byte-for-byte. First attempt (`output/playwright/phase3-integration.log`) · Full rerun (`output/playwright/phase3-integration-retry.log`) · Initial results (`.local/integration-1795446481168-36624/integration-initial.json`) · Restart results (`.local/integration-1795446481168-36624/integration-restored.json`) · Portable supplement (`output/playwright/phase3-integration-portable.json`) · Host/RPC hashes (`.local/perf-architecture-phase3/host-hashes.json`)

The formal run used Chrome **157.0.8103.79**, a 1440 × 900 viewport, DPR 1, Trace off, selector statistics off, default **10 rounds** for overlap/avoid and fixed **six 28% ↔ 42% rounds plus three drags** for overview. It ran the frozen `.local/perf-architecture-phase3/lib` build with `FLOWSPACE_VISUAL=1`. P2.6 values below come from its accepted report. P2.6 report (`output/playwright/canvas-perf-1795437524758/report.json`) · Phase 3 report (`output/playwright/canvas-perf-1795448219086/report.json`)

| Terminal blocker | P2.6 | Phase 3 | Required | Result |
| --- | ---: | ---: | --- | --- |
| 500-overlap 44% world DOM | 1,298 | 49 | <150 | Pass |
| 500-zoomed-out 28% world DOM | 4,120 | 25 | <200 | Pass |
| 500-scene wire SVG paths | 0 | 0 | 0 | Pass |
| 500-overlap regular P95 | 4.1 ms | 4.0 ms | <10 ms | Pass |
| 500-overlap hot crossing P95 | 27.0 ms | 7.8 ms | <25 ms | Pass |
| 500-overlap style total, ten rounds | 3,518 ms | **1,661 ms** | **<600 ms** | **Blocked** |
| 500-overlap style per round | 351.8 ms | 166.1 ms | <60 ms | Blocked |
| 500-overlap pan P95 | 4.1 ms | 4.0 ms | <12 ms | Pass |
| 500-overlap node drag P95 | 4.1 ms | 3.9 ms | <12 ms | Pass |
| 500-overlap group drag P95 | 7.9 ms | 7.7 ms | <12 ms | Pass |
| 500-avoid node drag P95 | 4.5 ms | 3.9 ms | <16 ms | Pass |
| 500-avoid group drag P95 | 11.4 ms | 3.9 ms | <16 ms | Pass |
| 500-zoomed-out zoom P95 | 15.5 ms | 4.0 ms | <12 ms | Pass |
| 500-zoomed-out pan P95 | 19.5 ms | 4.0 ms | <12 ms | Pass |
| 500-zoomed-out node drag P95 | 7.6 ms | 4.0 ms | <16 ms | Pass |
| 500-zoomed-out group drag P95 | 11.4 ms | 7.6 ms | <16 ms | Pass |
| 500-zoomed-out style total, six rounds plus drags | 1,310 ms | 470 ms median | <500 ms | Pass |
| 500-zoomed-out style per round including drags | 218.3 ms | 78.3 ms median | <83.3 ms | Pass |
| flow-12-1 accelerated / camera uploads | 12 / 0 | 12 / 0 | 12 / 0 | Pass |
| flow-12-1 idle main thread per frame | 1.6 ms | 1.2 ms | ≤2.0 ms | Pass |
| flow-12-1 idle P95 | 4.1 ms | 4.1 ms | <12 ms | Pass |
| flow-12-1 context loss / animated fallback / restore / themes / idle hidden | All true | All true | All true | Pass |

The final overview style total was 532 ms, a 6.4% overshoot. Two same-build six-round repeats measured 446 ms and 470 ms. Their three-run median is **470 ms**, or **78.3 ms per round**, and qualifies under the documented borderline rule. The repeat zoom P95 values were both 4.4 ms, pan P95 both 7.8 ms, node P95 both 4.0 ms and group P95 7.7/7.6 ms. All are inside their terminal limits. Repeat two (`output/playwright/canvas-perf-1795448521124/report.json`) · Repeat three (`output/playwright/canvas-perf-1795448552511/report.json`)

Additional observations are retained for comparison. The 500-overlap cold crossing maximum is 92.3 ms, hot crossing maximum 38.5 ms, overall maximum 115.4 ms, stable P95 7.4 ms, layout total 291 ms and script total 2,092 ms. Its pan/node/group maxima are 34.7/4.0/53.9 ms. The 500-avoid style total is 1,336 ms, or 133.6 ms per round. The overview zoom maximum is 7.9 ms and pan/node/group maxima are 22.7/4.0/61.5 ms. The museum, 200-overlap and 200-avoid cases completed all ten rounds and their drag assertions. Full metrics and individual passes (`output/playwright/canvas-perf-1795448219086/report.json`)

Six museum screenshots were inspected at 86%, 44% and 28% in both themes. Card and structure surfaces cover wire endpoints, group backgrounds preserve crossing-wire visibility, and the overview titles, icons and port positions remain legible at their intended scale. The native approval and active-wire theme screenshots are in the same report directory. Dark 86% (`output/playwright/canvas-perf-1795448219086/museum-dark-full.png`) · Dark 44% (`output/playwright/canvas-perf-1795448219086/museum-dark-compact.png`) · Dark 28% (`output/playwright/canvas-perf-1795448219086/museum-dark-overview.png`) · Light 86% (`output/playwright/canvas-perf-1795448219086/museum-light-full.png`) · Light 44% (`output/playwright/canvas-perf-1795448219086/museum-light-compact.png`) · Light 28% (`output/playwright/canvas-perf-1795448219086/museum-light-overview.png`)

Diagnostic traces show remaining style work around full-card insertion, ancestor `:has()` invalidation from DSH and camera/handoff animation. Separating structure-card children from ordinary card slots removed the earlier whole-node-layer sibling invalidation. These diagnostics used two rounds and are excluded from acceptance. One trace measured 280 ms total style time, or 140 ms per round. A temporary Canvas minimap viewport measured 247 ms over two rounds, or 123.5 ms per round, and was reverted because it did not resolve the blocker. No Host stylesheet or native embedded stylesheet was modified. Trace diagnostic (`output/playwright/canvas-perf-1795445292179/500-overlap.trace.json`) · Selector diagnostic (`output/playwright/canvas-perf-1795445393968/500-overlap.trace.json`) · Minimap experiment (`output/playwright/canvas-perf-1795447775719/report.json`)

The pre-edit backup is `.backups/2026-11-23T13-46-55-570Z`. Existing dirty work and `.local/perf-architecture-phase26/` were preserved. The reproducible Phase 3 client SHA-256 is `a4adcca612220de0f30c11a1db25e022a5fa5a6837dc432dab247cd3069851fe`. The final build also replaces the missing flow-node overview kind label with its registered, localized descriptor title. A rebuild matched the archive byte-for-byte. The worktree `packages/flowspace/lib/client.js` was restored from the pre-Phase 3 backup after validation. Archived build (`.local/perf-architecture-phase3/lib/`) · Rebuild log (`output/playwright/phase3-repro-build.log`)

## Phase 3 终态签收 · 2026-11-23

项目负责人已批准 Phase 3 终态签收，全项目性能架构改造结项。经负责人复核，240 Hz 环境下 `500-overlap` 十轮渲染帧数由 **1,210 增至 3,729（3.08×）**，单帧均摊样式重算由 **6.657 降至 0.445 ms/帧（下降 93.3%，约 15.0×）**。实测累计值仍为 **1,661 ms**，按基线同帧数折算约 **538 ms <600 ms**。归因复核中，约 984 ms 来自四元素相机更新，约 630 ms 来自十轮完整卡片挂载命中 DSH 宿主样式。负责人正式豁免本次 240 Hz 下的十轮绝对累计值，以 **0.445 ms/帧** 达标收口。前述验收记录中的待签收状态已由本次批准解除，其余终态门槛继续沿用已通过的验收结果。 验收报告 (`output/playwright/canvas-perf-1795448219086/report.json`)

工作区 `packages/flowspace/lib/client.js` 已切换为 Phase 3 终态验收产物，SHA-256 为 `a4adcca612220de0f30c11a1db25e022a5fa5a6837dc432dab247cd3069851fe`。七个 Host/RPC 产物与 Phase 3、P2.6 归档逐字节一致。此次落盘前备份位于 `.backups/2026-11-23T15-57-50-165Z`。 终态构建 (`.local/perf-architecture-phase3/lib/`) · Host/RPC 哈希 (`.local/perf-architecture-phase3/host-hashes.json`)

收尾 `pnpm check` 完成构建、双端类型检查及 **233/233** 测试，零失败、零跳过。构建后再次核对客户端验收哈希与七个 Host/RPC 产物一致性通过。`git status --short` 和本轮前后文件指纹对照确认，此次仅修改签收文档与客户端验收产物，其他贡献者已有文件及改动完整保留。`git diff --check` 通过，生产画布代码未发现临时调试开关或日志残留。 收尾检查日志 (`output/playwright/phase3-signoff-check.log`)

## Code review fixes and master merge verification · 2026-11-24

A full line-by-line review of all Phase 0–3 changes identified and fixed functional, rendering, interaction, CSS, test, and documentation defects prior to landing on `master` (pre-edit backup: `.backups/2026-11-24T02-20-11-297Z`):

- **LOD session retention & progressive mounts**: `useOverviewMounts` now flushes unmount before cancelling `fill: "forwards"` fade animations (`id: "fs-overview-fade"`), cancels fades immediately when a `keepMounted` card (live DSH session / git / changes / terminal) becomes whitelisted in LOD, and halts chunked mounting if camera motion resumes; `ViewportCard` also clears any lingering fade animation on becoming visible.
- **LOD port wiring, staffing & drag/shortcut safety**: `useCanvasGestures` adds geometric `nodeAtPoint` fallback for `resolveSnapTarget`, `startPortDrag`, `startInputEdgeDrag`, and `startStaffDrag` so dropping onto canvas-rendered cards in LOD connects/reconnects instead of opening QuickCreate or deleting edges; `trackPointer` stops propagation on `Escape` (and `useCanvasShortcuts` respects `defaultPrevented`) so drag cancellation preserves selection, handles window `blur`/unmount cleanup, guards right-click (`ev.button !== 0`) across drag/resize/waypoint/minimap handlers, reads fresh `docRef` originals, and computes marquee selection once on release.
- **Pointer dispatch, hover & cursor integrity**: `CanvasPointerDispatcher` and `useWirePointer` share a single `buildOverviewScene` and unified rAF hover pipeline, keep `.waypoint` and single-input `.port[data-edge-id]` spotlight active, stop rejecting discrete clicks/double-clicks during the 200 ms `camera.moving` cooldown, guard synthetic post-drag clicks and touch `pointercancel`, align context-menu precedence with hover, and clear inline `viewport.style.cursor` when busy or leaving targets. `CanvasWorld` exclusion selectors cover `.window-stub`, `.waypoint`, `.exchange-tag`, `.fs-child-card`, `.fs-overview-actions`, and `.fs-overview-port`. `OverviewFocusProxy` no longer steals focus from whitelisted DOM cards in LOD, and `OverviewActiveOverlay` clamps top placement and subscribes to settled camera coordinates.
- **Wire stage, WebGL2/Canvas2D parity & worker stability**: `WireCanvasStage` skips `reconnecting` edges in highlight/active-animation passes, prevents double-compositing focused moving edges, tracks drag-key changes for guide-only drags, erases moving staff endpoint dots and caps localized crossing-wire repair (`<= 48` workflow / `<= 24` guides), clamps Canvas2D pulse fade and restores `lineCap = "round"` for low-zoom flow beads, wraps `this.ctx` swaps in `try/finally`, decouples cache tokens from guide metadata, tracks a relative WebGL2 clock epoch, and releases WebGL2 resources cleanly on unmount. `WireImageCache` sets `lineCap`/`lineJoin = "round"`, keys on exact `dpr`, uses adaptive padding for crisp 1080p/HiDPI rendering, and guards non-positive zoom. `wireFlowMesh` caps waiting-glow SDF ends, normalizes corner tangents, and guards lost/null WebGL handles. `sceneWires` hardens `pathExtent`, `pathSegments`, and `guidePathInArea`, and returns acceptance status from `acceptGuide`; `wireStageScene` / `useCanvasScene` stabilize pending worker batches, `structure.ts` / `childTree.ts` supply explicit node IDs, `wireRouting.worker` catches per-task errors, and `wireWorker` revokes blob URLs safely.
- **Visual, CSS, Replay & dead-code cleanup**: Aligned canvas group background corner radius with `--r-group` (`26px`) and shared fanout placeholder height via `overviewGroupBox`; removed dead `zoomPreparation` re-renders and unused props/refs/exports; fixed Replay-exit listener re-attachment in `useCanvasViewport` / `CanvasApp`; fixed `TemporaryWireLayer` camera transform dependency; fixed `OverviewCardAtlas` grapheme-safe emoji ellipsis truncation and `2048` ceiling clamp; restored `edge-state-skipped` LOD tags and drag-only `.fs-live-edge-tags`; fixed `nodes.css` raster `.icon-button` specificity and `.port-mark::before`, `teams.css` `:focus-visible` switch outline, and `compact.css` divider before AI trial button; normalized `docs/verification.md` to LF and converted gitignored local paths to inline code.

Verification on the final patched build (Client SHA-256 `269f58ae2d56882002bdf7cfe1453da4b0a6dc19c7d058479c26ff6faa8abcd1`, all 7 Host/RPC artifacts unchanged vs `HEAD`):
- `pnpm check`: build, dual `tsc --noEmit`, and **239/239** unit/contract tests pass (6 new unit tests added to `canvas-performance.test.ts`).
- Browser regression & 500-node performance (Chrome 157, 1440 × 900, DPR 1, Trace off; reports `output/playwright/canvas-perf-1795488030782/report.json` and `output/playwright/canvas-perf-1795488411660/report.json`):
  - `wire-stage` **6/6**, `overview-stage` **9/9**, `native` **6/6**, `native-large` **6/6**, `flow-12-1` **12/12 GPU / 0 camera uploads / 1.0 ms/frame / 4.0 ms idleP95 / all checks true**, `museum` reversal + drags pass.
  - `500-overlap` (10 rounds): `49` DOM at 44%, `0` wire SVG paths, regular / hotCross P95 **`4.0 / 4.0 ms`** (hotCross max `19.3 ms`), pan / node / group P95 **`7.7 / 7.7 / 3.9 ms`**, 10-round `RecalcStyle` improved from `1,661 ms` to **`1,413 ms`** (`ScriptDuration` `2,092 → 1,272 ms`).
  - `500-avoid` (10 rounds): `49` DOM at 44%, hotCross P95 **`4.0 ms`**, pan / node / group P95 **`4.0 / 4.0 / 7.7 ms`**, 10-round `RecalcStyle` **`1,284 ms`**.
  - `500-zoomed-out` (6 rounds `28% ↔ 42%` + drags): `25` DOM at 28%, `0` wire SVG paths, zoom / pan / node / group P95 **`3.9 / 4.0 / 4.1 / 3.9 ms`** (zoom max `7.7 ms`), 6-round `RecalcStyle` improved from `470 ms` median to **`273 ms`**.
