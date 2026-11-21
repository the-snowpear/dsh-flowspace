# FlowSpace 画布扩展实施计划（交给 GPT 执行）

## 0. Context
- **为什么做**：画布目前只有 Agent 能执行，连线不能带条件，内置 TDD 闭环模板没有退出条件（`core/scheduler.ts` 的 `emitDownstreamTokens` 对所有出边发令牌，验证员说"通过"也会跑满 `maxRounds`）。2026-11-20 的讨论把扩展方向定为 `docs/canvas-extensions.md` 的 E01–E62。
- **目标**：分 6 个阶段落地。**阶段 1 写到可直接执行的粒度**，阶段 2–6 写纲要、关键挂接点与验收标准；每个阶段开工前，执行者先把该阶段展开成同样粒度的子计划交用户确认。
- **交付位置**：本计划批准后原样复制为 `docs/plan-canvas-extensions.md`（第 7 节提示词引用此路径）。
- **执行者**：GPT。前端审美由第 3 节**强制约束**：只能用第 3 节列出的 token、组件与视觉设计，未覆盖的情况一律照搬最接近的既有组件，不得自创。
- **本计划对设计文档的两处技术调整**（执行时同步更新 `docs/canvas-extensions.md` 的 E58–E60）：
  1. 节点配置用 **zod**（已是直接依赖，`host/storage.ts` 全程使用；zod 4 自带 `z.toJSONSchema()` 可生成表单与工具参数），不用 Schemastery（不是 flowspace 的直接依赖）。
  2. 注册表节点统一为内置类型 **`kind: "flow"` + `flowType: "<命名空间>/<名字>"`**，而不是把 `kind` 开放成任意字符串。原因：`DEFAULT_DIMS`、`COMPACT_SIZE`、`FULL_SIZE`、zod `kind` 枚举等约 70 处按 `kind` 穷举，开放字符串会牵动 106 处分支；`"flow"` 只需各加一项并委托给描述。

## 1. 阶段划分

| 阶段 | 内容 | 对应条目 |
|---|---|---|
| **P1 内核 + 判断** | 注册表、连线规则集中化、多出口 + 跳过令牌、端口类型、Host 执行器分支、条件/代码/AI/人工判断、线上逻辑、TDD 模板退出条件、样式契约测试 | E01–E07、E57–E62 |
| P2 内容流 | `flow_emit`、扇出/合并分拣/泳道、数据变换节点、实时预览、解析节点 | E12–E20、E29–E30、E49–E52 |
| P3 容器与变量 | 引用授权档位、投递、Agent 改动记录、并发、全局变量 | E08–E11、E53–E56 |
| P4 执行节点 | 两种角色、调用协议、参数预取、终端执行、Git 操作、观测线 | E33–E40 |
| P5 人工 / 触发 / 事件 | 表单/打分/审阅、批量视图、触发器、护栏、状态端口、事件线、通知、消息线锚点 | E21–E27、E31–E32、E41–E42 |
| P6 玩法 | 回放、断点、预算、择优/常量/随机、玩法模板、战绩榜、战报卡 | E43–E48 |

## 2. 全局工程约束（每个任务都适用）
1. **读 `AGENTS.md` 并遵守**：目标是已发布的 DSH `0.2.2-rc.3` 包；调度在 Host；渲染不驱动执行；运行态与可编辑文档分离；撤销不重放请求；输入校验只在执行它的 Host 边界做一次。
2. **先备份再编辑**：每个任务开始前，把要改的已有文件复制到 `.backups/<任务名>-<yyyyMMdd-HHmmss>/` 下（保持相对路径）。
3. **工作区是脏的**（大量未提交修改属于其他贡献者）：不得 revert、格式化或重排与任务无关的代码；不改 `lib/` 生成物以外的无关文件；`lib/` 只通过 `pnpm build` 生成。
4. **只开一个 dev server / watcher**：同一检出上两个 watcher 会互相覆盖 `lib/client.js`。
5. **不新增运行时依赖**（zod、React 已有）。唯一已批准的例外：代码节点的 QuickJS 沙箱（`quickjs-emscripten-core` + `@jitl/quickjs-singlefile-cjs-release-sync`，见 T5），安装前仍需把精确版本号报给用户。其他新依赖一律停下询问。
6. Windows 下 shell 用 Git Bash：`D:\Program Files\Git\bin\bash.exe`（经 PowerShell 调用）。
7. 每个任务结束：`pnpm check` 通过；涉及运行时改动再跑 `pnpm test:integration`；前端任务附第 3.10 节自检答案与截图。**不要自行 commit / push**，由用户确认后再提交。
8. 新增文案全部进 `client/i18n.ts` 的 `dict`（`[中文, 英文]`），键名前缀 `flow_`；Host 侧错误信息沿用现有中文直写风格。
## 3. 前端视觉规范（强制）

所有路径相对 `packages/flowspace/src/client/`。本节是**硬性规范**：凡未在此处出现的颜色、尺寸、动效、阴影、图标，一律不得新增。遇到本节没覆盖的情况，**先找最接近的既有组件照搬**，并在 PR 说明中列出，绝不自创样式。

### 3.0 事实基线（先读懂再动手）
- 画布是**自研 DOM/SVG**，不是 xyflow（`@xyflow/react` 虽在依赖里但未被使用，禁止引入）。层级：`.fs-viewport > .fs-camera > .fs-world`，卡片是绝对定位的 `<section class="node node-{kind}">`（`CanvasApp.tsx` 约 7032 行）。
- 样式级联顺序见 `style.css`：tokens → shell → nodes → board → wires → surfaces → extensions → **polish（真正生效的颜色/圆角值）** → teams → team-room → team-canvas → compact。
- **实际强调色是 `--accent`（暗 `#7a90ff` / 亮 `#4361ee`，蓝紫）**，不是文档里说的紫色。紫色 `--violet` 专用于引用线与"待发"胶囊语义。照代码执行，不要"修正"成紫色。
- 主题：`.fs-root[data-theme="light"]` 为亮色，默认暗色；减弱动效：`.fs-root[data-perf-tier="L1"]`。
- 现有的 `--card-bg` 渐变、头像渐变、`.button-primary` 渐变、环境光 `--amb-*`、`.fx-halo` 属于历史遗留，**不得作为新增渐变的先例**。

