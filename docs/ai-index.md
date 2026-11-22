# FlowSpace AI 项目索引

FlowSpace 是 DeepSeek Harness（DSH）Web 的持久化 Agent 画布插件。Agent 卡片绑定原生会话，画布组织任务、上下文和连线，Host 负责推进工作流。插件包名为 `dsh-flowspace`，目标环境是已发布的 DSH `0.2.2-rc.3`。开发环境使用 Node.js `>=24.9.0` 和 `pnpm@11.21.0`。 [工作区清单](../package.json) · [插件清单](../packages/flowspace/package.json)

接手任务时先读仓库约定，按下表定位源码和测试。编辑前查看 `git status --short`，用 `node scripts/backup.mjs <文件路径...>` 备份要改的已有文件，保留工作区里的其他修改。当前行为以源码和测试为准，设计稿和阶段计划用于查询需求与取舍。 [仓库约定](../AGENTS.md) · [备份脚本](../scripts/backup.mjs)

## 执行与数据边界

- **Host 启动和调度。** `FlowspaceService` 注册 Typert `@Remote` 接口及节点执行器。画布启动经 `FlowClient.start` 到 `FlowspaceService.start`，再交给 `Scheduler`。`DshRuntime` 接入原生 Session，Host 把 DSH 事件交回调度器。输入校验放在负责执行的 Host 边界。 [Host 入口](../packages/flowspace/src/index.ts) · [调度器](../packages/flowspace/src/core/scheduler.ts) · [DSH 适配](../packages/flowspace/src/host/runtime.ts)
- **Client 发起请求和渲染。** Web 插件通过 DSH slots 挂载画布，并用 `conversation.content` 嵌入原生对话和审批。`FlowClient` 通过 `follow` 订阅 `FlowspaceSnapshot`，画布用快照展示运行进度。 [Web 入口](../packages/flowspace/src/client/index.tsx) · [Client 桥接](../packages/flowspace/src/client/bridge.ts)
- **画布与运行分别保存。** `FlowspaceDocument` 记录可编辑节点、连线、视口、草稿等数据，`FlowspaceRun` 记录运行图、步骤和令牌。撤销和重做只作用于画布编辑，重启恢复由 `Scheduler.recover` 处理。`flowspaceDomain` 声明 `documents`、`runs`、`templates`、`snapshots` 和其他持久化表。 [共享类型](../packages/flowspace/src/types.ts) · [存储与校验](../packages/flowspace/src/host/storage.ts)
- **连线按用途查找。** `reference` 提供上下文，`continuation` 按触发策略推进工作流，`event` 传递运行和容器等事件。原生消息线展示 DSH Agent 之间的通信。上下文模式在类型中使用 `conclusion`、`session`、`fork`。 [端口与连线规则](../packages/flowspace/src/core/connect.ts) · [原生消息线](../packages/flowspace/src/client/sceneWires.ts)

## 按任务找源码和测试

