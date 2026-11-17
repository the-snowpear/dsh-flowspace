# FlowSpace

- Target the published DeepSeek Harness 0.2.2-rc.3 packages, not GitHub master.
- Back up existing files before editing. Preserve other contributors' changes.
- Use the native DSH Session, embedded Conversation factory, approvals and storage domain.
- Keep the workflow scheduler in the Host. Rendering never drives execution.
- Runtime state and editable canvas documents are separate. Undo must not replay a prompt.
- Input validation belongs at the executing Host boundary; avoid redundant wrappers.
- Run `pnpm check` and the integration smoke test for runtime changes.
- Windows shell: Git Bash at `D:\Program Files\Git\bin\bash.exe`, invoked through PowerShell if the tool's shell selector resolves to WSL.