### 3.1 允许使用的 token（只用这些）
- 表面：`--bg --canvas --surface --surface-2 --surface-3 --hover --active`
- 边框：`--border --border-strong --border-float --card-border`
- 文字：`--text --text-2 --text-3 --text-faint --glyph`
- 强调：`--accent --accent-hover --accent-soft --accent-softer --accent-border`
- 状态（**只表达运行状态，禁止挪作节点类别色**）：`--running`(运行) `--amber`(等待/待你处理) `--green`(完成) `--red`(出错)，以及各自 `-soft`
- 引用四态：`--cap-pending --cap-sent --cap-updated --cap-always`（及 `-bg/-border`）
- 节点类别色：现有 `--k-*`，加上 3.2 新增的 3 个
- 线：`--wire-flow --wire-w(1.6) --wire-ref-w(1.3) --m-f --m-b --violet --teal`
- 圆角：`--r-4(7) --r-6(10) --r-8(14) --r-card(18) --r-group(26) --r-full`
- 动效：`--dur-tactile(80) --dur-fast(120) --dur(180) --dur-slow(250) --dur-slower(320)`，循环 `--loop-pulse(1400) --loop-drift(2400)`，缓动 `--ease --ease-out --ease-emphasis`
- 间距：只用 `--shift-xs/sm/md/lg`（4/8/12/16）或这四个数值
- 字体：`--font-ui`（正文）、`--font-display`（卡片标题）、`--font-mono`（代码、命令、变量值、JSON）

### 3.2 新增 token（只允许新增这些，值必须一字不差）
写在新文件 `styles/flow-ext.css` 顶部的 `.fs-root{}` 与 `.fs-root[data-theme="light"]{}` 中：

| token | 暗 | 亮 | 用途 |
|---|---|---|---|
| `--k-logic` | `#e879f9` | `#a21caf` | 逻辑族：判断（含人工判断）、扇出、合并分拣、随机、择优 |
| `--k-data` | `#a3e635` | `#4d7c0f` | 数据族：拆分、合并、提取、模板、映射、过滤、排序、去重、常量、累积、变量、解析 |
| `--k-trigger` | `#fb7185` | `#be123c` | 触发族：触发器、通知 |
| `--k-human` | 复用 `var(--k-note)` | 同左 | 人工族：表单、打分、审阅编辑（"暖色 = 人写的内容"） |
| `--evt-error/-wait/-done` | 分别 `var(--red)/var(--amber)/var(--green)` | 同左 | 事件线着色 |

终端执行节点沿用 `--k-terminal`，Git 操作节点沿用 `--k-git`。**禁止再增加任何类别色。**

### 3.3 排版
- 字号只允许：11（eyebrow/元信息/端口标签）、12（次要文字、行内说明）、12.5（列表行标签）、13（正文，默认）、13.5（卡片标题，沿用 `--font-display` 600）。
- 字重只允许 400 / 500 / 600；600 只用于卡片标题与对话框标题。
- 数值、命令、变量名、JSON 一律 `--font-mono` 12px。
- 中文不加字距；英文 eyebrow 允许 `text-transform: uppercase; letter-spacing: .04em`（沿用 `.fs-git-section-head`）。

### 3.4 布局与尺寸
- 卡片外壳、头部、端口、精简摘要**全部沿用现有渲染路径**（`CanvasApp.tsx` 的卡片渲染 + `renderCompactBody` / `renderFullBody`），新节点只提供 body 内容，不得自建卡片外壳。
- 卡片内边距 12px；行高：紧凑行 28px、列表行 32px；行间距 4px；分组之间 12px。
- 新节点默认尺寸（加入 `geometry.ts` 尺寸表）：精简 256×96；完整 312×（内容自适应，最小 200，最大 480，超出内部滚动用 `.node-scroll`）。判断类完整卡 312 宽，高度 = 头部 48 + 说明区 + 分支行数 × 32 + 12。
- 端口纵坐标必须由 `geometry.ts` 的 `portY()` 体系计算，新增多出口时扩展该函数，**禁止在 CSS 里写死 top**。

### 3.5 组件复用清单（必须优先使用）
按钮 `.icon-button` `.button` `.button-quiet` `.text-button(.danger)`；开关 `.switch`；单选组 `.choice-buttons`；输入 `.text-field` `.select-field` `.field-label`；状态 `.status.status-*` `.status-dot`；空态 `.node-empty.fs-tool-empty-cta`；工具区 `.fs-tool-body` `.fs-git-bar` `.node-tabs` `.node-scroll` `.fs-git-section-head`；预览 `pre.file-preview` `.fs-terminal-pre` `DiffHunks`；待办/审批 `.approval-box` `.button-row`；对话框 `CanvasDialog`（variant `wide` 用于大表格）；菜单 `.fs-menu`；载荷预览 `PayloadPeekCard`；看板原语 `BoardControls.tsx`；头像 `TeamAvatar` `AvatarStack` `ModelChip`；检查器 `InspectorPanel`；运行总览 `RunOverviewDock`。

### 3.6 各新元素的视觉设计（照此实现）

**A. 多出口（判断类节点）**
- 完整卡 body 顶部一行说明（12px `--text-3`，最多 2 行），下面是**分支行列表**：每行 32px，左侧分支名（12.5px `--text-2`），右侧本次运行命中次数（11px mono `--text-faint`），行的垂直中心 = 对应出口端口的 `--port-y`。
- 出口端口沿用现有接续出口形状（胶囊），出口顺序与行顺序一致；"出错"出口固定在最后一行，行名前加 `--red` 6px 圆点。
- 本次命中的分支行：背景 `color-mix(in oklab, var(--kc) 12%, transparent)`，分支名 `--text`；未命中行不变。
- 精简卡：`.compact-overview-detail` 显示"上次：<分支名>"。

**B. 跳过令牌**
- 被跳过的连线：`opacity:.35`，描边 `--wire-flow`，`stroke-dasharray: 3 5`，线标签显示 `.edge-tag` 文本"已跳过"（`--text-faint`）。
- 被跳过的下游节点：加类 `.status-skipped`，卡片 `opacity:.62`（与现有 muted 一致），状态胶囊用中性色 `--text-faint`，文字"已跳过"。不加任何动画。

