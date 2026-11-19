# FlowSpace：DeepSeek Harness Agent 无限画布设计规范

本文档由 OMP Studio《Agent 无限画布：设计决定》（含原型 57 项决策 D01–D57 与审查修正 R1–R10）完整迁移并适配至 **DeepSeek Harness (`@deepseek-ai/dsh@0.2.2-rc.3`)** 插件体系。底层包级能力对照见 [DSH 能力分析与架构映射手册](capabilities.md)，逐项决策演变台账见 [产品与技术决策记录](product-decisions.md)，首个切片验证记录见 [FlowSpace 验证报告](verification.md)。

---

## 设计立场

- **视觉主张（Visual Thesis）**：安静的石墨色工作面、清晰的排版与克制的紫色强调色；关系图与工作现场本身就是首要视觉，不叠加装饰性背景渐变与无关插画。
- **内容组织（Content Plan）**：DSH 主导航（对话 / 画布并列）→ 画布与聚焦工作流 → 右侧当前对象检查器 → 底部按单次启动聚合的运行总览。单一主操作按钮负责启动当前所选范围。
- **交互主张（Interaction Thesis）**：基于 React 18 + `@xyflow/react` 直接操作节点与自定义 SVG 双端口连线；仅在接续真正处于激活/触发阶段时呈现流动动效；展开、避让、检查器与浮窗采用短促确定的过渡阶梯，开启「减弱动效（`L1`）」时保留全部状态信息而零位移闪烁。

---

## 1. 目标与分层原则

与 DSH 现有**对话工作区并列**，提供一张像 ComfyUI 一样自由、有创造力、可编排的 Agent 无限画布，既能可视化一个或多个项目中的分支、worktree、Agent 与子 Agent，也能直接进行多会话并行创作、上下文组装、自动接续、组合封装与复用：

1. **真实项目骨架 + 自由创作区**：默认围绕当前选中项目展示真实结构（分支、worktree 默认收起，按需独立开启；Agent 支持多维视觉筛选），剩余画布空间可自由摆放与创作。
2. **草稿与会话身份解耦**：在画布上双击即可创建 Agent 草稿，预先编写任务与挂载上下文引用，自动落盘保存；草稿启动后绑定真实 DSH `SessionId`，连线与布局无需重绑。
3. **两套用户端口 + 一套原生消息线**：**引用口**（圆点细线）只传上下文内容、绝不触发执行；**接续口**（标题栏箭头粗线）只连 Agent 与 Agent，决定谁接在谁后面跑以及传递哪种上下文；另有只读的**消息线**，忠实呈现 DSH 原生 Agent 间通信。
4. **多活嵌入式会话与工具协同**：多个 Agent 可同时展开为原生嵌入式对话卡片独立操作、各自审批；并可与文件、原生 Changes、迁移自 OMP Studio 的 Git 窗口、终端、交付产物、便签与看板自由连线。
5. **组合工作流与双轨保存**：支持最多两层分组嵌套、折叠为带公开双套端口的组合节点、局部启动，并区分保存为**可复用工作流模板**与**当前工作状态快照**。

**架构铁律**：
- 目标基线锁定已发布的 `@deepseek-ai/dsh@0.2.2-rc.3`。每个已启动的 Agent 节点都是真实的持久化 DSH `Session`，绝不使用模拟运行时或一次性匿名任务。
- **工作流调度器驻留在 Host**（渲染层绝不驱动执行）；离开画布或切回主对话页不断流。
- **可编辑画布文档与运行态严格分离**：撤销/重做（Undo/Redo）仅回滚布局、结构与草稿编辑，绝不重播模型请求或打断在途回合。

---

## 2. 已确认的产品与技术决定总表

