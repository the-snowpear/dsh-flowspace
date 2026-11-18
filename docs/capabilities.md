# DeepSeek Harness (`0.2.2-rc.3`) 能力分析与架构映射手册

本文档记录将 OMP Studio《Agent 无限画布》设计方案迁移至 **DeepSeek Harness (DSH)** 插件生态时的底层能力审计、复用映射、原生边界与自研/迁移模块划分。

## 1. 目标基线与工程铁律

- **锁定目标版本**：已发布的 npm 包 **`@deepseek-ai/dsh@0.2.2-rc.3`**（及同版本子包）。调研时参考的上游 GitHub `master` 提交（如 `39163dd30f703a79079e2d2446545cff3c453738`）仅作架构背景印证；遇到差异时**一律以本地锁定的 `0.2.2-rc.3` 包导出契约为准**。
- **架构内核**：DSH 基于 Cordis 插件微内核构建，严格分离 **Host（服务端插件、Session 事件日志、工作区与子进程）**、**Typert（类型安全 RPC 与双向流通道）** 与 **Client（React 18 + UI Slots 插槽视图）**。
- **FlowSpace 四条红线**：
  1. **真实持久化会话**：画布上的每个已启动 Agent 节点都是原生 DSH `Session`，绝不使用模拟运行时或一次性匿名任务替代。
  2. **调度驻留 Host**：接续推进、汇合等待、范围边界、有界循环、排队上下文固化与取消均由 FlowSpace Host 服务驱动，前端渲染层绝不驱动执行。
  3. **编辑态与运行态分离**：可撤销的 `CanvasDocument`（布局、草稿、连线、分组）与 Host 运行时状态分离，任何布局/结构撤销（Undo）绝不重播模型请求。
  4. **边界单点校验**：输入校验集中在执行动作的 Host RPC 边界，不在中间门面重复包裹冗余防御层。

---

## 2. OMP 原生需求 → DSH `0.2.2-rc.3` 能力逐项映射

对照 OMP 画布设计文档 §5（原生能力调查）与 §8（待验证风险），DSH `0.2.2-rc.3` 提供的原生能力及 FlowSpace 接入方式如下：