**C. 端口数据类型**
- 端口形状仍只由角色决定（引用 = 圆点，接续 = 胶囊，状态 = 菱形，见 E）。**数据类型不改变端口外观**，只在 hover 提示与线标签中体现：线标签前缀 11px mono 小字 `文本 / 列表·12 / 记录 / 信号 / 文件`。
- 宽松连线发生自动转换时，线标签追加 `→ 文本`（`--text-faint`）。
- 接续线类型不符：沿用现有"不兼容目标"表现（目标节点 opacity .36），并在拖线提示中写明原因。

**D. 线上简单逻辑**（取反 / 第 N 轮起 / 最多 N 次 / 延迟）
- 在现有 `.edge-tag` 胶囊内追加一个 11px 文本片段，如 `非`、`≥第2轮`、`≤3次`、`延迟 5s`，用 `·` 分隔。不新增图形。

**E. 顶部状态端口与事件线**
- 状态端口：顶部居中，10×10 菱形（正方形旋转 45°，`border-radius:2px`），描边 1.3px `--text-3`，填充 `--surface`，hover/连线时描边变 `--accent`。显隐规则与现有端口 R8 一致（未连线 opacity .4，hover/选中显示）。与底部子代理端口 `.fs-staff-port` 上下对称。
- 事件线：宽 1.2px，`stroke-dasharray: 2 4`，颜色按过滤的事件类型 `--evt-error/-wait/-done`，混合类型用 `--text-3`。
- 事件触发时：一次性脉冲——沿线播放一段 `stroke-dashoffset` 动画 `--dur-slower`，只播一次，不循环。L1 下改为线条颜色瞬间加深 `--dur-fast` 后恢复。
- 事件线标签：`.edge-tag` 显示发送方式 `结束 / 变化 / 连续` 与勾选的事件数。

**F. 原生消息线锚点（E32）**
- 改为两卡片几何中心连线，线层仍在卡片之下，卡片内部被遮挡；颜色、双股、动效全部不变。

**G. 扇出组与泳道**
- 扇出组沿用分组框（`--r-group`，现有分组样式），组头显示：`扇出` 标签 + `×12` + 进度 `7/12`（mono 11px）+ 并发上限 `并发 4`。
- 折叠态（>10 条或手动折叠）：组合节点卡片后面叠两层"影子卡"：用 `::before/::after` 各偏移 `4px/8px`，边框 `--border`，背景 `--surface-2`，**不加阴影**。
- 泳道标记：母版泳道首节点头部加 11px 胶囊"母版"（`--accent-soft` 背景，`--accent` 文字）；复制泳道已覆盖加"已覆盖"（`--cap-updated`）；已移出的泳道整组 `opacity:.4` + 胶囊"已移出"。
- 运行前动态来源的占位：组头 `×?`，泳道区显示虚线框（`1px dashed var(--border-strong)`，`--r-8`）与文字"运行时生成"。

**H. 数据变换的实时预览**
- 节点 body 底部预览区：`pre.file-preview` 样式，mono 12px，最多 6 行，超出显示"还有 N 项"（`--text-faint`）。
- 连线标签显示条目数（见 C）。AI 模式预览区显示 `.button-quiet`"试运行"，不自动执行。

**I. 授权引用线与改动回流**
- 带写权限的引用线：标签追加笔形图标（13px）+ 权限文字 `可推进 / 可编辑`；"每次询问"再加 `?`。
- Agent 写入时：沿该线**反方向**播放一次现有 `fs-wire-travel` 光段（`animation-direction: reverse`，颜色 `--cap-updated`，只播一次）；被改的条目上显示 16px 作者头像（复用 `TeamAvatar` 小尺寸）。

**J. 观测线（E40）**
- 只读、系统绘制：宽 1px，`stroke-dasharray: 0.01 4`（点线，圆头），颜色 `--text-3`，opacity .5，无流动动画，无端口，可悬停显示最近一条命令。

**K. 人工节点**
- 待处理时卡片使用现有等待态（`--amber` 边框 + 呼吸环），body 顶部放 `.approval-box`：说明文字 → 上游内容预览（`PayloadPeekCard` 折叠态）→ 操作区。
- 人工选择：操作区为 `.choice-buttons`，每个选项一个按钮；表单：`.field-label + .text-field` 纵向排列，底部 `.button-row`（主按钮 `.button`，次按钮 `.button-quiet`）；打分：5 个 16px 星形图标按钮 + 评语 `.text-field`；审阅编辑：编辑区沿用 `.note-editor` 样式。
- 超时倒计时：头部 `small` 副标题显示 `剩 4:59`（mono）。
- 批量处理视图：`CanvasDialog variant="wide"`，表格行 32px，列：泳道 / 问题摘要 / 回答控件 / 状态；表头 11px eyebrow；底部"整列套用"`.text-button`。

**L. 触发器节点**
- 头部右侧放 `.switch`（启用）；body 一行元信息 12px `--text-3`：`下次 09:00 · 上次 昨天 18:02 · 错过 2 次`；"错过"非零时用 `--amber`。
- 画布顶栏总闸：沿用顶栏 `.icon-button` + `.switch` 组合，关闭时图标旁显示 `--amber` 小点。

**M. 执行节点（终端 / Git 操作）**
- 沿用 `.fs-tool-body` 体系：顶部 `.fs-git-bar` 显示模式/操作名 chip；命令/参数区 mono 12px，只读时用 `pre.file-preview`，可编辑时 `.text-field` mono。
- 等待确认时用 `.approval-box` 展示**完整命令/操作与参数**，按钮"执行""跳过"。
- 结果区 `.fs-terminal-pre`，退出码 chip：0 用 `--green`、非 0 用 `--red`。

**N. 变量节点与变量面板**
- 卡片 body：变量名 mono 13px + 作用域 chip（运行级/画布级/泳道级）+ 当前值（mono 12px，超长截断）+ 版本 chip `v7`（11px mono `--text-faint`）。
- 最近变化轨迹：最多 5 行列表（时间 · 写入者 · 旧→新），**不画折线图**。
- 变量面板：复用 `InspectorPanel` 结构，列表行 32px，行尾"重置"`.text-button`。