| 任务 | 源码入口与搜索词 | 相关测试 |
| --- | --- | --- |
| 启动范围、并行汇合、循环、确认、重试和恢复 | [graph.ts](../packages/flowspace/src/core/graph.ts) 的 `launchPlan`， [scheduler.ts](../packages/flowspace/src/core/scheduler.ts) 的 `start`、`release`、`rerunFailed`、`recover` | [scheduler.test.ts](../packages/flowspace/test/scheduler.test.ts) · [flow-recovery.test.ts](../packages/flowspace/test/flow-recovery.test.ts) |
| 会话绑定、原生聊天触发、引用胶囊、分叉 | [Host 入口](../packages/flowspace/src/index.ts) 的 `bind`、`prepareReferences` 和 `agent/` 事件监听， [runtime.ts](../packages/flowspace/src/host/runtime.ts) 的 `ensure`、`reference`、`capture`， [bridge.ts](../packages/flowspace/src/client/bridge.ts) 的 `watchDraft` | [features.test.ts](../packages/flowspace/test/features.test.ts) · [integration.ts](../scripts/integration.ts) |
| 新增节点、修改端口或配置、判断分支 | [节点描述与注册表](../packages/flowspace/src/core/nodes/) 的 `NodeDescriptor`、`flowType`、`portsOf`， [connect.ts](../packages/flowspace/src/core/connect.ts) 的 `canConnect`， [Host 执行器](../packages/flowspace/src/host/nodes/)， [视图映射](../packages/flowspace/src/client/nodes/index.ts) 的 `viewOf` | [flow-nodes.test.ts](../packages/flowspace/test/flow-nodes.test.ts) · [connect.test.ts](../packages/flowspace/test/connect.test.ts) · [tdd-template.test.ts](../packages/flowspace/test/tdd-template.test.ts) |
| 画布编辑、节点摆放、分组与剪贴板 | [CanvasApp.tsx](../packages/flowspace/src/client/CanvasApp.tsx) 的 `edit`， [geometry.ts](../packages/flowspace/src/client/geometry.ts)， [canvasLayout.ts](../packages/flowspace/src/client/canvasLayout.ts) 的 `arrangeCanvas`， [subgraphs.ts](../packages/flowspace/src/client/subgraphs.ts) | [canvas-integration.test.ts](../packages/flowspace/test/canvas-integration.test.ts) · [canvas-layout.test.ts](../packages/flowspace/test/canvas-layout.test.ts) |
| 连线路由、缩放与大画布性能 | [wireRouting.ts](../packages/flowspace/src/client/wireRouting.ts)、[sceneWires.ts](../packages/flowspace/src/client/sceneWires.ts)、[sceneModel.ts](../packages/flowspace/src/client/sceneModel.ts)、[cameraFrame.ts](../packages/flowspace/src/client/cameraFrame.ts)、[guideRouting.worker.ts](../packages/flowspace/src/client/guideRouting.worker.ts) | [wire-routing.test.ts](../packages/flowspace/test/wire-routing.test.ts) · [canvas-performance.test.ts](../packages/flowspace/test/canvas-performance.test.ts) · [浏览器性能脚本](../scripts/canvas-perf.mjs) |
| 卡片、主题、双语与动效 | [节点和卡片组件](../packages/flowspace/src/client/nodes/)， [i18n.ts](../packages/flowspace/src/client/i18n.ts)， [样式入口](../packages/flowspace/src/client/style.css) 与 [主题变量](../packages/flowspace/src/client/styles/tokens.css) | [style-contract.test.ts](../packages/flowspace/test/style-contract.test.ts) · [浏览器交互脚本](../scripts/canvas-interactions.mjs) |
| 结构化产出、数据变换、预览与文件刷新 | [flowEmit.ts](../packages/flowspace/src/host/flowEmit.ts) 的 `flow_emit`， [数据节点描述](../packages/flowspace/src/core/nodes/data/)， [Host 执行器](../packages/flowspace/src/host/nodes/data.ts)， [dataPreview.ts](../packages/flowspace/src/host/dataPreview.ts)， [dataFileWatch.ts](../packages/flowspace/src/host/dataFileWatch.ts)， [内容落盘](../packages/flowspace/src/host/content.ts) | [emission.test.ts](../packages/flowspace/test/emission.test.ts) · [data-transforms.test.ts](../packages/flowspace/test/data-transforms.test.ts) · [data-preview-host.test.ts](../packages/flowspace/test/data-preview-host.test.ts) |
| 扇出母版、泳道、合并分拣与恢复 | [fanout.ts](../packages/flowspace/src/core/fanout.ts) 的 `reconcileFanout` 处理画布泳道， [runFanout.ts](../packages/flowspace/src/core/runFanout.ts) 的 `FanoutExecution` 处理运行批次， [fanoutDrafts.ts](../packages/flowspace/src/host/fanoutDrafts.ts) 处理 Host 草稿同步 | [fanout-editing.test.ts](../packages/flowspace/test/fanout-editing.test.ts) · [fanout-runtime.test.ts](../packages/flowspace/test/fanout-runtime.test.ts) · [集成策略与恢复](../scripts/fanout-policy-checks.ts) |
| 看板、便签、文件容器及变量 | [board.ts](../packages/flowspace/src/core/board.ts) 的条目和引用， [containers.ts](../packages/flowspace/src/host/containers.ts) 的授权、投递与回滚， [variables.ts](../packages/flowspace/src/host/variables.ts) 的读写与作用域 | [board.test.ts](../packages/flowspace/test/board.test.ts) · [容器与变量集成](../scripts/container-checks.ts) |
| 人工输入、触发器、通知、Git 和终端执行 | [交互执行器](../packages/flowspace/src/host/nodes/interactions.ts) 的 `TriggerService`、`humanExecutor`， [operations.ts](../packages/flowspace/src/host/nodes/operations.ts) 的 `OperationService` | [flow-recovery.test.ts](../packages/flowspace/test/flow-recovery.test.ts) · [扩展集成场景](../scripts/extension-checks.ts) |
| 运行回放、断点、预算与战报 | [PlayViews.tsx](../packages/flowspace/src/client/nodes/PlayViews.tsx) 的 `replayAt`， [scheduler.ts](../packages/flowspace/src/core/scheduler.ts) 的 `debugStep`， [budget.ts](../packages/flowspace/src/core/budget.ts) 的 `budgetHit`， [play.ts](../packages/flowspace/src/host/nodes/play.ts) 的 `buildReport` | [extension-checks.ts](../scripts/extension-checks.ts) 的 `verifyPlaybackBudgetAndTemplates` |
| 团队角色、编制、派活与成员状态 | [teamAssets.ts](../packages/flowspace/src/host/teamAssets.ts)、[teamRuntime.ts](../packages/flowspace/src/host/teamRuntime.ts)、[teamDelegate.ts](../packages/flowspace/src/host/teamDelegate.ts) 的 `team_delegate`， [TeamCanvas.tsx](../packages/flowspace/src/client/TeamCanvas.tsx) | [team.test.ts](../packages/flowspace/test/team.test.ts) · [team-real-smoke.ts](../scripts/team-real-smoke.ts) |
| 工作流模板、导入导出与画布快照 | [templates.ts](../packages/flowspace/src/client/templates.ts) 的 `captureTemplate`、`instantiateTemplate`、`synchronizeTemplate`、`buildSnapshot`， [Host 入口](../packages/flowspace/src/index.ts) 的 `importWorkflow`、`restoreSnapshot` | [content-template.test.ts](../packages/flowspace/test/content-template.test.ts) · [content-template-checks.ts](../scripts/content-template-checks.ts) |
| 项目骨架、分支、worktree、Changes 和终端卡片 | [structure.ts](../packages/flowspace/src/client/structure.ts) 的 `buildDerivedStructure` 和 `resolveDraftAffiliation`， [ToolNodeViews.tsx](../packages/flowspace/src/client/ToolNodeViews.tsx)， [git.ts](../packages/flowspace/src/host/git.ts)， [Host 入口](../packages/flowspace/src/index.ts) 的 `projectStructures`、`sessionChanges`、`readTerminalScreen` | [features.test.ts](../packages/flowspace/test/features.test.ts) · [integration.ts](../scripts/integration.ts) |