| 画布能力域 | OMP 原状态 / 痛点 | DSH `0.2.2-rc.3` 原生包与契约 | FlowSpace 复用与适配策略 |
| :--- | :--- | :--- | :--- |
| **工作台并列入口** | 「工作台」下并列「对话」「画布」 | `@deepseek-ai/dsh-client-ui-layout`（`main` keyed slot，`conversation` 占一键）<br>`@deepseek-ai/dsh-client-ui-sidebar`（`sidebar.panellist`） | 注册 `flowspace` 主视图键与侧栏入口，通过 `ctx.layout` 自由切换「对话」与「画布」；切换视图不卸载 Host 调度 |
| **多卡并行活对话** | 多张展开卡独立输入、滚动、审批互不干扰 | `@deepseek-ai/dsh-client-ui-session`（`SessionProvider` + 独立 retain 引用计数 + `useSessionStatus`）<br>`@deepseek-ai/dsh-client-ui-conversation`（`conversation.content` Factory，`variant: 'embedded'`） | 已绑定 `SessionId` 的完整功能卡直接挂载嵌入式 `conversation.content`，原生具备 Lexical 输入框、模型选择、权限预设、Plan 开关、附件、工具调用轨迹与审批接管 |
| **新建会话与指定归属** | OMP `session.create` 只能在当前活动工作区创建，无法传项目/目录 | `@deepseek-ai/dsh-api-session-controller`：`sessionController.create({ workspaceId?, cwd?, sessionId?, agentPreset? })` | **原痛点彻底消除**。草稿首次启动时按解析好的归属直接传入目标 `workspaceId`（并配合 `workingDirectory` 切入对应 worktree）及预设配置 |
| **回合完成精确判定** | OMP 未验证能否可靠区分正常完成与中止/异常 | `@deepseek-ai/dsh-session`：`prompt` 的 `requestId` 写入 `user/message.source.rpcId` → `agent/inbox/claimed` → `turn/end` 携带判别联合 `TurnEndReason`（`completed` / `aborted` / `blocked` / `error` / `interrupted` / `forked`） | Host 调度器按请求身份精确追踪对应回合，**仅当 `reason.kind === 'completed'` 时推进下游接续**；中止、报错、超限或中断均不误触发下游 |
| **下游忙时排队** | 调 `core.followUp` 排入当前回合后 | `sessionController.prompt({ mode: 'queue' })` + `updateQueue`（支持 `edit` / `remove` / `steer`） | 原生入队；**在入队前由 Host 按上游触发时刻的 `atSeq` 固化上下文快照**，防止排队期间上游二次运行污染首次结果（根治 R3） |
| **跨会话读取结论与过程** | OMP 多 Worker 隔离，跨会话树 `agent://` / `history://` 不通，需置灰 | `@deepseek-ai/dsh-session-query` + `@deepseek-ai/dsh-session-reference`（`foldSurface` 保留 User/Assistant 正文与 `compact-checkpoint`，剔除工具噪音） | **取消跨会话树置灰限制**。同一 DSH Host 可按精确 `atSeq` 前缀读取任意顶层或子会话日志，同树与跨树统一可用 |
| **会话分叉（Fork）** | overlay `fork-service`（要求上游空闲，无来源字段） | `sessionController.fork({ sessionId, atSeq })`（自动带 `isSeeded: true` 与 `session/end-seed` 边界事件） | 草稿首次按分叉启动时精确基于 `atSeq` 分叉出新 `SessionId`，再发送草稿存稿；分叉来源记录在画布连线 `createdBy: 'fork'` 中 |
| **引用胶囊注入与互通** | 沿用 `composer/serialize.ts` | `@deepseek-ai/dsh-client-ui-conversation`（`conversation.composer.dock` 插槽）<br>`@deepseek-ai/dsh-agent`（`ctx.on('agent/pre-step', ..., { prepend: true })`） | 胶囊托盘挂入草稿框与原生 `composer.dock`（主对话与画布互通）；发送时在 Host `agent/pre-step` 统一拦截组装并翻转胶囊为「已发」 |
| **超长引用落盘** | 原型超 64 KiB 拼本地下载文件，真实沙箱可读性未知 | `@deepseek-ai/dsh-spill`：`ctx.spillStore.saveText({ owner, content, suggestedName })` | 单条或累计超过 64 KiB 的文本快照自动存入目标 Session 专属 `spillStore`，消息内替换为落盘路径与官方按需读取提示 |
| **划词与消息引出** | 拖出聊天消息或文字选区生成展示节点 | `@deepseek-ai/dsh-message-quotes` 同款机制：`ctx.uiConversation.interactions.register` + `conversation.chat.text-interaction` 插槽 | 在原生对话消息菜单与划词浮层注册「引出为画布展示节点」，零侵入提取固定片段并连回来源 Agent 输出口 |
| **Plan 模式与人工审批** | 原型将 Plan 拆成两次运行，导致批准后丢失选区范围（R2） | `@deepseek-ai/dsh-plan-mode`（`exit_plan_mode` 工具）+ `dsh-user-approval` + `dsh-tool-ask-user`（`useSessionStatus().pendingInteraction`） | **同一未结束 Open Turn 内挂起等待批准**，批准后原地继续同一回合，天然保留 `runId`、选区/分组边界与循环计数 |
| **每轮文件改动（Changes）** | 需捕获某轮/某文件的改动列表与 Diff | `@deepseek-ai/dsh-workspace-changes`（`workspace/changes` 事件，`/api/changes.summary`、`/api/changes.diff`）+ `@deepseek-ai/dsh-client-ui-deliverables`（回合尾部改动卡 + 右侧栏 `changes-review`） | 嵌入式对话自带每轮改动卡；画布 **Changes 节点**直接读取原生接口展示文件增删行数与 Hunk Diff，并在连线瞬间将 Diff 快照固化到画布存储以跨越 Host 重启 |
| **文件浏览与产物交付** | 文件节点预览、运行产物收集 | `@deepseek-ai/dsh-api-workspace-files`（读文件/列目录/搜索/watch）+ `@deepseek-ai/dsh-tool-present`（`deliverables/presented` 事件） | 文件节点走 `workspaceFiles` 并监听变更点亮「来源已更新」；`deliverables/presented` 自动汇入底部单次运行总览卡并可引出为画布节点 |
| **终端读取与连接** | 终端输出快照与命令交互 | `@deepseek-ai/dsh-api-terminal-controller`（依附于 Agent Session：`list`、`screen()` 去转义分页纯文本、`attach` 实时双向流） | 一期复用 `screen()` 提取干净终端屏幕快照供引用连线，并提供一键跳原生终端面板；二期在完整终端卡内接入 `attach` 实时流 |
| **子 Agent 树与原生消息** | 子 Agent 层级投影、只读双股消息线 | `@deepseek-ai/dsh-subagent` + `@deepseek-ai/dsh-agent-team`（`subagentCatalog` / `listDescendants`；日志 `user/message` 的 `source.kind === 'agent-message' \| 'subagent-settled'`） | 自动派生父子结构线；只读消息线**忠实呈现 DSH 原生消息事件**（发送方、接收方、时间、正文），Host 不拦截、不伪造 |
| **持久化与重启恢复** | 原型写 `localStorage`，存在配额与损坏风险 | `@deepseek-ai/dsh-storage-domain`（`ctx.storageDomain.open('flowspace', ...)`，支持多表 Schema 校验与损坏记录备份跳过） | 分表持久化 `documents`、`runs`、`templates`、`snapshots`；Host 重启先对齐真实 Session 日志状态，保留未消费排队项，绝不自动重放 |