| 主题 | 定稿决定（DSH 适配版） |
| :--- | :--- |
| **定位与入口** | DSH 主工作台下「对话」与「画布（FlowSpace）」并列（注册 `main` keyed slot 与 `sidebar.panellist`），共享同一套底层 `Session` 与 `Workspace` |
| **范围与默认** | 全局画布可同时容纳多个项目；默认显示当前选中项目节点；分支与 worktree 默认收起、可分别独立显示；Agent 拥有独立视觉筛选规则 |
| **自动结构** | **Git 项目保留四级**：`项目 → 分支 → worktree → Agent → 子 Agent`；**非 Git 项目**：`项目 → Agent → 子 Agent` |
| **视觉筛选** | `自动`、`仅运行`、`3 天内`、`7 天内`、`全部`；筛选隐藏仅影响画布视觉呈现，不删除节点/连线，**也不改变全局启动范围** |
| **创建节点** | **双击画布空白直接创建 Agent 草稿**；右键菜单、命令面板或浮动工具栏「添加」打开全部节点选择器；从端口拖线到空白按端口语义创建下游草稿或引出展示节点 |
| **草稿归属优先级** | 手动创建的 Agent 草稿若未显式连入/指定归属结构节点，则**优先挂到创建前画布上已选中的项目、分支或 worktree**（双击空白保留第一次点击前的选中项；若选中的是 Agent，则沿用该 Agent 所在归属）；**若无选中项，则自动挂到落点空间距离最近的项目/分支/worktree**。启动前可随时改，启动后固定（分叉入边除外，强制跟随上游） |
| **DSH 双目录归属** | 草稿在具体 worktree 下启动时，`session.header.cwd` 保持主项目根路径以保留 DSH 左侧栏项目归属，同时通过 `ctx.workingDirectory.set` 将实际执行目录切至目标 worktree；挂在无检出目录的分支上时先引导新建隔离 worktree，绝不暗中在主目录切分支 |
| **草稿自动保存** | 未发任务文本、预设模型/Plan 模式及预备引用自动合并落盘至 `flowspace` 存储域；折叠、切换视图或重启后完整保留 |
| **Agent 三种形态** | **精简卡**、**完整功能卡**、**画布内浮动窗口（含左右分屏吸附）**自由切换；三者指向同一个 Agent，移动而非复制 |
| **完整卡单主视图** | 未启动草稿态显示画布任务编辑器；绑定 `SessionId` 后直接挂载原生嵌入式 `conversation.content` 单主视图；当节点存在接续入边时，卡片顶部提供独立可折叠的**「接续指令（上游完成时发送）」**配置条，消除双输入框歧义 |
| **智能收纳与避让** | 低缩放时自动简化未固定卡片，支持手动固定，**强制保护正在输入与等待审批/提问的卡片**；展开精简卡时仅局部下推被遮挡邻卡并撑大所属分组，收起复位，不重排全图 |
| **侧挂详情卡** | 可紧挨 Agent 打开详情卡查看消息、工具轨迹或产物；默认复用一张，点击「固定」冻结当时快照后可再拆出新卡用于前后对照 |
| **两套用户连线** | 系统结构线之外，用户连线严格分两套：**引用口**（圆点细线，输出口 → 单一输入口）只传内容、不触发运行；**接续口**（标题栏箭头粗线，接续出口 → 接续入口）只连 Agent 与 Agent，控制执行顺序与上下文传递 |
| **只读消息线** | **原生消息的忠实呈现**：当两个 Agent 在 DSH Runtime 中发生原生消息往来（如 `agent-message`、`subagent-settled` 等原生通信事件）时自动出现双股青橙消息线；无端口、不可手拉或删除，原生消息怎么走就怎么画，Host 绝不拦截或伪造 |
| **接续方式（三种）** | 在接续线上切换：**提及 Agent**（给上游本轮最终结论）、**共享上下文**（给截至触发序号的 `foldSurface` 精简过程记录，**同树与跨会话树均可用**）、**分叉**（调 `sessionController.fork` 复制完整历史创建新会话，仅连未启动草稿）。**不实现「交接（Handoff）」** |
| **分叉线启动后转换** | 草稿按分叉首次启动后，该接续线自动转为**提及 Agent** 方式，并保留 `createdBy: 'fork'` 来源标记；一个草稿最多一条分叉入边 |
| **引用入口与 `@` 联动** | 支持拖线、拖消息/划词选区、拖文件及输入框内手敲 `@`；输入框 `@` 指向**画布已有节点**时自动补画/复用可见连线（`@会话` 建不触发的提及接续线，`@文件` 建引用线），`@` 画布外普通文件保持原生行内芯片，不乱生节点 |
| **展示节点** | `@` 某条消息或划词引出时生成**固定内容**展示节点；从 Agent 输出口直接拉线生成**跟随最新回复**展示节点（节点上可互切）；`deliverables/presented` 交付产物也可一键引出为展示/文件节点 |
| **胶囊与统一注入** | 引用线落入草稿框与原生 `conversation.composer.dock` 胶囊托盘（主对话与画布互通），支持 `待发` / `已发` / `来源已更新` / `始终带上` 四态（不支持拖入词法树句子中间）；发送时由 Host `agent/pre-step` 统一注入，超过 64 KiB 自动走 `ctx.spillStore` 落盘 |
| **四种启动范围** | **单 Agent 启动**、**选区启动**、**分组启动**、**全局启动**；批量启动仅触发范围内可执行的一级**起始 Agent**，后续节点按接续线推进；原生对话直接发消息默认同样推进下游接续（可全局或按节点关闭） |
| **全局启动四栏清单** | 全局启动前必出清单，按**立即启动 / 随后接续 / 等你确认 / 这次不运行（附原因）**四栏展示，标出视觉隐藏节点与所属项目，支持逐项取消勾选 |
| **推进、汇合与有界环** | 仅当上游回合 `turn/end` 且 `reason.kind === 'completed'` 时触发下游；多条接续入边默认汇合等待本次运行全部上游完成；允许成环，默认每次启动最多 **3 轮**（线上可改）；选区/分组外边界自动停靠为「待触发」 |
| **忙时排队与 Plan 挂起** | 下游忙碌时入原生队列（`mode: 'queue'`），**触发瞬间立即固化上游 `atSeq` 快照**；Plan 模式复用原生 `dsh-plan-mode` 在同一回合内挂起等待批准，保留原 `runId` 与范围边界 |
| **分组与双轨保存** | 分组最多嵌套 **2 层**，折叠后为带两套公开端口的组合节点；支持保存**工作流模板**（稳定槽位同步 R1 + 双语字典键 R9）与**当前工作状态快照**（含缩略摘要预览 R10） |
| **工具与内容节点** | 支持 **Changes（对接 DSH 原生 `workspace-changes`）**、**Git（迁移自 OMP Studio Git 窗口）**、**文件**、**终端（一期读屏快照 + 跳原生终端，二期嵌实时流）**、**便签**、**手写看板（单卡稳定 ID 引用）**；**网页节点暂不实现** |

> 「自动」视觉筛选包含：当前正在运行或等待交互的会话、在画布中创建的会话，以及用户从侧栏显式拖入画布的会话。

---

## 3. 画布对象、连线、卡片与执行规范

### 3.1 节点类型总览

收起态统一称为**精简卡**，展开态称为**完整功能卡**。

| 节点类型 | 数据来源 | 精简卡展示 | 完整功能卡 / 弹窗能力 |
| :--- | :--- | :--- | :--- |
| **项目（Project）** | `workspaceController` 工作区列表 | 项目名称、根路径/远程标识、运行数与等待数 | —（仅精简结构锚点，提供新建分支/Worktree 与草稿入口） |
| **分支 / Worktree** | Host Git 服务 + `worktreeProjection` | 分支名、Worktree 目录名、领先/落后计数、未提交改动标记 | 展开即打开绑定该目录的 **Git 面板** |
| **Agent（顶层会话 / 草稿）** | `CanvasDocument` 草稿 + DSH `Session` | 标题、生命周期阶段、模型徽标、等待原因、草稿首行或最新回复摘要、双套端口 | 未启动：任务草稿编辑器 + 模型/Plan/归属选择 + 胶囊托盘；已启动：原生嵌入式 `conversation.content` + 可折叠接续指令条 + 胶囊托盘 |
| **子 Agent** | `subagentCatalog` / `listDescendants` | 默认折叠为父 Agent 上的计数徽标；展开后显示名称、角色、状态、模型 | 只读/可控原生子会话对话视图 |
| **Git 节点** | **迁移自 OMP Studio Git 模块**（Host `ctx.subprocess`） | 当前分支、`ahead/behind`、Working/Staged 变更数、最近提交摘要 | 迁移 `GitQuickCard`（中卡）与 `GitWorkbench` / `GitStatusPanel` / `GitCommitGraph` / `GitPatch`（大卡/浮窗）：支持查看/暂存/提交/同步及按提交、PR、工作区 Diff 拉出引用线 |
| **Changes 节点** | **DSH 原生 `dsh-workspace-changes`** | 关联 Agent 轮次号（`Turn #N`）、改动文件总数、`+added / -deleted` 行数 | 读取原生 `/api/changes.summary` 与 `/api/changes.diff` 展示改动文件列表与 Hunk Diff；支持整轮或单文件拉出引用线（连线瞬间固化快照），并可一键在右侧栏打开原生 `changes-review` |
| **文件节点** | DSH 原生 `workspaceFiles` | 文件/目录名、相对路径、修改状态 | 代码/文本分页预览或目录树列表；支持点击调起右侧栏预览或桌面编辑器打开 |
| **终端节点** | DSH 原生 `terminalController`（依附 Agent Session） | 关联 Agent 名称、终端标题、运行状态与末尾几行输出 | **一期**：通过 `terminalController.screen()` 读取去转义干净屏幕文本、支持框选或整屏作为引用快照并一键跳转原生终端面板；**二期**：接入 `terminalController.attach` 渲染卡内实时 xterm |
| **展示节点（Display）** | 消息/划词引出、Agent 输出口拉线、`deliverables/presented` 产物 | 内容前几行摘要、来源标识、`固定 / 跟随最新` 标记 | 完整 Markdown / 代码只读视图，提供「固定快照 ⇄ 跟随最新回复」开关，右侧暴露引用输出口供一对多分发 |
| **便签（Note）** | `CanvasDocument` | 前几行正文预览与色标 | 可直接编辑的 Markdown / 纯文本便签，暴露引用输出口 |
| **手写看板（Board）** | `CanvasDocument` | 各列名称与卡片计数 | 多列看板（支持新建、编辑、跨列拖拽、删除卡片）；点选单卡时暴露单卡稳定 ID 引用，未点选时引用整板 |
| **分组框 / 组合节点** | `CanvasDocument` | 折叠后成为组合节点：标题、色标、成员状态汇总与映射后的公开引用口/接续口 | 展开为自由容器框（最多两层嵌套），支持整组拖动、局部整理与分组启动 |

