# DSH rc.3 integration notes

The implementation targets npm **0.2.2-rc.3**. The upstream `master` examined during research was `39163dd30f703a79079e2d2446545cff3c453738`, which already differs from the published package. Package contracts are authoritative for this plugin.

| Capability | Integration |
| --- | --- |
| Global UI | `main` keyed slot and `sidebar.panellist` entry |
| Multiple conversations | Independent retained Session references, `SessionProvider`, reusable `conversation.content` factory |
| Session lifecycle | `sessionController.create`, `resolveAgent`, `prompt`, `cancel`, `fork` |
| Completion | Request identity → `agent/inbox/claimed` → actual `turn/end`; only `completed` advances |
| Queuing | Native `mode: queue`, with captured context fixed before admission |
| Conversation references | Exact event prefix from `sessionQuery`, canonical `foldSurface`, user/assistant text and compact checkpoints |
| Long context | DSH session-owned `spillStore` with its retrieval hint |
| Persistent canvas | `storageDomain`, domain `flowspace`, documents/runs tables |
| Approval and Plan | Native embedded conversation takeover and pending-interaction status; no automatic approval |
| Restart | Read logs before classifying interrupted work, preserve unconsumed captured tokens, never replay automatically |

Native `sessionReferenceResolver.prepare()` captures the current surface at preparation time, without an `atSeq` parameter. That is insufficient for a workflow result that waits while its source runs again. FlowSpace captures an exact event prefix and uses the same content categories, with explicit provenance. It does not label text snapshots as shared mutable context.

The DSH workflow engine executes scripts that own subagent activations. FlowSpace instead orchestrates persistent ordinary Sessions to retain native chat identity and interactive approvals. Parent/child messaging and Team features are not used to impersonate arbitrary peer messages.

Native compaction changes the source Session. It is not used as a summary-handoff API. DSH cancellation stops a turn; pausing a workflow means stopping future dispatch, not suspending a network request.

Sources:

- https://github.com/deepseek-ai/deepseek-harness
- https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/api/session-controller
- https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/context/session-reference
- https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-conversation
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/workflow.zh.md

The OMP reference's 26 local model tests passed during planning; its simulated runtime is not part of this plugin. The interaction rules informed the independent scheduler behavior tests.
