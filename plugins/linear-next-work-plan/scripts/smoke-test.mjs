import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const temporaryState = await mkdtemp(path.join(os.tmpdir(), "linear-work-plan-board-"));
const serverEntry = path.resolve("dist/server.mjs");
const client = new Client({ name: "linear-work-plan-board-smoke-test", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  env: {
    ...process.env,
    LINEAR_NEXT_WORK_PLAN_STATE_DIR: temporaryState,
  },
  stderr: "pipe",
});

try {
  await client.connect(transport);

  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map((tool) => tool.name).sort(),
    ["render_work_plan_board", "save_board_order"],
  );

  const resource = await client.readResource({ uri: "ui://linear-next-work-plan/board.html" });
  assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
  assert.match(resource.contents[0].text, /下一步工作计划/);
  assert.match(resource.contents[0].text, /pointerdown/);
  assert.match(resource.contents[0].text, /移到右侧项目/);

  const projects = [{ id: "project-admission", name: "招生模块", url: "https://linear.app/project/admission" }];
  const issues = [
    {
      id: "issue-high",
      identifier: "ENT-17",
      title: "完成线索查重回归并整理未通过项",
      priority: 2,
      project: { id: "project-admission", name: "招生模块" },
      status: { name: "进行中", type: "started" },
      url: "https://linear.app/issue/ENT-17",
    },
    {
      id: "issue-medium",
      identifier: "ENT-18",
      title: "整理招生回归结果",
      priority: 3,
      project: { id: "project-admission", name: "招生模块" },
      status: { name: "待处理", type: "unstarted" },
      url: "https://linear.app/issue/ENT-18",
    },
  ];

  const firstRender = await client.callTool({
    name: "render_work_plan_board",
    arguments: { title: "测试看板", issues, projects },
  });
  assert.equal(firstRender.structuredContent.summary.total, 2);
  assert.equal(firstRender.structuredContent.columns[0].issues[0].id, "issue-high");

  const saveResult = await client.callTool({
    name: "save_board_order",
    arguments: {
      columns: [
        {
          projectKey: "project-admission",
          projectName: "招生模块",
          issueIds: ["issue-medium", "issue-high"],
        },
      ],
    },
  });
  assert.equal(saveResult.structuredContent.saved, true);

  const secondRender = await client.callTool({
    name: "render_work_plan_board",
    arguments: { issues, projects },
  });
  assert.equal(secondRender.structuredContent.columns[0].issues[0].id, "issue-medium");

  process.stdout.write("MCP board smoke test passed\n");
} finally {
  await client.close();
  await rm(temporaryState, { recursive: true, force: true });
}