> **范围说明**：工具节点中的**网页（Web）节点本阶段不做**，不在添加菜单中提供半成品占位。分组框仅提供视觉组织、组合端口与局部启动边界，**绝不隐式改写内部成员原有的项目、分支、worktree 或工具作用域**。

### 3.2 结构线、两套用户连线、原生消息线与中继点

1. **系统结构线（只读派生）**
   - 层级：Git 项目走 **`项目 → 分支 → worktree → Agent → 子 Agent`** 四级；非 Git 项目走 **`项目 → Agent → 子 Agent`**。
   - 分支层与 worktree 层默认收起，工具栏提供两个独立显隐开关；收起时结构线自动跨层连向可见子级，不能通过拖拽结构线篡改已启动会话的真实归属。

2. **引用线（输出口 → 输入口，传内容）**
   - **端口样式**：位于卡片标题栏下方区域，左进右出，**圆点图标 + 细实线**；未接线的空闲端口平时弱化收起，悬停或拖线时显现（R8）。
   - **语义**：来源可为文件、Git 条目、Changes 轮次/单文件、终端屏幕快照、便签、看板（整板或单卡）、展示节点或 Agent 输出口；目标只能是 Agent 的**唯一引用输入口**，落入目标胶囊托盘。**引用线永远不触发目标 Agent 运行。**

3. **接续线（接续出口 → 接续入口，排先后与传上下文）**
   - **端口样式**：位于 Agent 卡片标题栏同一行，左进右出，**箭头形图标 + 粗线**；触发推进期间呈现方向流动光效。
   - **两项线上配置**（点击连线标签或在右侧检查器修改；拖线期间标签自动指针穿透 `pointer-events: none` 以免挡住端口落点 D48）：
     - **接续方式（3 种）**：`提及 Agent (mention)`、`共享上下文 (share)`、`分叉 (fork)`（详见 §4.4）。
     - **触发策略（3 种）**：`不触发 (off)`、`自动接续 (auto)`、`等待确认 (confirm)`。
   - 接续线拥有独立的运行态（待触发、运行中、等待确认、已完成、边界停靠），不进入引用胶囊托盘。

4. **只读消息线（DSH 原生消息呈现）**
   - **生成条件**：完全跟随 DSH Runtime 原生通信事实——只要画布上可见的两个 Agent 之间产生过持久化原生消息（例如 `@deepseek-ai/dsh-subagent` / `dsh-agent-team` 写入事件日志的 `source.kind === 'agent-message'` 往来消息或 `'subagent-settled'` 回传消息），画布即自动在二者之间绘制消息线。
   - **纯粹只读**：无端口、不可手动拉线、不可删除、无配置项；消息如何路由、何时唤醒对方完全遵循 DSH 原生机制，FlowSpace Host 不拦截、不代理、也不在无原生通信的会话间伪造消息线。
   - **双股眼形弧线与动效**：一对 Agent 共用一条双股细弧线，从卡片上下边缘进出（左右侧留给引用口与接续口）。先发消息方向为**青色股**，回复方向为**橙色股**，单向未发时不画对应股；新消息到达时沿对应股滑过光点并点亮接收方外框，减弱动效（`L1`）下仅更新颜色与计数气泡。
   - **往来气泡与引出**：线中气泡常驻双向计数与最新摘要；点击展开只读往来记录弹窗，支持一键定位回发送方对话，或将单条原生消息**引出为画布展示节点**再通过引用线分发给其他 Agent。

5. **连线中继点与低缩放简化**
   - 双击任意引用线或接续线可插入可拖拽、可删除的**中继拐点（Waypoints）**，仅调整走线几何，不改变语义；SVG 命中层随可见画布动态覆盖并留足点击热区（D47）。
   - 画布缩小时自动隐藏静态非关键细线，仅保留结构主干、正在流动的接续线与刚产生新消息的消息股；选中某个节点时高亮其全部关联连线并淡化其余线条。

### 3.3 Agent 卡片内部结构、渐进缩放与避让保护

1. **生命周期与显示形态解耦**
   - **生命周期**：`草稿 (draft)`、`空闲 (idle)`、`运行中 (running)`、`等待确认/审批/提问 (waiting)`、`已完成 (completed)`、`已中止 (aborted)`、`异常 (error)`。
   - **显示形态**：`精简卡 (compact)`、`完整功能卡 (full，标准尺寸 312 × 392，可自由拉大)`、`画布内浮窗 (window)`。

2. **完整功能卡「单主视图 + 独立接续指令条」（消除双输入框冲突）**
   - **草稿阶段（尚未创建 DSH Session）**：展示画布任务编辑框、模型选择器、Agent / Plan 模式切换、归属显示/切换器及底部引用胶囊托盘。此时不在 DSH 中提前创建空会话，避免污染左侧栏历史列表。首次启动若未手动命名，自动提取任务首行作为会话标题（D38）。
   - **活会话阶段（已绑定 `SessionId`）**：卡片主体直接挂载 DSH 原生 **`conversation.content (variant: 'embedded')`**，共用同一个 `SessionProvider` retain 引用计数。原生消息流、代码高亮、每轮尾部改动文件卡（`DeliverablesTail`）、工具审批表单（`dsh-user-approval`）、追问表单（`dsh-tool-ask-user`）与底部 Lexical 聊天输入框全部原生工作，且保持独立阅读滚动位置（D39）。
   - **可折叠「接续指令条」**：当该 Agent 存在至少一条接续入边（`trigger !== 'off'`）时，卡片顶栏下方展示轻量的可折叠「接续指令（上游完成时自动发送）」编辑条（默认继承首次启动时的草稿文本，可独立修改）。用户在底部原生输入框日常插话追问不会覆盖自动接续指令；上游完成触发时也不会误把底部敲了一半的聊天草稿发出去。

