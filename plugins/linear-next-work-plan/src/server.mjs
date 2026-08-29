import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import widgetHtml from "./widget.html";

const SERVER_VERSION = "0.2.0";
const TEMPLATE_URI = "ui://linear-next-work-plan/board.html";
const UNASSIGNED_KEY = "__unassigned__";

const projectValueSchema = z
  .union([
    z.string(),
    z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      url: z.string().url().optional(),
    }),
  ])
  .nullable()
  .optional();

const statusValueSchema = z
  .union([
    z.string(),
    z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      type: z.string().optional(),
    }),
  ])
  .nullable()
  .optional();

const issueSchema = z.object({
  id: z.string().min(1),
  identifier: z.string().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(4).nullable().optional(),
  project: projectValueSchema,
  projectId: z.string().nullable().optional(),
  team: z.union([z.string(), z.object({ id: z.string().optional(), name: z.string().optional() })]).nullable().optional(),
  teamId: z.string().nullable().optional(),
  status: statusValueSchema,
  statusType: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url().nullable().optional(),
});

const columnOrderSchema = z.object({
  projectKey: z.string().min(1),
  projectName: z.string().min(1),
  issueIds: z.array(z.string().min(1)).max(1000),
});

function stateDirectory() {
  const explicitDirectory = process.env.LINEAR_NEXT_WORK_PLAN_STATE_DIR;
  if (explicitDirectory) return explicitDirectory;

  const stateRoot = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".codex", "state");
  return path.join(stateRoot, "linear-next-work-plan");
}

function stateFile() {
  return path.join(stateDirectory(), "board-order.json");
}

async function loadOrder() {
  try {
    const payload = JSON.parse(await readFile(stateFile(), "utf8"));
    if (payload?.version !== 1 || typeof payload.columns !== "object" || payload.columns === null) {
      return {};
    }
    return payload.columns;
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error(`读取看板顺序失败：${error.message}`);
    }
    return {};
  }
}

async function persistOrder(columns) {
  const directory = stateDirectory();
  await mkdir(directory, { recursive: true });

  const normalizedColumns = {};
  const seenIssueIds = new Set();
  for (const column of columns) {
    const uniqueIds = [];
    for (const issueId of column.issueIds) {
      if (seenIssueIds.has(issueId)) continue;
      seenIssueIds.add(issueId);
      uniqueIds.push(issueId);
    }
    normalizedColumns[column.projectKey] = uniqueIds;
  }

  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    columns: normalizedColumns,
  };
  const target = stateFile();
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  return payload;
}

function objectName(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.name || "").trim();
}

function objectId(value) {
  if (!value || typeof value === "string") return "";
  return String(value.id || "").trim();
}

function normalizeProject(project) {
  return {
    id: project.id,
    key: project.id,
    name: project.name.trim(),
    url: project.url || null,
  };
}

function normalizeIssue(issue) {
  const projectName = objectName(issue.project) || "未分类";
  const projectId = issue.projectId || objectId(issue.project) || null;
  const projectKey = projectId || (projectName === "未分类" ? UNASSIGNED_KEY : `name:${projectName}`);
  const statusName = objectName(issue.status) || "未设置";
  const statusType = issue.statusType || (typeof issue.status === "object" ? issue.status?.type : null) || "unknown";
  const teamName = objectName(issue.team) || null;

  return {
    id: issue.id,
    identifier: issue.identifier || issue.id,
    title: issue.title.trim(),
    description: issue.description || null,
    priority: Number.isInteger(issue.priority) ? issue.priority : 0,
    projectId,
    projectKey,
    projectName,
    teamId: issue.teamId || objectId(issue.team) || null,
    teamName,
    statusName,
    statusType,
    url: issue.url || null,
    updatedAt: issue.updatedAt || null,
    dueDate: issue.dueDate || null,
  };
}

function defaultIssueSort(left, right) {
  const leftPriority = left.priority === 0 ? 5 : left.priority;
  const rightPriority = right.priority === 0 ? 5 : right.priority;
  if (leftPriority !== rightPriority) return leftPriority - rightPriority;

  const leftTime = Date.parse(left.updatedAt || "") || 0;
  const rightTime = Date.parse(right.updatedAt || "") || 0;
  if (leftTime !== rightTime) return rightTime - leftTime;
  return left.title.localeCompare(right.title, "zh-CN");
}

function applyStoredOrder(issues, issueIds) {
  if (!Array.isArray(issueIds) || issueIds.length === 0) {
    return [...issues].sort(defaultIssueSort);
  }

  const rank = new Map(issueIds.map((issueId, index) => [issueId, index]));
  return [...issues].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
    if (leftRank !== undefined) return -1;
    if (rightRank !== undefined) return 1;
    return defaultIssueSort(left, right);
  });
}