---

## 3. 核心架构边界与关键技术细化

### 3.1 为什么按 `atSeq` 前缀自行切片，而不直接调 `sessionReferenceResolver.prepare()`
DSH 原生 `@deepseek-ai/dsh-session-reference` 的 `prepare()` 总是读取调用时刻该会话的**当前最新表面**，不支持传入历史序号 `atSeq`。在画布工作流中，若上游 A 第 1 轮完成并触发忙碌中的下游 B 排队，随后 A 又跑了第 2 轮，等 B 空闲消费队列时直接调 `prepare()` 就会错误读到 A 的第 2 轮内容（即审查问题 R3）。

因此 FlowSpace 直接通过 `sessionQuery` 读取截至触发时刻精确序号 `[0..atSeq]` 的事件前缀，并复用与 `dsh-session-reference` 完全相同的 `foldSurface` 范畴（保留用户文本、助手文本与 `compact-checkpoint`，剔除工具调用细节，超 64 KiB 走 `spillStore`）。同时在界面与提示词中明确标注其来源会话与事件序号，不将文本快照伪称为可变共享内存。

### 3.2 为什么收敛为三种接续，不实现「交接（Handoff）」
DSH 没有独立的无副作用 `handoff-service`；其原生压缩服务 `@deepseek-ai/dsh-compaction`（`ctx.compaction.compactNow`）会**原地修改源 Session 的可见事件表面**。本轮产品与技术评审已确认**不做交接（Handoff）**，Agent → Agent 接续方式收敛为语义正交、100% 确定性的三种：
1. **提及 Agent（`mention`）**：传上游本轮最终回复结论；
2. **共享上下文（`share`）**：传上游截至 `atSeq` 的 `foldSurface` 精简过程记录；
3. **分叉（`fork`）**：调 `sessionController.fork({ sessionId, atSeq })` 继承完整历史创建新会话，启动后自动转为 `mention` 并保留 `createdBy: 'fork'`。

### 3.3 与 DSH 原生脚本工作流（`@deepseek-ai/dsh-workflow-ptc`）的职责区分
DSH 内置的 `dsh-workflow` + `dsh-workflow-ptc` 是供**单个模型回合内部**通过 `workflow` 工具在沙箱中运行编排脚本、拉起临时子代理的机制。FlowSpace 画布工作流**不生成也不编译为 PTC 脚本**：
- 画布上的每个主节点都是**持久化、有独立聊天身份、可随时人工插话与逐项审批的普通顶层 Session**；
- 若某个画布 Agent 在执行过程中自行调用了原生 `workflow` 工具或 `subagent` 工具，其产生的子代理与事件会作为该节点下方的**只读子 Agent 结构树与执行轨迹**如实投影到画布上。

### 3.4 项目归属、四级结构与 DSH 双目录机制（`header.cwd` vs `workingDirectory`）
源码核查表明，`@deepseek-ai/dsh-workspace` 的 `WorkspaceEntity.attachSession` 存在严格相等校验：
```text
realpathNormalize(session.header.cwd) === realpathNormalize(workspace.path)
```
一旦创建 Session 时直接把 `header.cwd` 设为子 worktree 路径（如 `.agents/worktrees/wt-1` 或同级目录 `../repo-wt`），该会话就会从 DSH 原生左侧栏的对应项目（Workspace）列表中脱落。

