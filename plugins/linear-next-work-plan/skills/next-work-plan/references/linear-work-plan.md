# Linear 工作计划映射

## 字段

| 用户字段 | Linear 字段 | 写入规则 |
|---|---|---|
| 项目类型 | Project | 精确匹配项目名称；不存在时需确认后新建 |
| 优先级 | Issue priority | 紧急/P0=1，高/P1=2，中/P2=3，低/P3=4 |
| 工作计划内容 | Issue title + description | 标题保持动作导向；长原文完整保留在描述中 |
| 负责人 | Issue assignee | 默认 `me`，用户指定时覆盖 |

## 看板

Linear 的 Issue 视图支持 Board 布局、按 Project 分组和 Manual 排序：

- 同列拖动用于调整计划的人工顺序。
- 跨 Project 列拖动会让 Issue 采用目标 Project。
- Manual 顺序会在工作区范围保存。

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
  "assignee": "me"
}
```