async function buildBoard(title, issues, projects) {
  const storedOrder = await loadOrder();
  const normalizedIssues = issues.map(normalizeIssue);
  const projectMap = new Map(projects.map((project) => [project.id, normalizeProject(project)]));

  for (const issue of normalizedIssues) {
    if (!projectMap.has(issue.projectKey)) {
      projectMap.set(issue.projectKey, {
        id: issue.projectId,
        key: issue.projectKey,
        name: issue.projectName,
        url: null,
      });
    }
  }

  const groupedIssues = new Map();
  for (const issue of normalizedIssues) {
    const bucket = groupedIssues.get(issue.projectKey) || [];
    bucket.push(issue);
    groupedIssues.set(issue.projectKey, bucket);
  }

  const columns = [...projectMap.values()]
    .sort((left, right) => {
      const leftHasIssues = (groupedIssues.get(left.key) || []).length > 0;
      const rightHasIssues = (groupedIssues.get(right.key) || []).length > 0;
      if (leftHasIssues !== rightHasIssues) return leftHasIssues ? -1 : 1;
      return left.name.localeCompare(right.name, "zh-CN");
    })
    .map((project) => ({
      ...project,
      issues: applyStoredOrder(groupedIssues.get(project.key) || [], storedOrder[project.key]),
    }));

  const activeCount = normalizedIssues.filter(
    (issue) => !["completed", "canceled"].includes(String(issue.statusType).toLowerCase()),
  ).length;

  return {
    version: 1,
    title: title || "下一步工作计划",
    generatedAt: new Date().toISOString(),
    summary: {
      total: normalizedIssues.length,
      active: activeCount,
      completed: normalizedIssues.length - activeCount,
      projects: columns.filter((column) => column.issues.length > 0).length,
    },
    columns,
  };
}

const server = new McpServer(
  {
    name: "linear-next-work-plan-board",
    version: SERVER_VERSION,
  },
  {
    capabilities: { resources: {}, tools: {} },
    instructions:
      "Use render_work_plan_board only after fetching Codex work-plan issues and Linear projects. " +
      "The render tool does not query Linear. save_board_order stores only the user's local board ordering.",
  },
);

server.registerResource("work-plan-board", TEMPLATE_URI, {}, async () => ({
  contents: [
    {
      uri: TEMPLATE_URI,
      mimeType: "text/html;profile=mcp-app",
      text: widgetHtml,
      _meta: {
        ui: { prefersBorder: false },
        "openai/widgetDescription": "按 Linear Project 分组的下一步工作计划看板，可筛选并拖动任务。",
        "openai/widgetPrefersBorder": false,
      },
    },
  ],
}));

server.registerTool(
  "render_work_plan_board",
  {
    title: "显示 Linear 工作计划看板",
    description:
      "把已从 Linear 获取的 Codex 工作计划 Issue 渲染成看板。调用前必须先用 Linear list_issues 获取带有“Codex 工作计划”标签的全部 Issue，并用 list_projects 获取可用项目。",
    inputSchema: {
      title: z.string().max(80).optional(),
      issues: z.array(issueSchema).max(1000),
      projects: z.array(projectSchema).max(250).default([]),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      ui: { resourceUri: TEMPLATE_URI },
      "openai/outputTemplate": TEMPLATE_URI,
      "openai/toolInvocation/invoking": "正在生成工作计划看板…",
      "openai/toolInvocation/invoked": "工作计划看板已生成",
    },
  },
  async ({ title, issues, projects }) => {
    const board = await buildBoard(title, issues, projects);
    return {
      structuredContent: board,
      content: [
        {
          type: "text",
          text: `已显示 ${board.summary.total} 条工作计划，分布在 ${board.summary.projects} 个项目类型中。`,
        },
      ],
    };
  },
);

server.registerTool(
  "save_board_order",
  {
    title: "保存工作计划看板顺序",
    description:
      "保存当前用户在 Codex 看板中的本地任务顺序，不修改 Linear Issue。跨项目移动仍需由 Linear save_issue 更新 Project。",
    inputSchema: {
      columns: z.array(columnOrderSchema).max(250),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    _meta: {
      "openai/toolInvocation/invoking": "正在保存看板顺序…",
      "openai/toolInvocation/invoked": "看板顺序已保存",
    },
  },
  async ({ columns }) => {
    const saved = await persistOrder(columns);
    return {
      structuredContent: {
        saved: true,
        updatedAt: saved.updatedAt,
        columnCount: columns.length,
      },
      content: [{ type: "text", text: "看板顺序已保存在本机 Codex 状态目录。" }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