**O. 回放**
- 复用 `RunOverviewDock` 位置做底部回放条：播放/暂停 `.icon-button`、4px 高进度轨道（轨道 `--surface-3`，已播放 `--accent`，拖柄 12px 圆 `--surface` + `--accent` 描边）、速度 `.choice-buttons`（1× 4× 16×）、时间 mono 11px。
- 回放中画布顶部显示 `--accent-soft` 横条"回放中 · 只读"，所有编辑入口禁用。

**P. 断点**
- 断点标记：头像左上角 7px `--red` 实心圆，外加 2px `--ko` 镂空环（参考现有 pinned 点的做法，位置对称）。
- 命中断点暂停：卡片用等待态（`--amber`），`.approval-box` 内显示组装输入（复用 `PayloadPeekCard` 展开态）+ 按钮"继续""单步""跳过"+"编辑本次输入"`.text-button`。

**Q. 预算表**
- 顶栏 chip：图标 + mono 11px `12.4k / 50k` + 40×3px 进度条（`--surface-3` 底，`--text-3` 填充；≥80% `--amber`；≥100% `--red`）。

**R. 擂台战绩榜 / 战报卡**
- 战绩榜：设置/面板中的表格，行 32px，列：模型（`ModelChip`）/ 胜 / 负 / 胜率（mono）；无奖杯插画。
- 战报卡：`CanvasDialog`，顶部 4 个指标块（`--surface-2` 背景，`--r-8`，标签 11px `--text-3`，数值 mono 16px `--text`），下面是产出物列表。导出图片 = 该对话框内容区截图，不另做海报设计。

### 3.7 图标
- 只通过 `icons.tsx` 的 `ICONS` 增加：16×16 网格，仅描边（`.ic` 统一 stroke 1.45），不得填充、不得引入图标库。先检查已有图标能否复用。
- 新增图标（路径直接使用）：
  - `logic-branch`: `M3 8h4 M7 8l3-3.5h3 M7 8l3 3.5h3`
  - `fanout`: `M2.5 8h3 M5.5 8 13 3.5 M5.5 8H13 M5.5 8 13 12.5`
  - `merge-in`: `M3 3.5l7.5 4.5 M3 8h7.5 M3 12.5 10.5 8 M10.5 8h3`
  - `filter`: `M2.5 3.5h11l-4.2 5v4l-2.6 1.2v-5.2z`
  - `sort`: `M5 3v10 M2.8 10.8 5 13l2.2-2.2 M11 13V3 M8.8 5.2 11 3l2.2 2.2`
  - `split`: `M8 2.5v4 M8 6.5 4 10v3.5 M8 6.5l4 3.5v3.5`
  - `braces`（记录/变量）: `M5.5 3.5c-1.8 0-2 1.2-2 2.3v.9c0 .8-.5 1.3-1.2 1.3.7 0 1.2.5 1.2 1.3v.9c0 1.1.2 2.3 2 2.3 M10.5 3.5c1.8 0 2 1.2 2 2.3v.9c0 .8.5 1.3 1.2 1.3-.7 0-1.2.5-1.2 1.3v.9c0 1.1-.2 2.3-2 2.3`
  - `bolt`（触发）: `M9 2 3.5 9h4L7 14l5.5-7h-4z`
  - `clock`: `M8 2.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11 M8 5v3.2l2.2 1.4`
  - `bell`: `M4 11V7.5a4 4 0 0 1 8 0V11l1 1.5H3z M6.5 14h3`
  - `person`（人工）: `M8 2.5a2 2 0 1 1 0 4a2 2 0 1 1 0-4 M3.5 13.5c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4`
  - `star`: `M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z`
  - `dice`: `M3.5 3.5h9v9h-9z M6 6h.01 M10 10h.01 M8 8h.01`
  - `trophy`: `M5 2.5h6v3a3 3 0 0 1-6 0z M5 3.5H3v1a2 2 0 0 0 2 2 M11 3.5h2v1a2 2 0 0 1-2 2 M8 8.5v3 M5.5 13.5h5`
  - `replay`: `M3 8a5 5 0 1 0 1.5-3.6 M3 2.5v2.5h2.5 M7 6l3 2-3 2z`
  - `gauge`（预算）: `M2.5 11a5.5 5.5 0 0 1 11 0 M8 11l2.5-3.5`
- 在 `kindIconName` 中为每个新节点类型映射图标。

### 3.8 动效与性能（硬规则）
- 时长只用 `--dur-*` / `--loop-*`，**CSS 中禁止出现裸 `ms` 数值**（token 定义处除外）。
- 循环动画只能动 `opacity` / `transform` / `stroke-dashoffset`；新动画的 keyframes 一律以 `fsx-` 开头。
- 所有带动画的元素加类 `.fsx-motion`；`flow-ext.css` 末尾必须有：`.fs-root[data-perf-tier="L1"] .fsx-motion, .fs-root[data-perf-tier="L1"] .fsx-motion::before, .fs-root[data-perf-tier="L1"] .fsx-motion::after { animation: none !important; transition: none !important; }` 以及同样内容的 `@media (prefers-reduced-motion: reduce)` 块。L1 下保留全部颜色与数字信息。
- 画布世界内（`.fs-world` 下）禁止：`filter`、`backdrop-filter`、`:has()`、指针驱动的 CSS 变量、`box-shadow` 动画。
- 禁止新增渐变、插画、emoji、装饰性背景。阴影只能用现有 `--card-shadow*` / `--float-shadow`。
- 流动动画只在"真正激活"时出现（design.md:11）；静态状态一律静止。

### 3.9 样式落点与命名
- 新增样式**只写在** `styles/flow-ext.css`，在 `style.css` 末尾（`compact` 之后）`@import`。不得修改 `polish.css` / `tokens.css` 的既有规则；确需调整既有元素时，在 `flow-ext.css` 中以更具体的选择器覆盖，并注明原因。
- 类名前缀：`fs-branch-*`（多出口）、`fs-lane-*`（扇出）、`fs-evt-*`（事件）、`fs-var-*`（变量）、`fs-human-*`、`fs-trig-*`、`fs-exec-*`、`fs-replay-*`、`fs-bp-*`（断点）、`fs-budget-*`。
- 组件内禁止 inline style 写颜色/尺寸（`--port-y` 这类几何变量除外）。

