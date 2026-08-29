# 看板架构

## 数据流

```text
用户请求显示看板
        │
        ▼
Linear MCP：list_issues + list_projects
        │ 结构化 Issue / Project 数据
        ▼
本地看板 MCP：render_work_plan_board
        │ MCP UI resource
        ▼
Codex 面板：筛选、全屏、打开 Issue、拖动
```

读取 Linear 与渲染 UI 分开：Linear MCP 负责真实业务数据，本地看板 MCP 只负责排序状态和呈现。即使宿主不渲染 UI，Linear 工作流仍可独立完成。

## 写入边界

| 操作 | 写入位置 | 实现 |
|---|---|---|
| 新增计划 | Linear | `save_issue`，附加 `Codex 工作计划` 标签 |
| 同列排序 | 本机 Codex 状态目录 | `save_board_order` 原子写入 JSON |
| 跨列移动 | Linear | 面板发送后续消息，Codex 调用 `save_issue` 更新 Project |
| 搜索和筛选 | 当前面板 | 纯前端状态，不写入 Linear |

默认排序文件：

```text
~/.codex/state/linear-next-work-plan/board-order.json
```

可通过 `LINEAR_NEXT_WORK_PLAN_STATE_DIR` 为测试或受管环境指定其他状态目录。

## 安全性

- 插件不读取、保存或传递 Linear OAuth 令牌。
- Linear 写入仍由官方 Linear MCP 和用户账号权限控制。
- 面板只把 Issue 标识与目标 Project 发送回 Codex，不在 iframe 中直接访问 Linear API。
- 排序文件只保存 Project key 与 Issue ID，不保存标题、描述或个人资料。

## 兼容性

看板基于 MCP Apps UI resource，核心数据通过 `structuredContent` 传入。面板支持标准 `tools/call` bridge；全屏、打开外链和后续消息使用宿主提供的能力并进行特性检测。
