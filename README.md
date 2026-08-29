# Linear 下一步工作计划 Codex 插件

将“项目类型、优先级、工作计划内容”映射为 Linear Project 下的 Issue，并提供按 Project 分组、支持手动拖动排序的看板使用方式。

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

插件会将字段映射为：

- 项目类型 → Linear Project
- 优先级 → Linear Issue Priority
- 工作计划内容 → Linear Issue 标题及描述

## 看板设置

在 Linear Issue 视图中设置：

1. Layout 选择 Board。
2. Grouping 选择 Project。
3. Ordering 选择 Manual。

同一 Project 列内拖动可调整计划顺序；拖到其他 Project 列会改变 Issue 所属 Project。

## 仓库结构

```text
.agents/plugins/marketplace.json
plugins/linear-next-work-plan/
```

插件使用 Linear 官方 OAuth MCP：`https://mcp.linear.app/mcp`。