### 3.10 视觉自检（每个前端任务完成时必须逐条回答）
1. 是否只用了 3.1/3.2 的 token？`flow-ext.css` 里有没有裸 hex/rgb、裸 `ms`？
2. 是否复用了 3.5 的组件，而不是新建外壳、按钮、输入框？
3. 暗色、亮色、L1 三种模式下截图是否都正常（Playwright 截图附在说明里）？
4. 缩放到 0.4（低于 `LOD_ZOOM` 0.5）时，新节点精简卡是否可读、端口是否按 R8 隐藏？
5. 有没有新增渐变、阴影、插画、emoji、图标库？
6. 状态色是否只用于运行状态，类别色是否只用于节点类别？
## 4. 阶段 1 详细任务

路径相对 `packages/flowspace/src/`。任务按顺序执行，每个任务独立通过 `pnpm check`。

### T1 数据模型扩展（`types.ts`、`host/storage.ts`、`core/document.ts`）
- `NodeKind` 增加 `"flow"`。`FlowNode` 增加：`flowType?: string`（形如 `flowspace/condition`）、`config?: Record<string, unknown>`、`configVersion?: number`。
- `FlowEdge` 增加：`sourcePort?: string`（缺省 = 该节点默认出口 `"out"`）、`targetPort?: string`（缺省 `"in"`）、`logic?: { negate?: boolean; fromRound?: number; maxTimes?: number; delayMs?: number }`。
- `FlowToken` 增加：`skip?: true`、`createdAt: number`、`readyAt?: number`、`consumedAt?: number`（时间戳顺带为 P6 回放准备）。
- `RunStep` 增加：`route?: string`（执行器选中的出口 id）、`verdict?: { branch: string; reason?: string; confidence?: number }`、`human?: { question: string; options: string[]; deadline?: number; timeoutAction?: "wait" | "skip" | "default" | "timeout-port"; defaultOption?: string }`；`StepState` 增加 `"skipped"` 与 `"awaiting"`。
- zod（`host/storage.ts` 的 `node` / `edge` schema）同步：`kind` 枚举加 `"flow"`；`flowType` 用 `z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)`；`config` 用 `z.record(z.string(), z.unknown())`；`logic` 各字段为非负整数。
- `DEFAULT_DIMS`、`newNode` 标题表、`geometry.ts` 的 `COMPACT_SIZE` / `FULL_SIZE` 为 `"flow"` 各加一项，实际尺寸委托给描述（T2 的 `sizeOf()`）。
- `newFlowNode(flowType, x, y, locale)`：放在 `core/document.ts`，用描述的 `defaultConfig` 与标题键初始化。

### T2 节点注册表（新目录 `core/nodes/`，前后端共用的纯数据）
- `core/nodes/types.ts`：
  ```ts
  export type PortRole = "continuation" | "reference" | "event";
  export type DataType = "text" | "list" | "record" | "signal" | "file";
  export interface PortSpec { id: string; role: PortRole; direction: "in" | "out"; dataType: DataType; labelKey?: string; label?: string; fixed?: "error" }
  export interface NodeDescriptor<C = Record<string, unknown>> {
    flowType: string; version: number; family: "logic" | "data" | "trigger" | "human" | "exec" | "container";
    icon: string; titleKey: string; descKey: string;
    configSchema: z.ZodType<C>; defaultConfig: C; migrate?(old: unknown, fromVersion: number): C;
    ports(config: C): PortSpec[];
    size: { compact: [number, number]; full: [number, number] };
    capabilities: { callsModel?: boolean; runsCode?: boolean; sideEffects?: boolean; needsHuman?: boolean };
    quickCreate: { canvas: boolean; afterContinuationOut?: boolean; afterReferenceOut?: boolean };
    experimental: true;
  }
  ```
- `core/nodes/registry.ts`：`registerDescriptor(d): () => void`、`descriptorOf(flowType)`、`listDescriptors()`、`portsOf(node)`（未知 `flowType` 返回空数组）、`sizeOf(node, compact)`。重复注册同名 `flowType` 抛错。
- 把 `core/nodes/**` 加入 `tsconfig.client.json` 的 include。
- Host 侧扩展点（实验性）：`FlowspaceService` 上新增 `registerNodeKind(descriptor, executor): () => void`，用 `ctx.effect` 管理注销；**本阶段只给内置节点用**，不写对外文档。

### T3 连线规则集中化（新文件 `core/connect.ts`）
- 实现 `canConnect({ source, sourcePort, target, targetPort, kind }): { ok: true } | { ok: false; reason: string }`，规则：
  - 现有规则原样保留（目标为 Agent 时；角色节点只能走编制线；fork 规则；看板 `sourceItemKey` 规则）。
  - 新增：flow 节点按 `portsOf()` 判断端口是否存在、方向与角色是否匹配；**接续线严格要求 `dataType` 相同或目标为 `text`**；引用线宽松（类型不同允许，并返回 `convert: "text"` 提示）。
  - 接续线源可以是 Agent 或带接续出口的 flow 节点；目标可以是 Agent 或带接续入口的 flow 节点。
- 替换所有分散的判断，改为调用 `canConnect`：`CanvasApp.tsx` 的 `connectNodes`（约 2185 行）、`resolveSnapTarget`（约 4163 行）、`startInputEdgeDrag`（约 4540 行）、`handleQuickCreateSelect` 的 link（约 3277 行）、模板连入（约 3227 行）；Host 的 `checkDocument`（`host/storage.ts` 约 398 行）也改为调用它。`checkDocument` 额外用描述的 `configSchema.safeParse` 校验 flow 节点配置；**未知 `flowType` 不报错，原样保留**（E60 占位）。
- 先写 `test/connect.test.ts`，把现有规则写成用例矩阵，再做替换，确保行为不变。