3. **缩放语义简化、收纳保护与局部避让**
   - 桌面默认滚轮缩放画布、拖拽空白或按住空格平移（设置可切换滚轮平移；指针位于展开卡片可滚动正文内时卡片滚动优先，`Ctrl + 滚轮` 始终缩放画布 D06）；弹层菜单与 Tooltip 独立于缩放层渲染（D09）。
   - 缩小过阈值时，语义缩放补偿精简卡标题与等待状态字号（D41），自动简化未固定展开卡；但**手动固定（Pinned）、正在输入编辑中、处于等待审批/Plan 批准/接续放行状态的卡片受强制保护，绝不自动收起**（D10）。
   - **局部避让（R4）**：将精简卡展开为完整卡时，自动置于同层上方，仅局部下推会被遮挡的直接相邻节点并临时撑大所在分组框，收起卡片时平滑复位，不重排整张画布。

### 3.4 画布内浮窗吸附层（Alt 拎出）与侧挂详情卡

1. **Alt 拎出浮动窗口（Canvas Overlay & Split Dock）**
   - 按住 `Alt` 拖拽 Agent 或工具节点（或点卡片标题栏弹出按钮），将其移入画布工作区顶层的**浮窗与分屏吸附层**（支持自由改尺寸、左半屏/右半屏分屏吸附——吸附时画布视口自动让出另一半空间、最大化、关闭或按住 `Alt` 拖回原位 D11/D57）。
   - **移动而非复制**：浮窗与原节点共享同一份 `SessionId`、输入状态与滚动位置；画布原位保留一张带「已在浮窗打开」标记的精简占位卡，所有连线保持不断。

2. **侧挂详情卡与右侧栏协同**
   - 点击 Agent 的执行步骤、某条消息或产物可在卡片旁开启**侧挂详情卡**；默认复用同一张跟随最新状态，点击「固定」后冻结当时的状态、事件与结果快照，允许再开新详情卡作并排对照（D12/D53）。
   - 画布自带默认收起的**右侧对象检查器**（配置选中节点策略、接续线方式/轮数、组合端口映射）；同时当选中已绑定 `SessionId` 的节点、文件或改动项时，提供快捷按钮联动呼出 DSH 全局原生右侧栏（打开文件树、原生终端、`changes-review` 逐文件审阅或 Office/PDF 预览）。

### 3.5 分组框、组合节点与工作流双轨保存

1. **两层自由分组与组合节点**
   - 分组框支持标题、色标、拖标题栏整组移动、拖入拖出成员、「整理此组」局部对齐；**嵌套最多两层**（如外层总流程包内层阶段组 D19/D52）。
   - 分组折叠后收束为**组合节点**，保留内部全部布局与连线；跨组边界的引用线与接续线自动映射为组合节点左右两侧的**公开引用口与公开接续口**，支持在检查器中重命名、排序、隐藏或合并同类输入口（D19）。

2. **工作流模板与稳定槽位同步（吸收 R1 / R9）**
   - **工作流模板**只保存拓扑结构、角色预设、任务提示词模板、组合端口映射、中继点与相对布局，跨边界外部连线转为抽象接口占位符，**不保存实时 `SessionId` 或历史对话**；支持本地模板库与 JSON 导入导出（D20/D34）。
   - 内置工作流起手式名称存储稳定的**双语字典键**，随 DSH `ctx.locale` 即时切换语言，用户手动改名后写入独立 `customTitle` 字段覆盖显示（R9）。
   - 从模板实例化分组后保留 `templateSourceId` 与每个成员稳定的 **`templateSlotId`**。当模板升级并执行「手动同步」时：**按 `templateSlotId` 原地增量更新结构**，完整保留实例已绑定的 `sessionId`、在途运行态、项目归属及连向外部节点的引用线/接续线；同步前列出差异清单，对用户已手工改写过的节点任务提供「保留实例修改 / 采用模板新版」逐项选择，且整次同步可一键撤销（R1）。

3. **当前工作状态快照（吸收 R10）**
   - **工作状态快照**保存整张画布的布局、草稿、引用胶囊状态、连接、分组、排队输入，以及每个 Agent 最近 5 条消息摘要、近期事件与交付产物列表（默认不复制完整底层日志 D22）。
   - 快照列表卡片直接展示**缩略结构摘要、草稿数、恢复后将标记为中断的运行任务数、待确认/排队数及最近产物名**（R10）；执行恢复时安全停止在途调度，将原运行中节点标为「已中断」，由用户决定从何处继续。

### 3.6 四种启动入口、准入规则与 Host 接续调度

| 启动入口 | 作用域范围 | 启动起点规则 |
| :--- | :--- | :--- |
| **单 Agent 启动** | 指定单个 Agent | 立即执行该节点当前已保存任务；完成后**照常沿其下游接续线推进** |
| **选区启动** | 框选 / `Shift` 多选的节点与分组 | 仅启动选区内可执行的一级**起始 Agent**；通往选区外的接续线停在边界标记「待触发」 |
| **分组启动** | 指定分组内的一级成员 | 仅启动组内可执行的一级起始 Agent（内嵌子分组视为组合节点，不粗暴摊平）；通往组外的接续停在边界 |
| **全局启动** | 全画布所有符合条件的 Agent（**含被筛选隐藏者**） | 先弹出**四栏启动确认清单**（R6），确认后启动全部勾选的一级起始 Agent |

**四栏全局启动清单（吸收 R6）**：
不再把接续下游误标为「跳过」，而是清晰分列四栏：**① 立即启动**（一级起始节点，标明所属项目与是否处于筛选隐藏态，可逐个取消勾选）、**② 随后接续**（将由上游推进执行的下游节点）、**③ 等你确认**（经过 `confirm` 连线或 `仅手动` 节点的步骤）、**④ 这次不运行**（折叠列出空白、运行中、已完成无变化、暂停参与等节点及具体原因）。

