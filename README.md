# Linear 下一步工作计划 Codex 插件

将“项目类型、优先级、工作计划内容”映射为 Linear Project 下的 Issue，并在 Codex 对话中显示按 Project 分组的交互式看板。

## 功能

- 新增计划并同步到 Linear Issue。
- 使用 `Codex 工作计划` 标签识别插件创建的计划。
- 在 Codex 中以面板展示全部计划，支持搜索以及优先级、状态筛选。
- 拖动计划调整个人顺序；跨项目拖动后由 Codex 更新 Linear Project。
- 支持浅色/深色主题、全屏和键盘移动按钮。

## 安装

需要有本仓库的访问权限，并安装 Codex CLI 或 Codex 桌面应用。

```bash
git clone https://github.com/sgwood/linear-next-work-plan.git
cd linear-next-work-plan
codex plugin marketplace add "$PWD"
codex plugin add linear-next-work-plan@enterprise-tools
```

安装后新建一个 Codex 任务，连接 Linear OAuth。每位使用者使用自己的 Linear 账号授权，插件仓库不保存访问令牌。

## 使用示例

```text
新增下一步工作计划：项目类型“招生模块”，优先级高，内容“完成线索查重回归并整理未通过项”
```

显示全部计划：

```text
显示我的下一步工作计划看板
```

插件会将字段映射为：

- 项目类型 → Linear Project
- 优先级 → Linear Issue Priority
- 工作计划内容 → Linear Issue 标题及描述

## 看板交互

- 同列拖动：保存当前设备上的个人排序。
- 跨列拖动：请求 Codex 通过 Linear OAuth 更新 Issue 的 Project。
- 点击“刷新”：重新读取 Linear 并生成最新面板。
- 点击“打开 Linear”：进入对应 Issue。

Linear 是任务字段的权威数据源。由于当前 Linear 连接器没有提供 Issue 手工排序字段，同列顺序保存在本机 Codex 状态目录，不会冒充为 Linear 工作区级排序。

插件升级前创建的旧计划没有 `Codex 工作计划` 标签时，可在 Codex 中输入“迁移现有工作计划到看板”，确认候选 Issue 后补充标签。

## 仓库结构

```text
.agents/plugins/marketplace.json
plugins/linear-next-work-plan/
```

插件使用 Linear 官方 OAuth MCP：`https://mcp.linear.app/mcp`。

架构说明见 [docs/architecture.md](docs/architecture.md)。

## 本地开发

```bash
cd plugins/linear-next-work-plan
npm install
npm test
```

`dist/server.mjs` 是已打包的运行文件，插件使用者无需执行 `npm install`。

## 开源许可

[MIT License](LICENSE)