### T4 调度器：Host 执行器、多出口与跳过令牌（`core/scheduler.ts`）
- `RuntimeAdapter` 增加可选 `execute?(node: FlowNode, step: RunStep, signal: AbortSignal): Promise<ExecResult>`，其中 `ExecResult = { route: string; output: string; source: ContextSnapshot; verdict?: RunStep["verdict"]; telemetry?: StepTelemetry } | { awaiting: NonNullable<RunStep["human"]> }`。
- `isExecutable(node)` = Agent，或 flow 节点且描述存在。`core/graph.ts` 的 `graphOrder`（约 117 行只取 Agent）改为取所有 `isExecutable` 节点，使经过判断节点的回环也被识别为 SCC 并受 `maxRounds` 约束。`launchPlan` 的起点池保持只有 Agent。
- `enqueue`：对 flow 节点**不调用** `ensure/send`，改为调用 `runtime.execute`；返回 `awaiting` 时步骤置为 `"awaiting"` 并保存 `human`；否则在同一事务中调用一个新的私有方法 `finishExecStep(run, step, result)`（复用 `finishStep` 的收尾逻辑，但不需要 `sessionId`，跳过 `isPlanModeActive`）。执行器抛错 → `route = "error"`（固定"出错"出口），`step.error` 记录信息。
- `emitDownstreamTokens`（约 494 行的出边循环）：对每条出边计算 `fires = (edge.sourcePort ?? "out") === step.route`（Agent 节点的 route 恒为 `"out"`），再套用 `edge.logic`：`negate` 取反；`fromRound` 要求 `step.iteration >= fromRound`；`maxTimes` 统计本次运行中该边已发出的非跳过令牌数；不满足的一律视为不发。**不发的边推入跳过令牌** `{ skip: true, ready: true, source: <空文本快照> }`；`delayMs` 让令牌 `ready: false` 并记录 `readyAt`，由 Host 定时器到点置为 ready 后调用 `advance`（`recover` 时补偿已过期的定时）。
- `forwardThroughBypass`：跳过令牌同样透传。
- `advance`：
  - 用 `while (progressed)` 循环包住主体，直到一轮没有任何变化，保证跳过能沿链传播。
  - 某节点选出的令牌**全部是跳过**：标记为已消费，记录一个 `state: "skipped"` 的步骤，并对它的所有出边推入跳过令牌。
  - **例外（循环正常退出）**：跳过令牌落在**反馈边**上（同一 SCC 且 `rank(source) >= rank(target)`）时，只消费、不建步骤、不再传播。
  - 混合时：丢弃跳过令牌，只用真实令牌调用 `enqueue`。
- `settle`：已消费的跳过令牌与未消费的跳过令牌都不计入"接续无法汇合"错误；存在 `"awaiting"` 步骤时运行状态为 `waiting`。
- 新增 Host RPC `answerHuman({ runId, stepId, option })`（`src/index.ts`，`@Remote`，包在 `scheduler.transact` 里）：校验步骤为 `awaiting`、选项合法，然后以 `route = <选项对应出口>` 调用 `finishExecStep`。人工超时：Host 按 `deadline` 设定时器，到点按 `timeoutAction` 处理；`recover` 时重新挂定时器，`"wait"` 永不超时。`client/bridge.ts` 的 `CanvasBridge` / `FlowClient` 增加对应方法，改完跑 `pnpm build` 重新生成 typert。

### T5 四个判断节点（描述放 `core/nodes/judge/*.ts`，执行器放 `host/nodes/judge/*.ts`，视图放 `client/nodes/judge/*.tsx`）
共同点：一个接续入口（`text`），出口 = 各分支 + "否则"（条件、代码）+ 固定"出错"；执行器把触发它的输入快照**原样转发**到选中的出口（多个输入时用 `runtime.contextText` 合并成一个 `kind: "text"` 快照），并在 `step.output` 写判断结果摘要。

| flowType | 配置（zod） | 执行器要点 |
|---|---|---|
| `flowspace/condition` | `branches: { id, label, match: "all" \| "any", rules: { field: "text" \| "json", path?: string, op: "contains" \| "not-contains" \| "regex" \| "equals" \| "empty" \| "gt" \| "lt", value?: string }[] }[]` | 按顺序取第一个命中的分支，否则走 `else`。正则用 `new RegExp(value, "u")`，非法正则在配置校验阶段就报错。 |
| `flowspace/code` | `source: string`（形如 `(input) => "pass"`），`timeoutMs: 100–5000`（默认 1000），`branches: { id, label }[]` | **用 QuickJS（WebAssembly）运行，不用 `node:vm`**（Node 官方说明 `node:vm` 不是安全沙箱）。依赖：`quickjs-emscripten-core` + 单文件变体 `@jitl/quickjs-singlefile-cjs-release-sync`（wasm 内嵌在 JS 中，避免打包时找不到 `.wasm`），锁定精确版本，安装前把版本号报给用户确认。执行方式：放在 `node:worker_threads` 的 worker 里，每次执行新建一个 QuickJS runtime/context，用完即销毁；`setMemoryLimit`（默认 32 MB）、`setMaxStackSize`、`setInterruptHandler`（超过 `timeoutMs` 即中断）；worker 层再设一个硬超时，超时直接 `terminate()`。**不向脚本暴露任何宿主函数**（无文件、网络、进程、计时器、`require`），只注入 `input`（输入快照的 JSON 深拷贝），返回值经 JSON 序列化取回。返回值为分支 id 或布尔值（`true` → 第一个分支，`false` → `else`）；超时、内存超限、异常或返回值非法一律走"出错"。导入的工作流含此节点时，`WorkflowImportDialog` 仍显示提示（E02），说明脚本在沙箱中运行、无法访问文件和网络。P2 数据变换节点的"代码"模式复用同一个执行器。 |
| `flowspace/ai-judge` | `provider`、`model`（来自 `ctx.llm.listProviders()`），`instruction`，`branches: { id, label, description }[]`，`lowConfidence?: { threshold: number; branch: string }` | 用 `ctx.llm.stream`（`FlowspaceService` 的 `inject` 已含 `llm`），通过 `LlmRequestPurposeMap` 声明 `purpose: "flowspace-judge"`；提示词要求只输出 `{"branch":"<id>","reason":"…","confidence":0-1}`；解析失败重试一次，仍失败走"出错"；判断记录（模型、输入摘要、原始输出、token）写入 `step.verdict` 与 `step.telemetry`。 |
| `flowspace/human-choice` | `question`，`options: { id, label }[]`，`timeoutSec?: number`，`timeoutAction: "wait" \| "skip" \| "default" \| "timeout-port"`（默认 `"wait"`），`defaultOption?` | 返回 `{ awaiting }`；`timeout-port` 时多一个"超时"出口。 |