**批量准入与 `runPolicy` 双维度策略（D18 / D44）**：
- **参与范围维度（`participate`）**：`global`（默认参与批量起点）| `manual`（仅手动：不作为批量起点，上游接续到达时自动转为等待用户确认放行）| `paused`（暂停参与：批量与自动接续均停靠跳过）。
- **重跑条件维度（`rerun`）**：`on-new-input`（默认：新草稿或有新任务输入才跑；仅引用来源更新只点亮胶囊不自动跑）| `on-source-update`（有存稿且任一引用胶囊处于「来源已更新」即允许跑）| `always`（每次批量启动均用存稿重跑）。

**Host 调度推进十条准则**：
1. **发起源统一**：点击画布四种启动按钮，或在已绑定 Agent 的嵌入式卡片 / 主对话页直接发送用户消息（默认开启原生聊天接续联动，支持全局与单节点开关覆盖），均在 Host 注册或关联一次 `Run`。
2. **严格正常完成判定**：Host 通过 `requestId → user/message.source.rpcId → agent/inbox/claimed → turn/end` 精确追踪回合，**仅当 `turn/end.reason.kind === 'completed'` 时触发下游**；中止（`aborted`）、异常（`error`）、阻塞（`blocked`）、中断（`interrupted`）均不推进下游。
3. **下游输入组装**：下游节点收到其自身的「接续指令存稿」+ 上游按接续方式提取的内容；若上下游之间已额外连有更具体的引用线（如从上游特定消息引出的展示节点），则以具体引用线为准，不重复塞入默认结论。若下游既无接续存稿也无待发任务，则停在线上提示原因而不发空消息。
4. **多路汇合（Join）**：具有多条活动接续入边的节点，默认等待**本次运行范围内所有可达活跃上游全部正常结束**后合并触发一次。
5. **有界循环（Bounded Loop）**：允许接续线成环（如 `实现 → 审查 → 实现`），每条成环接续线默认单次启动最多执行 **3 轮**（`maxRounds: 3`，线上可改），达上限后停靠提示，支持人工一键续跑一轮。
6. **范围边界保护**：选区启动或分组启动时，跨越范围边界指向外部节点的接续线自动停在边界，连线与目标卡同时标记「超出本次范围 · 待放行」，点击即可放行。
7. **忙时排队与快照固化（吸收 R3）**：下游正在运行时被触发，Host **在触发当下立即按上游完成序号 `atSeq` 提取并固化本次接续负载快照**，再通过 `sessionController.prompt({ mode: 'queue' })` 排入下游队列；即使下游排队期间上游又跑了新回合，队列项消费的仍是触发当次的确切结果。
8. **Plan 模式同回合挂起（吸收 R2）**：开启 Plan 模式的节点调用原生 `exit_plan_mode` 时，处于同一未结束 Open Turn 的挂起提问态（`pendingInteraction.kind === 'question'`）；用户在卡内点击批准后原地继续完成该回合，**原 `runId`、选区/分组边界与循环计数 100% 保持不断裂**。若模型在 Plan 激活态未调 `exit_plan_mode` 即结束回合，调度器将其标为「待确认计划」而不擅自推进下游。
9. **等待确认双处放行（D32）**：设为 `等待确认 (confirm)` 的接续线在上游完成后，在**连线中点气泡**与**下游卡片正文首部**同时展示将发出的内容预览与「放行 / 跳过」按钮，并计入顶栏画布图标与视口边缘等待提醒。
10. **退出与重启安全恢复（D42）**：Host 进程退出时停止未发出的调度；下次启动先读取各 `Session` 真实事件日志对齐状态，保留未消费的已捕获接续令牌与队列项供用户手动恢复，**绝不自动重放任何模型请求**。

### 3.7 运行可视化、单次运行总览与无障碍导航

- **底部「单次运行总览」面板（吸收 R5）**：默认收起，按每次启动的 `runId` 聚合为一张运行总览卡，直观回答四件事：**目标与范围、完成步骤比例、当前卡在哪个审批/确认/异常节点、本轮通过 `@deepseek-ai/dsh-tool-present`（`deliverables/presented`）产出的交付文件**；展开卡片可查看详细事件时间线并点击定位回对应 Agent 消息，失败节点旁提供「重跑此节点及受影响下游」入口。
- **视口边缘提醒与导航**：屏外存在等待审批、等待 Plan 确认或等待接续放行的节点时，视口边缘浮现方向胶囊，点击平滑定位；提供默认收起的小地图（D31）、全局命令面板（搜索项目/Agent/模板/命令 D24）与窄窗口抽屉导航（D46）。
- **键盘焦点接管（吸收 R7）与动效分级**：所有模态框（全局启动清单、模板同步对比、帮助、新建分支/Worktree 输入框）打开时强制将初始焦点移入框内并锁定 `Tab / Shift+Tab` 循环，`Escape` 关闭后焦点精确归还触发按钮；开启系统或应用「减弱动效」时挂载 `data-perf-tier="L1"`，连线流动与位移动画归零，保留全部色彩与数字状态。

---

## 4. 上下文连线、引用胶囊与接续传递细节

### 4.1 输入框 `@`、拖线与展示节点

1. **拖线与条目级引用**：从文件、Git 节点的某个 Commit/PR/变更项、Changes 节点的某轮/某文件、终端快照、便签、看板（点选单卡或默认整板）的输出口拉线至目标 Agent 输入口，建立可见引用线。
2. **输入框手敲 `@` 的克制联动（A3）**：
   - 在画布卡片输入框内 `@` 某个**已在当前画布上存在的会话** → 自动建立/复用一条 `方式=提及 Agent、触发=不触发` 的接续线；
   - `@` 某个**已在当前画布上存在的文件节点** → 自动建立/复用一条引用线；
   - `@` **不在画布上的普通文件** → 保留 DSH 原生行内 `@path` 芯片直接生效，**不在画布空白处自动生成满地文件节点**（用户可通过芯片菜单手动「固定到画布」）。
3. **展示节点的固定与跟随**：
   - 通过原生对话划词/消息菜单（`conversation.chat.text-interaction`）引出某段回复 → 生成**固定内容**展示节点；
   - 从 Agent 引用输出口直接拉线到空白或目标输入口 → 生成**跟随来源 Agent 最新已完成回复**的展示节点；
   - 节点顶栏提供开关随时在「固定快照」与「跟随最新」间切换；引用单条消息始终经展示节点走引用口，不走接续口。

### 4.2 胶囊托盘与四态生命周期

引用胶囊托盘同时挂载在草稿编辑框底部与 DSH 原生 **`conversation.composer.dock`** 插槽上（主对话视图与画布卡片实时同步同一份胶囊状态；不将胶囊拖入 Lexical 富文本词法树句子中间）：

