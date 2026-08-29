---
name: next-work-plan
description: "新增、预览或整理个人下一步工作计划，并将项目类型、优先级和计划内容同步为 Linear Project 下的 Issue。用户提到下一步计划、工作计划、待办计划、项目类型看板或同步 Linear 时使用；不用于普通代码缺陷管理或与工作计划无关的 Linear 操作。"
---

# Linear 下一步工作计划

使用插件提供的 Linear OAuth 连接完成读写。不要要求用户提供 Linear API Key，也不要把访问令牌写入文件或回复。

## 数据映射

- `项目类型` → Linear Project 的精确名称。
- `优先级` → Linear Issue priority：紧急/P0 = `1`，高/P1 = `2`，中/P2 = `3`，低/P3 = `4`。
- `工作计划内容` → Linear Issue。内容简短时原文作为标题；内容较长或包含多段时，生成不改变意图的简短动作标题，并把原文完整写入 description。
- 新 Issue 默认分配给 `me`，除非用户明确指定其他负责人。

完整映射和看板设置见 [references/linear-work-plan.md](references/linear-work-plan.md)。

## 新增一条计划

1. 从用户请求中取得三个必填值：项目类型、优先级、工作计划内容。缺少任何一项时只询问缺失项，不猜测。
2. 确认 Linear 连接可用。优先使用 Linear 连接器的 `list_teams`、`list_projects`、`save_project`、`save_issue`；工具不可用时，请用户在插件页连接 Linear OAuth，并停止写入。
3. 解析团队：
   - 用户明确给出 team 时使用该 team。
   - 先按项目类型调用 `list_projects`，请求 `id`、`name`、`url`、`teams` 字段。若精确名称匹配的 Project 只有一个，并且只关联一个 team，直接复用该 team。
   - 仍无法唯一确定时调用 `list_teams`。只有一个 team 时使用它；多个 team 时询问用户，不要擅自选择。
4. 解析 Project：
   - 仅接受忽略首尾空格和大小写后的精确名称匹配，不用模糊结果代替。
   - Project 不存在时，新增计划本身只授权创建 Issue，不自动授权创建 Project。明确告知用户需要新建同名 Project；用户同意后才调用 `save_project`，传入 `name` 与 `addTeams`。
5. 用户明确说“新增”“记录”“保存”或“同步”即授权创建这一条 Issue；只要求草拟、查看或预览时，不调用任何写工具，只展示将要写入的 team、project、priority、title、description、assignee。
6. 创建 Issue 时调用 `save_issue`，至少传：
   - `team`: 已确认的团队名称或 ID
   - `project`: 精确匹配或刚创建的 Project 名称或 ID
   - `priority`: 规范化后的数字
   - `title`: 工作计划标题
   - `description`: 原始内容需要保留时写入
   - `assignee`: 默认 `me`
7. 只有工具明确返回成功后才报告同步成功，同时回报 Issue identifier、标题、Project、优先级和 URL。调用结果不确定时不要自动重试写入，先查询确认，避免重复 Issue。

## 看板与拖动

插件负责把 Issue 归入正确 Project，但 Linear 连接器目前不创建持久化自定义视图。用户首次使用时给出以下一次性设置：

1. 在 Linear 的 Issue 视图打开 Display options。
2. Layout 选择 Board。
3. Grouping 选择 Project。
4. Ordering 选择 Manual；需要时选择 Set as default。

在该视图中，同一 Project 列内拖动会改变手动顺序；拖到另一 Project 列会同步改变该 Issue 的 Project。若 Linear 界面选项发生变化，使用 `search_documentation` 查询官方文档后再指导用户。

## 边界

- 一次请求默认只创建一条 Issue；批量计划必须先列出将创建的条目并取得批量写入确认。
- 不自动创建 team、cycle、label、milestone，也不更改现有 Issue。
- 不用 Project priority 代替 Issue priority；用户输入的优先级属于当前工作计划 Issue。
- 若项目名称存在多个候选、多个 team 或已归档 Project，必须消歧，不能猜。