- 视图按第 3.6 节 A（分支行）与 K（人工待处理）实现；配置表单用 T6 的通用表单。
- QuickCreate（`QuickCreateMenu.tsx` 约 104–501 行）：在画布搜索模式与"接续出口拖到空白处"模式中，从 `listDescriptors()` 生成条目（按 `quickCreate` 字段），分组标题"逻辑"。

### T6 客户端渲染（`client/CanvasApp.tsx`、`client/geometry.ts`、新目录 `client/nodes/`）
- `geometry.ts`：`portY(node, kind, compact)` 扩展为 `portY(node, role, compact, portId?)`：flow 节点的多出口按 3.4 / 3.6-A 的行位置计算（头部 48 + 说明区 + 序号 × 32 + 16）；`endpoint()` 根据 `edge.sourcePort` 取对应出口。
- `CanvasApp.tsx` 约 7254 行的端口渲染：flow 节点改为遍历 `portsOf(node)` 渲染；端口 `<button>` 增加 `data-port-id`；`resolveSnapTarget` / 拖线命中读取 `data-port-id`，`newEdge` 写入 `sourcePort` / `targetPort`。
- `renderCompactBody` / `renderFullBody`：`kind === "flow"` 时交给 `client/nodes/index.ts` 的 `viewOf(flowType)`，接口为 `{ Compact: FC<NodeViewProps>; Full: FC<NodeViewProps> }`；未知 `flowType` 显示"缺少插件"占位（复用 `.node-empty`）。
- 通用配置表单 `client/nodes/ConfigForm.tsx`：用 `z.toJSONSchema(descriptor.configSchema)` 渲染 string / number / boolean / enum / 对象数组（分支列表，可增删、可上下移动），控件只用第 3.5 节组件。正则、代码字段用 mono 的 `.text-field`。
- 线：被跳过的线、线上逻辑标签、类型前缀按第 3.6 节 B / C / D 实现（`edge-state-skipped` 状态加入现有状态推导，约在 `CanvasApp.tsx` 5228 行）。
- `icons.tsx`：加入第 3.7 节图标，并在 `kindIconName` 中让 `"flow"` 返回 `descriptorOf(flowType).icon`。

### T7 TDD 模板退出条件（`client/templates.ts` 约 322–419 行）
- 验证员任务末尾要求输出一行 `结论：通过` 或 `结论：未通过`。
- 在验证员与作者之间插入 `flowspace/condition`：分支"通过"规则 `regex ^结论：通过`，其余走"否则"。
- 连线：验证员 → 判断（接续，auto）；判断"否则" → 作者（原 `etdd-loopback` 改为从判断的 `else` 出口出发，`maxRounds: 3`）；判断"通过" → 签收摘要（原 `etdd-exit`，保持 `confirm`）。
- 保持 `templateSlotId` 稳定，新增判断节点用新的 slot id `slot-tdd-gate`，确保 R1 同步不破坏已有实例。

### T8 样式与契约测试
- 新建 `client/styles/flow-ext.css` 并在 `client/style.css` 末尾 `@import`；内容严格按第 3 节。
- 新建 `test/style-contract.test.ts`，读取 `flow-ext.css` 并断言：
  1. 除顶部 token 块外，没有 `#[0-9a-f]{3,8}`、`rgb(`、`hsl(` 字面量；
  2. 除 token 块外，没有裸 `\d+ms` / `\d+s` 时长；
  3. 没有 `filter:`、`backdrop-filter`、`:has(`；
  4. 所有 `@keyframes` 名称以 `fsx-` 开头；
  5. 文件中同时存在 `[data-perf-tier="L1"] .fsx-motion` 与 `prefers-reduced-motion` 块；
  6. 新增 token 名称只出现第 3.2 节列出的那几个。

### T9 阶段 1 测试
- `test/scheduler.test.ts` 新增：判断选路、菱形汇合（一支跳过、一支真实）、TDD 回环在"通过"时正常退出且签收节点只运行一次、跳过令牌经过旁路节点、`logic` 的 `negate` / `fromRound` / `maxTimes` / `delayMs`、执行器抛错走"出错"出口、人工 `awaiting` → `answerHuman`、人工超时的 4 种动作、Host 重启后 `awaiting` 与延迟令牌恢复。fixture 沿用现有 `fixture()` 写法，给 `RuntimeAdapter` 加一个假的 `execute`。
- `test/connect.test.ts`：规则矩阵（T3）。
- `test/flow-nodes.test.ts`：各判断描述的 zod 校验、`migrate`、`portsOf`、未知 `flowType` 保留、条件规则求值、代码节点（QuickJS）的超时中断、内存超限、读不到 `require` / `process` / `fetch` / 文件、返回非法值走"出错"、worker 硬超时 `terminate()`、AI 判断 JSON 解析与重试（用假的 `llm.stream`）。
- `scripts/integration.ts`：加一条端到端流程：Agent → 条件判断 → 两个下游，用 mock 模型（`scripts/mock-model.mjs`），断言只有命中分支的下游被执行、另一支为 `skipped`；再加人工选择 + `answerHuman`。

## 5. 阶段 2–6 纲要（开工前各自展开子计划）

**P2 内容流**
- `flow_emit`：照 `host/teamDelegate.ts` 的 `ctx.tools.register(def, { when })` 注册，`when` = 该 Agent 有正在运行的步骤，且其节点出口连向需要列表 / 记录输入的节点；输出线配置 `emitMode: "stream" | "end"`；结束兜底解析 Markdown 列表 / JSON 代码块（E29）。验证方式照 `scripts/team-spike.mjs`。
- 扇出节点 + 合并分拣节点（逻辑族）、扇出组（复用分组，`generatedBy` 标记）、泳道复制 / 同步 / 已覆盖 / 已移出、条目 key、并发上限、侧栏行插槽 `sidebar.session.row.trailing` / `.hover` 显示组标记（E12–E20）。
- 数据变换节点 10 种（数据族），规则类在 Host 内即时执行；静态输入实时预览走客户端纯函数（与 Host 执行器共用 `core/nodes/data/*.ts` 的同一实现），AI 模式只提供"试运行"（E49–E52）。
- 验收：扇出 10 项实时增删；>10 折叠；并发上限生效；TDD 之外再给一个"拆分 → 扇出 → 合并"的内置模板。

