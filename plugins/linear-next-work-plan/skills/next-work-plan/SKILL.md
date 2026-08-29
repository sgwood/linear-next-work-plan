---
name: next-work-plan
description: "新增、预览、整理或以交互式看板显示下一步工作计划，并将项目类型、优先级和计划内容同步为 Linear Project 下的 Issue。用户提到下一步计划、工作计划、待办计划、项目类型看板、拖动计划或同步 Linear 时使用；不用于普通代码缺陷管理或与工作计划无关的 Linear 操作。"
---

# Linear 下一步工作计划

使用插件提供的 Linear OAuth 连接完成读写。不要要求用户提供 Linear API Key，也不要把访问令牌写入文件或回复。

所有由本插件创建的计划 Issue 使用工作区标签 `Codex 工作计划`。该标签是看板识别计划的稳定边界；不要用创建人、标题关键词或某个固定 Project 猜测哪些 Issue 属于工作计划。

## 数据映射

- `项目类型` → Linear Project 的精确名称。
- `优先级` → Linear Issue priority：紧急/P0 = `1`，高/P1 = `2`，中/P2 = `3`，低/P3 = `4`。
- `工作计划内容` → Linear Issue。内容简短时原文作为标题；内容较长或包含多段时，生成不改变意图的简短动作标题，并把原文完整写入 description。
- 新 Issue 默认分配给 `me`，除非用户明确指定其他负责人。
- `Codex 工作计划` → 每条计划 Issue 的固定标签；不把普通 Linear Issue 混入看板。

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
5. 确保计划标签可用：
   - 调用 `list_issue_labels`，按名称精确查找工作区标签 `Codex 工作计划`。
   - 用户明确要求新增计划时，该写入授权包含为计划建立一次性识别标签。标签不存在时调用 `create_issue_label`，传入 `name: "Codex 工作计划"`、`color: "#5E6AD2"` 和简短说明，不传 `teamId`，从而创建工作区标签。
   - 只查看、预览或打开看板时，不创建标签。
6. 用户明确说“新增”“记录”“保存”或“同步”即授权创建这一条 Issue；只要求草拟、查看或预览时，不调用任何写工具，只展示将要写入的 team、project、priority、title、description、assignee、labels。
7. 创建 Issue 时调用 `save_issue`，至少传：
   - `team`: 已确认的团队名称或 ID
   - `project`: 精确匹配或刚创建的 Project 名称或 ID
   - `priority`: 规范化后的数字
   - `title`: 工作计划标题
   - `description`: 原始内容需要保留时写入
   - `assignee`: 默认 `me`
   - `labels`: `["Codex 工作计划"]`
8. 只有工具明确返回成功后才报告同步成功，同时回报 Issue identifier、标题、Project、优先级和 URL。调用结果不确定时不要自动重试写入，先查询确认，避免重复 Issue。

## 显示 Codex 看板

用户要求“显示看板”“打开计划面板”“查看所有工作计划”或刷新面板时：

1. 调用 Linear `list_issues`，传入：
   - `label: "Codex 工作计划"`
   - `limit: 250`
   - `orderBy: "updatedAt"`
   - `fields`: `id`、`title`、`description`、`priority`、`url`、`updatedAt`、`dueDate`、`status`、`statusType`、`project`、`projectId`、`team`、`teamId`、`labels`、`assignee`
2. 若返回下一页 cursor，继续分页，直到取得所有未归档计划。不要只展示第一页。
3. 调用 Linear `list_projects`，传入 `limit: 50`，字段至少包括 `id`、`name`、`url`、`status`、`teams`；有 cursor 时继续分页。项目用于建立看板列和跨列移动目标。
4. 调用本插件 MCP 的 `render_work_plan_board`，把规范化后的全部 `issues` 与 `projects` 传入。不要自己用 Markdown 表格代替面板，除非宿主明确不支持 UI resource。
5. `render_work_plan_board` 是只读渲染工具；它不查询或修改 Linear。面板刷新按钮会发送后续请求，重复以上读取和渲染流程。

如果没有 `Codex 工作计划` 标签或没有匹配 Issue，仍调用 `render_work_plan_board` 显示空看板，并说明后续新建的计划会自动进入看板。不要在纯查看请求中创建标签或修改旧 Issue。

## 拖动与同步

- 同一 Project 列内拖动：面板调用 `save_board_order`，把个人排序保存在本机 Codex 状态目录；不改变优先级，也不修改 Linear Issue。
- 跨 Project 列拖动：拖动本身是用户对这一次 Project 变更的明确授权。面板会发送包含 Issue 标识和目标 Project 的后续消息；收到后调用 Linear `save_issue`，只传 `id` 与目标 `project`，不要新建 Issue，也不要覆盖标题、标签、负责人或优先级。
- Linear 更新成功后，重新执行“显示 Codex 看板”的读取和渲染流程，以 Linear 返回的 Project 为准。更新失败时明确告知并刷新数据，不要继续保持错误的成功状态。
- Linear 连接器目前没有暴露 Issue 的手工排序字段，因此不能声称同列排序已同步到 Linear。项目、优先级、状态和内容以 Linear 为权威；个人排序以本机看板状态为准。

## 迁移旧计划

插件升级前创建、但没有 `Codex 工作计划` 标签的旧 Issue 不会自动进入看板。只有用户明确要求迁移时才执行：

1. 列出候选 Issue，并让用户确认准确范围。
2. 读取每条 Issue 的现有标签。
3. 调用 `save_issue` 时保留所有现有标签，并追加 `Codex 工作计划`；`labels` 会替换完整标签集合，不能只传新标签导致旧标签丢失。
4. 迁移完成后重新加载看板。

## 边界

- 一次请求默认只创建一条 Issue；批量计划必须先列出将创建的条目并取得批量写入确认。
- 除固定的 `Codex 工作计划` 识别标签外，不自动创建 team、cycle、其他 label 或 milestone，也不更改现有 Issue。
- 不用 Project priority 代替 Issue priority；用户输入的优先级属于当前工作计划 Issue。
- 若项目名称存在多个候选、多个 team 或已归档 Project，必须消歧，不能猜。
- UI 不可用时，返回同一批计划的简短文字摘要，并说明当前宿主没有渲染 MCP Apps 面板；不要因此跳过 Linear 数据读取。