新增 `kind: "flow"` 节点时，从带命名空间的 `flowType` 查起，沿描述、Host 执行器和 `viewOf` 检查配置与端口是否一致。改动持久化字段时一起核对共享类型、`documentSchema`、`checkDocument` 以及模板和快照。 [节点契约](../packages/flowspace/src/core/nodes/types.ts) · [存储与迁移](../packages/flowspace/src/host/storage.ts)

## 开发与验证

| 命令 | 用途 |
| --- | --- |
| `pnpm install` | 按工作区锁文件安装依赖。 |
| `pnpm dev:mock` | 启动默认端口为 `3191` 的隔离沙盒，使用真实 DSH Host 和确定性模型夹具。可在 Git Bash 运行 `./flowspace.sh museum`，或在 PowerShell 运行 `.\flowspace.cmd museum`，打开预置的博物馆画布。 |
| `pnpm exec tsx --test packages/flowspace/test/scheduler.test.ts` | 单独运行某个测试文件，此处以调度器为例。 |
| `pnpm check` | 构建 Host、Client 和 Typert 产物，执行双端类型检查和 `packages/flowspace/test/` 下的测试。 |
| `pnpm test:integration` | 使用构建后的插件启动独立 DSH Host，依次验证首次运行、重启恢复和移植到新 profile。运行时改动先跑 `pnpm check`，再跑此命令。 |
| `pnpm pack:plugin` 后运行 `node scripts/package-smoke.mjs` | 打包并验证 tarball 可被 DSH 加载，检查生成的 Remote 接口。 |
| `pnpm test:real` 或 `pnpm test:team:real` | 使用已配置的真实模型验证工作流或团队，会产生模型用量。 |

`packages/flowspace/lib/` 中的 Host、Web 和 Typert 文件由构建生成。改 Remote 接口时编辑声明 `@Remote` 的 Host 源码，更新 Client 桥接，并运行构建。开发沙盒和构建工具文件位于 `.local/`，包和部分验证报告输出到 `artifacts/`。 [构建实现](../scripts/compiler.mjs) · [沙盒实现](../scripts/environment.mjs)

## 设计与验收文档

- 安装、沙盒入口和操作示例见项目 README。 [README](../README.md) · [English README](../README.en.md)
- 产品意图和交互规格见设计规范，原生 DSH API 的版本约束和取舍见能力映射与决策台账。 [设计规范](design.md) · [DSH 能力映射](capabilities.md) · [产品决策](product-decisions.md)
- 扩展节点、控制流和数据流的需求与阶段方案见扩展文档。 [扩展设计](canvas-extensions.md) · [实施计划](plan-canvas-extensions.md) · [P2](plan-canvas-extensions-p2.md) · [P3–P6](plan-canvas-extensions-p3-p6.md)
- 历史验收、浏览器证据及性能复现方法见验证记录。 [验证记录](verification.md)