DSH 官方通过 `@deepseek-ai/dsh-working-directory` 解耦了这两个概念：
1. **项目归属目录（`session.header.cwd`，不可变）**：始终传入所属主项目的 `workspaceId`（使 `header.cwd` 等于主仓库根路径），确保会话 100% 留在原生项目列表内；
2. **有效执行目录（`workingDirectory` 投影，可变）**：当画布草稿归属于某个具体 `worktree` 时，FlowSpace Host 在会话创建后、首轮执行前调用 `ctx.workingDirectory.set(agent, worktreePath)`（同步落盘 `session/workdir-changed`），使文件工具、Bash、终端与 `present` 全部在该 worktree 目录内运行；
3. **外部历史会话兜底**：若用户在外部 CLI 直接以某个 worktree 目录作为 `header.cwd` 启动过会话，FlowSpace Host 通过 Git 仓库根路径识别（`git worktree list --porcelain` 的主目录映射）将其在画布结构树中归并回所属项目的对应 worktree 节点下。

### 3.5 原生 `@deepseek-ai/dsh-workspace-changes` 的能力与存活边界
DSH Web 标准包已内置 `dsh-workspace-changes`（Host）与 `dsh-client-ui-deliverables`（Client）：
- **覆盖优势**：每轮顶层回合前后使用私有临时索引与 `GIT_OBJECT_DIRECTORY`（挂载原仓库 `.git/objects` 为只读 alternate）做快照对比，同时拦截 `fs/write-intent` / `edit-intent` / `delete-intent` 保存修改前后文件副本，因此**完全不污染用户自己的 Git 暂存区（index）和未提交基线**，且能覆盖未跟踪文件、被忽略文件甚至非 Git 目录下的文件工具编辑。
- **原生边界（见该包官方规范）**：
  1. 仅记录非子代理的顶层 Session（子 Agent 不单独生成 `workspace/changes`）；
  2. 摘要与逐文件 Diff 仅在该 Session 存活于当前 Host 进程期间可从 `/api/changes.summary` 与 `/api/changes.diff`（或 `ctx.workspaceChanges`）读取，**Host 重启后旧回合的临时快照树会自动清理**。
- **画布集成方案**：
  - 在线查看直接复用原生 `workspaceChanges` 数据与右侧栏 `dsh-resource://changes-review/session/<sessionId>/<seq>/<turn>` 逐文件对比视图；
  - 当用户从 Changes 节点将某一轮或某一文件的改动**拉出引用线或生成展示节点**时，FlowSpace Host **在连接建立瞬间立即提取并持久化该 Diff 文本快照**（超 64 KiB 走 `spillStore`），确保即使日后重启 Host，画布上的引用上下文依然完整可用。

### 3.6 OMP Studio Git 窗口向 FlowSpace / DSH 的迁移方案
DSH `0.2.2-rc.3` 没有内置通用 Git 仓库管理面板与分支/worktree 枚举服务，而 OMP Studio 已有成熟、分层清晰的 Git 模块，可直接迁移进 FlowSpace 插件：

1. **Host 层迁移（`omp-studio/apps/desktop/src/git-service.ts` + `git-process.ts` + `git-log.ts` → FlowSpace Host Git Service）**：
   - 将原 `HostProcessRunner` 替换为 DSH 原生 `ctx.subprocess`（复用净化环境变量、`GIT_TERMINAL_PROMPT=0`、`GIT_OPTIONAL_LOCKS=0` 与超时截断控制）；
   - 保留 `RepositoryIdentity`（识别 `topLevel`、`commonDir`、`gitDir`、`worktreeId`）、`GitWriteQueue`（基于 `expectedRevision` 指纹的串行写保护队列）以及 `.git` / `commonDir` 防抖文件监听；
   - 通过 Typert RPC 向画布客户端暴露仓库状态（`GitRepositoryReadModel`）、分支列表（`GitBranchListReadModel`）、Worktree 列表与增删锁管理（`GitWorktreeListReadModel`）、提交历史图谱数据（`GitLogListReadModel`）、工作区/暂存区/提交级 Diff，以及可选的 `gh` CLI Issue/PR 读取能力；
   - **一石二鸟**：这套 Host Git 服务同时为画布的**四级自动结构层（`项目 → 分支 → worktree`）**提供实时权威数据源，并在草稿挂到未检出分支启动时安全调用 `worktree.create`。