**P3 容器与变量**
- 引用线增加 `permission: "read" | "advance" | "edit"` 与 `ask: boolean`；按授权注册 `board_*` / `var_*` 条件工具；写入以条目为单位并带版本号，用户编辑优先；"Agent 改动记录"单独存一张表（不进撤销栈）；改动回流视觉见 3.6-I（E08–E11）。
- 变量：定义存文档，当前值存新表 `variables`（运行级 / 画布级 / 泳道级）；赋值节点；`{{var.x}}` 模板在发出请求时固化快照；写入日志；变量面板（E53–E56）。

**P4 执行节点**
- 两种角色 + "节点定义操作，线型决定调用方式"；参数来源 5 种；参数预取在上游回合开始时经 `agent/pre-step` 注入工具；兜底顺序 1 → 2 → 4；权限只看直接发命令节点的会话（完全访问则免确认）（E33–E37）。
- 终端执行节点：一次性模式走 `ctx.subprocess`；交互模式依赖 M09 二期 `attach`，可放到本阶段末尾。Git 操作节点复用 `HostGitService` 与 `GitActionRequest`；观测线从 Session 事件中的原生 bash / 终端调用推导（E38–E40）。
- 核实 `dsh-bash-sandbox` / `dsh-pwsh-sandbox` 是否可用于执行节点；不可用则只做确认机制。

**P5 人工 / 触发 / 事件**
- 表单、打分、审阅编辑节点；扇出批量处理视图（E41–E42）。
- 触发器（定时复用 `dsh-util-time` 的 Cron / RRULE，自有调度）、护栏、总闸、导入时启用选项、运行来源 `trigger`（E21–E24）。
- 状态端口（顶部居中）、事件线（第三种连线角色 `event`）、三种发送方式、事件信封、自触发环路检测（E25–E27）；通知节点（先核实 `workspace.toast` 注册方式）（E31）；消息线改为中心锚点（E32），同步修订 `docs/design.md` §3.2。

**P6 玩法**
- 回放（用 `run.graph` 与 P1 已加的令牌时间戳）、断点（`enqueue` 中 `runtime.send` 之前暂停）、预算（设置 + 状态事件 + 顶栏消耗表）（E43–E45）。
- 泳道参数绑定条目字段、"择优"策略、常量 / 随机节点；擂台、陪审团、辩论、头脑风暴墙、随机灵感作为内置模板；战绩榜（新表）与战报卡（E46–E48）。

## 6. 验证
- 每个任务：`pnpm check`（= build + typecheck + test）。
- 运行时改动：`pnpm test:integration`（mock DSH 端到端）；涉及工具注册时加跑 `pnpm test:team:spike` 的同类脚本。
- 前端：用 `scripts/canvas-interactions.mjs` 的 Playwright 辅助启动 `pnpm dev:mock`（只开一个），对新节点截图：暗色、亮色、L1（设置中开启"减弱动效"）、缩放 0.4，各一张；附上第 3.10 节自检答案。
- P1 人工验收脚本：从内置模板创建 TDD 闭环 → 用 mock 模型让验证员第 1 轮输出"结论：未通过"、第 2 轮输出"结论：通过" → 应看到作者只跑 2 轮、判断节点"通过"行高亮、回环线显示"已跳过"、签收节点等待确认。

## 7. 给 GPT 的提示词（原样粘贴）

```
你是 FlowSpace 项目的实现工程师。FlowSpace 是 DeepSeek Harness 0.2.2-rc.3 的画布插件（Host 服务 + Typert RPC + React 18 客户端，画布为自研 DOM/SVG）。

开始前必读：
1. 仓库根目录 AGENTS.md
2. docs/plan-canvas-extensions.md（本计划，权威依据）
3. docs/canvas-extensions.md（产品决定 E01–E62）
4. 计划第 3 节"前端视觉规范"——这是硬性约束

工作方式：
- 一次只做一个任务（T1、T2……），按顺序。每个任务开始前列出要改的文件，并先备份到 .backups/<任务名>-<时间戳>/。
- 优先复用已有函数和组件；计划里点名的位置先读懂再改。
- 工作区里有大量他人未提交的修改：不得 revert、格式化或改动与任务无关的代码。
- 只开一个 dev server。除计划已批准的 QuickJS 沙箱外不新增依赖（安装前报版本号）。不要 commit 或 push。
- 任务完成标准：pnpm check 通过；运行时改动另跑 pnpm test:integration；前端改动附截图（暗色 / 亮色 / L1 / 缩放 0.4）和第 3.10 节自检逐条回答。
- 遇到计划没写清楚的地方：停下来，写出你的两种理解和推荐，等我确认。不要猜。

前端审美规则（违反任一条即视为任务未完成）：
- 只用计划第 3.1 / 3.2 节的 token；新样式只写在 client/styles/flow-ext.css；不改 polish.css / tokens.css 的既有规则。
- 卡片外壳、头部、端口、按钮、输入框、对话框全部复用现有组件（第 3.5 节）；新节点只提供卡片 body 内容。
- 不加渐变、阴影、插画、emoji、图标库；图标只用第 3.7 节给定的路径。
- 状态色（running / amber / green / red）只表示运行状态；类别色只表示节点类别。
- 动效只用 --dur-* 时长；循环动画只动 opacity / transform / stroke-dashoffset；所有动画元素加 .fsx-motion，并在 L1 和 prefers-reduced-motion 下关闭。
- 画布世界内禁止 filter、backdrop-filter、:has()。
- 字号只用 11 / 12 / 12.5 / 13 / 13.5；字重只用 400 / 500 / 600。
- 拿不准时：照搬最接近的现有节点（Git、Changes、终端、看板节点）的做法，并在说明里写明照搬了哪里。

现在从阶段 1 的 T1 开始。先复述 T1 的范围和你要改的文件，再动手。
```