| 胶囊状态 | 视觉表现 | 发送时行为（Host `agent/pre-step`） | 状态流转条件 |
| :--- | :--- | :--- | :--- |
| **待发 (`pending`)** | 高亮主题色胶囊 | 自动组装注入本轮用户消息前部 | 新建引用线默认进入此态；成功进入 Step 后转为 `已发` |
| **已发 (`sent`)** | 柔和灰化保留在托盘 | 本轮不重复注入（节省上下文窗口） | 点击胶囊可手动重新点亮为 `待发` |
| **来源已更新 (`updated`)** | 重新点亮并带更新圆点 | 下次发送时自动重新注入最新内容 | 文件 `mtime`/哈希变化、跟随态展示节点产生新回复、看板被引用卡片正文修改 |
| **始终带上 (`always`)** | 常亮并带图钉图标 | 该 Agent 每一轮用户消息均自动注入 | 在引用线或胶囊菜单开启「始终带上」 |

### 4.3 来源编码与超长落盘规则

所有待注入胶囊由 FlowSpace Host 在 `ctx.on('agent/pre-step', ..., { prepend: true })` 钩子中统一解析（仅针对 `source.kind === 'user'` 的真实回合准入）：

| 引用来源 | Host 注入编码形式 | 取值与快照时机 |
| :--- | :--- | :--- |
| **文件 / 目录 / 图片** | 原生 `@path` 引用指引（交由 DSH 文件工具与多模态读取） | 发送准入时实时指向目标工作区路径 |
| **Changes 改动（整轮或单文件）** | `<canvas-reference kind="changes">` Hunk Diff 文本块 | **连线建立瞬间**从 `workspaceChanges` 提取并持久化快照（防重启丢失） |
| **Git 提交 / PR / 未提交改动** | `<canvas-reference kind="git-*">` 结构化元数据与补丁快照 | **连线建立瞬间**固化所选条目快照（对齐 D55） |
| **终端屏幕输出** | `<canvas-reference kind="terminal">` 去转义纯文本块 | 连线建立或点击「刷新快照」时从 `terminalController.screen()` 捕获 |
| **展示节点（固定 / 跟随）** | `<canvas-reference kind="display">` 文本块 | 固定模式取引出时文本；跟随模式取来源 Agent 最新已完成回合结论 |
| **便签 / 看板（单卡或整板）** | `<canvas-reference kind="note\|board-card\|board">` 文本块 | **发送准入瞬间**按节点 ID 或看板卡片稳定 `cardId`（D50）读取最新正文；卡片删除时自动清理对应引用 |

**超长内容自动落盘（D36）**：当单条文本快照或当次累计注入文本超过 **64 KiB UTF-8** 时，FlowSpace 自动调用 DSH 原生 **`ctx.spillStore.saveText({ owner: targetSessionId, content, suggestedName })`** 将完整内容写入目标 Session 专属存储，并在 `<canvas-reference>` 中替换为落盘文件定位符与按需分段读取说明。

### 4.4 Agent 连 Agent：三种接续方式的精确行为

| 接续方式 | 下游收到什么 | DSH `0.2.2-rc.3` 执行路径 | 可用范围与约束 |
| :--- | :--- | :--- | :--- |
| **提及 Agent (`mention`)**（默认） | 上游 A 在触发回合（截至 `atSeq`）的最终 Assistant 文本结论 | Host 从 `sessionQuery` 提取 `[0..atSeq]` 内最后一轮完成回复，封装为 `<upstream-conclusion>` 连同下游存稿发入 `sessionController.prompt` | **全范围可用**（已启动会话、未启动草稿、同树或跨顶层会话树完全一致） |
| **共享上下文 (`share`)** | 上游 A 截至 `atSeq` 的精简对话过程快照 | Host 对 A 的 `[0..atSeq]` 事件前缀执行与 `dsh-session-reference` 同构的 `foldSurface`（保留 User/Assistant 正文与 `compact-checkpoint`，剔除工具调用噪音；超 64 KiB 走 `spillStore`） | **全范围可用**（取消原 OMP 跨会话树置灰限制；界面明确展示其为截至触发回合的过程记录快照） |
| **分叉 (`fork`)** | 完整继承上游 A 截至 `atSeq` 的全部会话历史，并派生为新会话 | Host 调用原生 `sessionController.fork({ sessionId: A, atSeq })` 获得新 `SessionId` 绑定至草稿 B，随后将 B 的存稿作为分叉后首条消息发出 | **仅允许连向未启动草稿**；每个草稿最多 **1 条**分叉入边，归属强制跟随上游 A；**B 启动后该线自动转为 `mention` 并保留 `createdBy: 'fork'` 标记** |

> **明确排除项**：本设计**不提供「交接（Handoff）」接续方式**，避免调用 `compaction` 污染源会话或额外消耗一次摘要模型往返；需要轻量摘要时用 `mention`，需要推理脉络时用 `share`，需要完整工具与上下文现场时用 `fork`。

---

## 5. 项目四级结构、归属解析与 OMP Git 窗口迁移

### 5.1 四级自动结构与手动草稿归属判定链

1. **四级结构派生**：
   - Git 仓库展示 **`项目（Workspace） → 分支（Branch） → worktree → Agent（顶层 Session / 草稿） → 子 Agent`**；非 Git 目录展示 **`项目 → Agent → 子 Agent`**。
   - `分支` 与 `worktree` 默认折叠收起（`structureVisibility: { branches: false, worktrees: false }`），顶部视图栏可分别开启。
2. **手动新建 Agent 草稿的归属判定顺序**：
   - **第一优先级（显式指定 / 结构连入）**：用户从某个项目/分支/worktree 节点操作菜单新建，或在草稿检查器/卡片头中手动指定了目标归属；
   - **第二优先级（当前选中项继承）**：若未手动指定，检查创建动作发生前画布上的当前选中对象（双击空白创建时保留第一次点击前的选中状态）：若选中了某个 `worktree`、`分支` 或 `项目`，直接挂入该对象；若选中的是另一个 `Agent`，则继承该 Agent 所在的 `worktree / 分支 / 项目`；
   - **第三优先级（落点空间就近）**：若画布当前无选中对象，则计算新草稿落点坐标到可见 `worktree / 分支 / 项目` 结构节点的几何距离，自动挂入最近的结构节点（画布没有任何其他项目时挂入当前活动工作区）；
   - **分叉覆盖规则**：一旦向草稿连入 `fork` 接续线，草稿归属锁定为跟随分叉上游 Agent 的项目与工作目录。

### 5.2 启动时的 Worktree 绑定与安全切分支

