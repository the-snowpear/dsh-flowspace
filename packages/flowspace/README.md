# dsh-flowspace

Agent infinite canvas for DeepSeek Harness **0.2.2-rc.3**.

Open **FlowSpace** from the DSH sidebar. Create or attach persistent Agent sessions, connect context and execution ports, and run serial, parallel, bounded-loop or confirmation workflows. Native chat triggers continuations by default, with global and per-node overrides.

The Host owns orchestration and persistent documents; embedded conversation cards use DSH's native Conversation factory, model controls and approvals. Switching pages does not stop a workflow. Restarting the Host requires explicit continuation of interrupted runs.

Install with `dsh plugin --profile web add <path-to-tarball>`. Back up profile configuration before installation. Disable from the plugin page; uninstall with `dsh plugin --profile web remove dsh-flowspace`. Sessions and stored documents remain available after uninstall.

File reference nodes pass paths for the agent to read with its normal tools. Session references capture user/assistant text and compaction summaries, excluding tools and reasoning. Forks inherit conversation history at an exact event boundary and retain the original workspace.

This initial release includes a single persistent canvas, basic two-level groups, editable examples, JSON import/export and Chinese/English UI. Template version synchronization, floating windows, editable composite ports and automatic worktree management are planned separately.

MIT. The client bundles React Flow (MIT), Lucide (ISC) and their transitive code dependencies; React and the DSH UI runtime are shared with the host.
