# FlowSpace v0.1

Visual thesis: a quiet graphite work surface, clear type, and a restrained violet accent; the graph itself is the primary visual.

Content plan: DSH navigation → canvas and focused workflow → contextual inspector → run history. One primary action starts the selected scope.

Interaction thesis: direct node manipulation; animated wires only while a continuation is active; short expansion and inspector transitions, with reduced motion preserving every state.

The target is the published `@deepseek-ai/dsh@0.2.2-rc.3`. Agent nodes are persistent Sessions, not one-shot jobs. Native chat continuation defaults on and may be overridden globally or per node. References never trigger execution. Continuations carry conclusions, pinned session text, or a native fork. The Host owns scheduling, joins, scope boundaries, bounded loops, persistence and cancellation.

The reference OMP prototype is design evidence only. Its simulated runtime is not used as a DSH adapter. Summary handoff, template synchronization, arbitrary peer messaging, automatic worktrees and complex floating windows are later work.