- **挂在主项目或已有 Worktree 上启动**：调用 `sessionController.create({ workspaceId })` 保持 `session.header.cwd === workspace.path`（确保该会话正常显示在 DSH 原生左侧栏对应项目下）；若目标归属为非主目录的子 `worktree`，紧接着调用 `ctx.workingDirectory.set(agent, worktreePath)` 切换运行期有效目录。
- **挂在尚无独立检出目录的分支上启动**：**严禁在主工作树暗中执行 `git checkout`**（以免破坏主目录其他并发 Agent 的文件基线），而是弹出轻量确认框并通过 Host Git 服务调用 `worktree.create` 为该分支创建隔离检出目录后再启动。

### 5.3 OMP Studio Git 窗口完整迁移架构

将 OMP Studio 已验证成熟的 Git 窗口体系直接迁移为 FlowSpace 的内置能力，同时承担「四级结构数据源」与「画布 Git 工具节点 / 浮窗」双重职责：

1. **Host Git 服务层（迁移自 `git-service.ts` / `git-process.ts` / `git-log.ts`）**：
   - 基于 DSH `ctx.subprocess` 运行 Git 与可选 `gh` CLI，继承 `GitWriteQueue` 串行写队列与 `expectedRevision` 乐观并发校验，防止多面板误覆盖；
   - 监听 `.git` 与 `commonDir` 变更（400ms 防抖 + 内部命令后静默窗口），实时推送分支、Worktree、未提交改动与提交图更新。
2. **画布 Git 卡片与浮窗（迁移自 `GitQuickCard` + `GitWorkbench` / `GitStatusPanel` / `GitCommitGraph` / `GitPatch`）**：
   - **精简 / 中尺寸卡（`GitQuickCard` 形态）**：提供 `Changes / History / Issues / PR` 四视图切换、分支同步按钮（Fetch / Pull / Push）、SVG 提交拓扑图与文件状态标记；每条 Commit、PR/Issue 或未提交分组均暴露画布**引用输出动作**，一拉即连向目标 Agent；
   - **完整卡 / 独立浮窗（`GitWorkbench` 形态，同时作为 `分支 / worktree` 节点的展开视图）**：提供左右可调分屏 Diff（Working / Staged 双区对比）、文件暂存/还原、提交说明编辑与提交、分支及 Worktree 新建/锁定/移除；原桌面端依赖 `window.prompt` 的交互全部升级为画布统一的应用内无障碍模态框（R7）。

---

## 6. 数据契约与持久化分层

### 6.1 可编辑画布文档（`CanvasDocument`）

结构节点（项目、分支、worktree、已存在 Session、子 Agent）与消息线从实时读模型动态派生；`CanvasDocument` 仅持久化用户布局、草稿、工具作用域、分组和两套用户连线：

```ts
export type CanvasDocument = {
  version: 2;
  viewport: { x: number; y: number; zoom: number };
  visibleProjects: string[];
  filter: "auto" | "running" | "3d" | "7d" | "all";
  structureVisibility: { branches: boolean; worktrees: boolean };

  placements: Record<string, {
    x: number;
    y: number;
    width?: number;
    height?: number;
    form?: "compact" | "full" | "window";
    pinned?: boolean;
    subAgentsExpanded?: boolean;
  }>;

  nodes: Array<{
    id: string;
    kind: "agent" | "git" | "changes" | "file" | "terminal" | "display" | "note" | "board";
    title?: string;
    customTitle?: boolean;
    /** 归属作用域（workspaceId / branch / worktreePath / sessionId），分组移动不改写它 */
    affiliation?: {
      workspaceId: string;
      branch?: string;
      worktreePath?: string;
    };
    payload: unknown;
  }>;

  /** 画布节点 ID 与真实 DSH SessionId 解耦：草稿启动后写入 sessionId，连线无需重绑 */
  agentBindings: Record<string, {
    sessionId?: string;
    model?: string;
    planMode?: boolean;
    nativeChatContinuation?: boolean;
  }>;

  /** 未启动草稿文本与下游节点的独立「接续指令」存稿分开保存 */
  agentDrafts: Record<string, {
    initialPrompt: string;
    continuationPrompt?: string;
  }>;

  runPolicy: Record<string, {
    participate: "global" | "manual" | "paused";
    rerun: "on-new-input" | "on-source-update" | "always";
  }>;

  groups: Array<{
    id: string;
    title: string;
    dictKey?: string;
    color: string;
    members: string[];
    parentGroupId?: string; // 限制最多两层嵌套
    collapsed: boolean;
    exposedPorts?: Array<{
      id: string;
      kind: "reference-in" | "reference-out" | "continuation-in" | "continuation-out";
      label: string;
      hidden?: boolean;
      targets: Array<{ nodeId: string; port?: string }>;
    }>;
    templateLink?: {
      templateId: string;
      templateVersion: number;
      slotMap: Record<string, string>; // templateSlotId -> 实例 nodeId（支撑 R1 原地同步）
    };
  }>;

  /** 引用线：输出口 → 输入口（绝不触发运行） */
  references: Array<{
    id: string;
    from: {
      nodeId: string;
      itemKey?: string; // 如看板 cardId、Git commit oid、Changes 文件索引
      snapshot?: { text?: string; spillPath?: string; capturedAt: string; fingerprint: string };
    };
    toNodeId: string;
    always: boolean;
    sentState?: { sentAt: string; fingerprint: string };
    waypoints?: Array<{ x: number; y: number }>;
  }>;

  /** 接续线：接续出口 → 接续入口（只连 Agent 与 Agent，共三种方式） */
  continuations: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    mode: "mention" | "share" | "fork";
    trigger: "off" | "auto" | "confirm";
    createdBy?: "fork"; // 分叉草稿首次启动后 mode 自动转为 mention，此处保留来源
    maxRounds?: number; // 成环轮数上限，默认 3
    waypoints?: Array<{ x: number; y: number }>;
  }>;
};
```

### 6.2 `storageDomain` 四表职责隔离

通过 `@deepseek-ai/dsh-storage-domain` 在 `flowspace` 域下分表持久化，避免单文件膨胀：
1. **`documents`**：保存 `CanvasDocument`（编辑变更防抖合并落盘，离开视图立即冲刷 D23；本地维护纯编辑 Undo/Redo 历史栈，撤销绝不触碰运行态 D33）。
2. **`runs`**：保存 Host 调度器的 `FlowSpaceRunRecord`（每次启动的 `runId`、范围边界、各环线已跑轮数、汇合等待表、已固化的 `atSeq` 接续载荷令牌、边界停靠与待确认项、关联的 `deliverables/presented` 产物索引及步骤时间线）。
3. **`templates`**：保存可复用工作流模板及版本号（含内置双语字典键模板与用户自定义模板）。
4. **`snapshots`**：保存「当前工作状态快照」元数据、缩略摘要统计（草稿数、中断数、待确认数、近期产物）与恢复负载。

---

### 6.3 原生团队与可移植工作流

