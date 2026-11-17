# FlowSpace

DeepSeek Harness `0.2.2-rc.3` 的 Agent 无限画布插件。每个 Agent 节点绑定真实、可持续对话的 DSH Session；引用线提供上下文，接续线推进工作。调度运行在 Host，切换页面不会停止工作流。

## 开发运行

需要 Node.js ≥ 24.9 和 pnpm 11。

```bash
pnpm install
pnpm build
pnpm dev
```

启动地址由终端打印，默认端口为 `3190`。从 DSH 侧栏打开 **FlowSpace**。开发运行使用项目内 `.local/flowspace` 作为独立 DSH home，工作区为其中的 `workspace`；不会升级全局 DSH，也不会修改日常 web profile。模型使用该独立 profile 的配置及进程环境变量，可在 DSH 中选择。不要把凭据写入源码。

测试模型环境：`pnpm dev:mock`，端口 `3191`。界面模型名为 **FlowSpace integration fixture**，输出带 `【测试模型】` 标记；会话、队列、持久化和事件均为真实 DSH，模型输出为确定性夹具。

## 安装到 DSH

先更新 DSH 到 `0.2.2-rc.3`，然后构建安装包：

```bash
pnpm pack:plugin
node scripts/install.mjs --profile web
```

安装脚本先备份目标 profile 的 manifest、patch 和 lockfile，再通过 DSH CLI 安装本地包。可把 `web` 改为独立 profile 名。安装后在插件页启用 FlowSpace，从侧栏进入。脚本不替换你的模型配置。

手动安装也可以在备份目标 profile 后执行：

```bash
dsh plugin --profile web add /absolute/path/to/dsh-flowspace-0.1.0.tgz
```

停用：DSH 插件页关闭 FlowSpace。卸载：`dsh plugin --profile web remove dsh-flowspace`。停用会停止插件持有的调度；已有 DSH 会话和保存的画布数据保留。

## 使用

1. 双击画布创建 Agent，或从“添加节点”选择已有会话。输入任务后运行。展开卡使用 DSH 原生对话组件，包含模型、权限、附件、工具结果和审批。
2. 标题栏菱形端口连接**接续**；底部圆形端口连接**引用**。在检查器选择结论、会话文本快照或历史分叉，以及自动、确认或不自动触发。
3. 上游结束时固定结果，等待确认和排队期间不会改成后来产生的结果。会话快照不包含工具过程或推理；历史分叉仅用于未启动草稿，继承指定事件之前的历史。
4. 全局启动先看清单，可取消起点；多选或分组运行在范围外停下，放行后继续。汇合等待本次运行的全部参与上游，循环默认最多三轮。
5. 原生对话默认也会触发接续；画布设置可改变全局默认，节点检查器可单独覆盖。原生对话标题旁显示接续状态并可返回画布。
6. “暂停”暂停后续调度，已接受任务继续结算；“停止 Agent”取消当前回合；取消运行只取消它拥有的任务。DSH 关闭或插件重载后，未完成运行需人工继续。

任务预设用于自动接续，输入草稿用于下一次手动发送。画布编辑自动保存到 DSH storage domain；完整会话历史由 DSH 保存。删除画布节点不会删除 Session。设置中可导入、导出画布 JSON。

## 检查

```bash
pnpm check                  # 类型、调度行为、插件构建
pnpm test:integration       # rc.3 完整 Host + 确定性测试模型
pnpm exec tsx scripts/real-smoke.ts  # 使用已配置真实模型，会产生模型用量
```

真实模型检查在专用工作区运行四个简短任务，验证并行 → 汇合 → 串行，结果保存于 `artifacts/real-smoke.json`。集成脚本不应在日常 profile 上运行。

## 架构

- `packages/flowspace/src/core`：与 DSH 分离的图和调度状态机。
- `packages/flowspace/src/host`：DSH 会话适配、引用、存储领域；根入口提供 typed Remote。
- `packages/flowspace/src/client`：React Flow 画布，通过 DSH slots 和 `conversation.content` 复用真实对话。

前端不驱动调度。每次启动固定图结构、范围及上下文来源；运行记录关联 Session、requestId、turn 和 seq。编辑撤销不撤销已发送输入。数据位于所选 `$DSH_HOME` 下的 FlowSpace storage domain，版本为 1。

Typert rc.3 的生成器默认只识别源码工作区内的 protocol 声明。构建脚本在 `.local/build-tools` 生成一份构建期适配，仅让它识别 npm protocol 的公开声明；安装的 DSH 和运行时均不打补丁。

首版支持一张持久画布、两种示例、基础两层分组、中文/英文和 DSH 深浅主题。复杂浮窗、模板版本同步、可编辑组合端口、摘要交接、自动 worktree、Team 通信和多机协作不在此版。

设计依据与 DSH 能力说明见 `docs/design.md`、`docs/capabilities.md`；验收记录见 `docs/verification.md`。
