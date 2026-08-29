# Linear 工作计划映射

## 字段

| 用户字段 | Linear 字段 | 写入规则 |
|---|---|---|
| 项目类型 | Project | 精确匹配项目名称；不存在时需确认后新建 |
| 优先级 | Issue priority | 紧急/P0=1，高/P1=2，中/P2=3，低/P3=4 |
| 工作计划内容 | Issue title + description | 标题保持动作导向；长原文完整保留在描述中 |
| 负责人 | Issue assignee | 默认 `me`，用户指定时覆盖 |
| 计划标识 | Issue label | 固定使用工作区标签 `Codex 工作计划` |

## Codex 看板

插件内置 MCP Apps 看板面板：

- 使用 `Codex 工作计划` 标签获取全部计划 Issue。
- 按 Linear Project 分列，可搜索并按优先级、状态筛选。
- 同列拖动把个人顺序保存在本机 Codex 状态目录。
- 跨 Project 列拖动通过 Codex 后续消息调用 Linear `save_issue` 更新 Project。
- 刷新后以 Linear 的 Issue 内容、Project、优先级和状态为准。

Linear 连接器没有暴露 Issue 的手工排序字段，因此同列排序不是 Linear 工作区级排序，不得报告为已同步到 Linear。

官方说明：

- https://linear.app/docs/display-options
- https://linear.app/docs/board-layout
- https://linear.app/docs/priority

## 示例

用户请求：

> 新增下一步工作计划：项目类型“招生系统”，优先级高，内容“完成线索查重回归并整理未通过项”。

预期写入：

```json
{
  "team": "已解析的团队",
  "project": "招生系统",
  "priority": 2,
  "title": "完成线索查重回归并整理未通过项",
  "assignee": "me",
  "labels": ["Codex 工作计划"]
}
```