在「工作流 → 团队」中编辑全局角色和编制。添加团队节点时选择编制，画布保存 `kind: "agent"`、`teamRef.teamId` 和引用版本。新主管使用普通 DSH Session，接续可传入上游结论或共享上下文。双击节点头可进入团队视图，查看主管对话、岗位、成员对话、原生消息线和任务板。

启动时，Host 固定主管路由并开启原生 Team 模式。每次新一轮工作加载编制及其角色版本。成员通过 `team_delegate` 建立原生会话，模型和角色指令来自岗位。旧成员保留创建时的配置，岗位配置变更后可启动符合新配置的成员。成员的审批约束及人与成员的 Queue、Steer 和中断由 DSH 执行。

`flowspace` 存储域增加 `roles`、`teams` 和 `team_sessions`。绑定记录保存主管 ID、锁定的编制及角色、成员与岗位的对应关系。`runs` 记录步骤所用的团队版本。Host 启动时恢复绑定并注册条件工具，再读取已知会话并重建 `snapshot.teams`。

主管首轮完成后，调度器等待原生成员工作和主管回合收敛。期间的原生回报回合仍属于团队步骤，从最后的主管结论捕获接续。取消团队步骤会同时中断成员。恢复会话时保留交互历史，未完成的团队步骤标为中断。

工作流 JSON 包含引用的编制和角色，导入可复用同 ID 的本地资产，也可生成新的资产 ID 并重映射岗位和节点。Host 校验模型目录，发现不可用的模型会要求选择替代路由。模板引用保留捕获时的版本，本地编制更新后会在列表和预览提示两者的版本。

## 7. 原 OMP 待验证风险（§8）在 DSH 下的消解对照

| 原 OMP 风险编号与问题 | DSH `0.2.2-rc.3` 解决方案与定稿结论 |
| :--- | :--- |
| **1. 跨会话树引用与共享上下文不通** | DSH 同 Host `sessionQuery` 可按精确 `[0..atSeq]` 读取任意会话日志；`mention` 与 `share`（`foldSurface`）在同树与跨树下 100% 统一可用，无需置灰；`fork` 原生支持 `atSeq`；`handoff` 已决定不做 |
| **2. 回合正常结束信号与防重触发** | `requestId → user/message.source.rpcId → agent/inbox/claimed → turn/end (TurnEndReason)` 形成闭环，仅 `completed` 推进；Host 幂等消费事件序号，杜绝全局启动与接续双触发 |
| **3. 调度生命周期与 Plan/审批挂起** | Plan 与工具审批均在原生同一 Open Turn 内挂起（`pendingInteraction`），保留原 `runId` 与范围边界；会话归档灰化保留节点，永久删除会话时清理绑定连接 |
| **4. 草稿指定不了归属且不落盘** | `sessionController.create({ workspaceId })` + `workingDirectory.set(worktreePath)` 原生支持任意归属；草稿持久化在 `storageDomain` 的 `documents` 表 |
| **5. 工作状态恢复边界** | 快照恢复明确将原在途任务标为「已中断」，展示恢复前摘要预览（R10），不伪造进行中的网络流 |
| **6. 自由缩放与活卡片测量** | 采用 `@xyflow/react` 视口变换 + 浮层 Portal 脱离缩放 + 展开卡滚轮事件隔离，已通过真实嵌入式 `conversation.content` 多卡并行与 Playwright 验证 |
| **7. 网页节点原生视图脱离缩放** | 本阶段明确**不做网页节点**，彻底规避 `WebContentsView` 与跨域 `iframe` 复杂度 |
| **8. 超长引用与工作目录可读性** | 超过 64 KiB 自动写入目标会话专属 `ctx.spillStore.saveText`，本地与远程沙箱均具备一致的读取路径 |
| **9. 多卡并行订阅规模** | 精简卡仅消费轻量摘要读模型；仅展开为完整卡或浮窗的节点通过 `SessionProvider` retain 完整会话表面，低缩放自动收纳非活跃未固定卡片 |
| **10. 存储损坏与模板同步丢线** | `storageDomain` 原生提供 Schema 校验与损坏记录备份跳过；模板同步采用稳定 `templateSlotId` 原地更新（R1） |
| **11. 消息线缺乏持久事件源** | DSH `dsh-subagent` / `dsh-agent-team` 已将原生 Agent 间消息持久化写入接收方 `user/message` 事件日志（含 `senderSessionId`、时间戳与正文），直接只读投影即可 |

---

## 8. 分阶段演进状态（已验证交付与后续增强）

对照 [verification.md](verification.md)，设计规范定义的阶段一至阶段三核心能力已全部落地并通过自动化与真机浏览器验证：

- **已完成并验证（v0.2 当前版本）**：
  - **插件宿主与多活会话基线**：DSH `0.2.2-rc.3` 插槽接入、石墨深/浅主题、中英即时切换、减弱动效（`L1`）、多张真实嵌入式 `conversation.content` 并行与原生审批接管；
  - **阶段一（卡片收口与上下文深化）**：活会话单主视图 + 可折叠「接续指令条」（M02）、原生 `conversation.composer.dock` 四态引用胶囊互通与重注（M03）、输入框 `@` 克制补线（M04）、划词引出展示节点、展开卡局部避让（R4）、四栏全局启动清单（R6）、单次运行 `deliverables/presented` 产物收集与「重跑失败节点及下游」（R5）、看板单卡稳定 ID 引用（D50）；
  - **阶段二（四级结构与 Git / Changes / 终端节点）**：基于 `HostGitService` 的 `项目 → 分支 → worktree → Agent → 子 Agent` 四级结构与三级草稿归属判定链（M05/M06）、`workingDirectory.set` 双目录隔离与未检出分支新建 Worktree 引导、OMP Studio 迁移版 **Git 节点**（M08）、对接原生 `dsh-workspace-changes` 的 **Changes 节点**（M07）以及一期 **终端读屏快照节点**（`terminalController.screen()`，M09）；
  - **阶段三（原生消息线、浮窗吸附、模板同步与四表存储）**：只读投影 DSH 原生 `agent-message` / `subagent-settled` 的双股青橙**消息线**（M11）、`Alt` 拎出画布内浮窗与左右分屏吸附（D11/D57）、稳定 `templateSlotId` 模板同步（R1/R9）、带摘要预览的工作状态快照（R10）以及 `storageDomain` 四表隔离持久化（`documents` / `runs` / `templates` / `snapshots`）。
- **后续可选演进项**：
  - **终端节点二期**：在完整终端卡内接入 `terminalController.attach` 双向实时 `xterm` 交互流（M09）；
  - 更大规模节点图（百级卡片）虚拟化与跨平台桌面端专项基准压测。