2. **Client 层迁移（`GitQuickCard.tsx` + `GitWorkbench.tsx` / `GitStatusPanel.tsx` / `GitCommitGraph.tsx` / `GitPatch.tsx` → FlowSpace Git 节点与浮窗）**：
   - **Git 精简卡 / 中尺寸卡**：迁移 `GitQuickCard`（当前分支与同步状态、Working/Staged 变更列表、Commit 历史列表与 SVG 分支图、PR/Issue 摘要）；原对话模式下的「`@` 加入输入框」按钮直接适配为画布的**条目级引用输出口**（复用 `gitCommitReferenceSnapshot` 与工作区 Diff 快照编码，可拖线连给任意 Agent）；
   - **Git 完整功能卡 / 独立浮窗（及 `分支 / worktree` 结构节点展开态）**：迁移 `GitWorkbench` + `GitStatusPanel` + `GitPatch`（双栏可调分屏 Diff、暂存/取消暂存/提交、Fetch/Pull/Push、分支与 Worktree 操作）；并将原 OMP Electron 因禁用 `window.prompt` 而列在 `PENDING_INPUT_LABELS` 中的分支/Worktree/Tag 输入交互，统一替换为画布内建的无障碍模态对话框（符合 R7 焦点接管规范）。

### 3.7 暂不纳入范围的模块
- **交接（Handoff）接续模式**：不实现（见 §3.2）。
- **网页（Web）工具节点**：暂不实现，避免 Web 宿主跨域 `iframe`（`X-Frame-Options` / CSP）限制及桌面原生视图脱离 DOM 缩放的复杂度；Agent 自身的网页搜索与抓取仍正常使用 DSH 原生 `@deepseek-ai/dsh-tool-web`。

---

## 4. 参考源码与官方文档索引

- DeepSeek Harness 仓库：<https://github.com/deepseek-ai/deepseek-harness>
- 会话控制器：[`@deepseek-ai/dsh-api-session-controller`](../packages/flowspace/node_modules/@deepseek-ai/dsh-api-session-controller/src/types.ts)
- 嵌入式对话与输入插槽：[`@deepseek-ai/dsh-client-ui-conversation`](../packages/flowspace/node_modules/@deepseek-ai/dsh-client-ui-conversation/src/client/index.ts)
- 会话表面折叠参考：[`@deepseek-ai/dsh-session-reference`](../node_modules/.pnpm/@deepseek-ai+dsh@0.2.2-rc.3_77738992faf55e618332191a91c7227d/node_modules/@deepseek-ai/dsh-session-reference/src/projection.ts)
- 每轮工作区改动快照：[`@deepseek-ai/dsh-workspace-changes`](../node_modules/.pnpm/@deepseek-ai+dsh-web-app@0._90406528c7e2dde7b3a27b37f5226a01/node_modules/@deepseek-ai/dsh-workspace-changes/README.zh.md)
- 改动卡片与交付物预览：[`@deepseek-ai/dsh-client-ui-deliverables`](../node_modules/.pnpm/@deepseek-ai+dsh-web-app@0._90406528c7e2dde7b3a27b37f5226a01/node_modules/@deepseek-ai/dsh-client-ui-deliverables/src/client/index.ts)
- 工作区归属与有效工作目录：[`@deepseek-ai/dsh-workspace`](../packages/flowspace/node_modules/@deepseek-ai/dsh-workspace/src/entity.ts)、[`@deepseek-ai/dsh-working-directory`](../node_modules/.pnpm/@deepseek-ai+dsh-experiment_4079ff947db550c7b13fdaac259161cb/node_modules/@deepseek-ai/dsh-working-directory/src/index.ts)
- 终端控制器：[`@deepseek-ai/dsh-api-terminal-controller`](../node_modules/.pnpm/@deepseek-ai+dsh-api-termin_85cde0b3bbd9e2480af2995f31357fe7/node_modules/@deepseek-ai/dsh-api-terminal-controller/src/types.ts)
