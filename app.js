(function () {
  "use strict";

  const paths = {
    agents: "./data/agents.json",
    tasks: "./data/tasks.json",
    runs: "./data/runs.json",
    outputs: "./data/outputs.json",
    knowledge: "./data/knowledge-index.json",
    buildLog: "./logs/build-log.md"
  };

  const statusLabels = {
    idle: "待命",
    running: "稼働中",
    waiting: "確認待ち",
    blocked: "停滞",
    completed: "完了",
    archived: "保管"
  };

  const selectors = {
    lastUpdated: "#last-updated",
    summaryRunning: "#summary-running",
    summaryBlocked: "#summary-blocked",
    summaryCompleted: "#summary-completed",
    summaryOutputs: "#summary-outputs",
    blockedPanel: "#blocked-panel",
    blockedList: "#blocked-list",
    agentGroups: "#agent-groups",
    todayTasks: "#today-tasks",
    todayOutputs: "#today-outputs",
    buildLog: "#build-log",
    knowledgeStatus: "#knowledge-status",
    nextActions: "#next-actions",
    repoLink: "#repo-link"
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const [agentsData, tasksData, runsData, outputsData, knowledgeData, buildLogText] = await Promise.all([
      fetchJson(paths.agents),
      fetchJson(paths.tasks),
      fetchJson(paths.runs),
      fetchJson(paths.outputs),
      fetchJson(paths.knowledge),
      fetchText(paths.buildLog)
    ]);

    const state = {
      agents: Array.isArray(agentsData?.agents) ? agentsData.agents : [],
      tasks: Array.isArray(tasksData?.tasks) ? tasksData.tasks : [],
      runs: Array.isArray(runsData?.runs) ? runsData.runs : [],
      outputs: Array.isArray(outputsData?.outputs) ? outputsData.outputs : [],
      knowledge: knowledgeData && typeof knowledgeData === "object" ? knowledgeData : null,
      buildLog: typeof buildLogText === "string" ? buildLogText : "",
      agentsUpdated: agentsData?.updated || null
    };

    renderHeader(state);
    renderBlockedPanel(state);
    renderAgents(state);
    renderToday(state);
    renderBuildLog(state.buildLog);
    renderKnowledge(state.knowledge);
    renderFooter(state);
  }

  async function fetchJson(path) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn(`Failed to load ${path}`, error);
      return null;
    }
  }

  async function fetchText(path) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) return "";
      return await response.text();
    } catch (error) {
      console.warn(`Failed to load ${path}`, error);
      return "";
    }
  }

  function renderHeader(state) {
    const today = getTodayKey();
    const activeAgents = state.agents.filter((agent) => agent.status !== "archived");
    const blockedTasks = state.tasks.filter((task) => task.status === "blocked");
    const completedToday = state.tasks.filter((task) => {
      return task.status === "completed" && dateKey(task.updated) === today;
    });

    setText(selectors.lastUpdated, state.agentsUpdated ? `更新: ${formatDateTime(state.agentsUpdated)}` : "");
    setText(selectors.summaryRunning, activeAgents.filter((agent) => agent.status === "running").length);
    setText(selectors.summaryBlocked, blockedTasks.length);
    setText(selectors.summaryCompleted, completedToday.length);
    setText(selectors.summaryOutputs, state.outputs.length);
  }

  function renderBlockedPanel(state) {
    const panel = qs(selectors.blockedPanel);
    const list = qs(selectors.blockedList);
    if (!panel || !list) return;

    clear(list);
    const blockedTasks = state.tasks.filter((task) => task.status === "blocked");
    panel.classList.toggle("is-hidden", blockedTasks.length === 0);

    blockedTasks.forEach((task) => {
      list.appendChild(createItemCard({
        title: task.title,
        meta: `${task.id} / ${task.department || "部署未設定"}`,
        badge: task.status,
        rows: [
          ["理由", task.blocked_reason || "理由未記録"],
          ["次の一手", task.next_action || "未設定"]
        ]
      }));
    });
  }

  function renderAgents(state) {
    const container = qs(selectors.agentGroups);
    if (!container) return;
    clear(container);

    const agents = state.agents.filter((agent) => agent.status !== "archived");
    if (agents.length === 0) {
      container.appendChild(emptyMessage("社員データは未取得です。"));
      return;
    }

    const tasksById = new Map(state.tasks.map((task) => [task.id, task]));
    const outputByAgent = getLatestPublicOutputsByAgent(state.outputs);
    const groups = groupBy(agents, (agent) => agent.department || "未設定");

    Object.entries(groups).forEach(([department, departmentAgents]) => {
      const group = document.createElement("section");
      group.className = "department-group";

      const title = document.createElement("h3");
      title.className = "department-title";
      title.textContent = department;

      const grid = document.createElement("div");
      grid.className = "agent-grid";

      departmentAgents.forEach((agent) => {
        const task = agent.current_task_id ? tasksById.get(agent.current_task_id) : null;
        const output = outputByAgent.get(agent.id);
        grid.appendChild(createAgentCard(agent, task, output));
      });

      group.append(title, grid);
      container.appendChild(group);
    });
  }

  function createAgentCard(agent, task, output) {
    const card = document.createElement("article");
    card.className = "agent-card";

    const top = document.createElement("div");
    top.className = "card-top";

    const nameWrap = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = agent.name || agent.id || "名前未設定";
    const role = document.createElement("p");
    role.className = "role muted";
    role.textContent = agent.role || "役割未設定";
    nameWrap.append(name, role);

    top.append(nameWrap, createBadge(agent.status));
    card.appendChild(top);

    appendCardRow(card, "現在タスク", task?.title || "割り当てなし");
    appendCardRow(card, "最終稼働", agent.last_run ? formatDateTime(agent.last_run) : "未稼働");

    const outputRow = document.createElement("div");
    outputRow.className = "card-row";
    const label = document.createElement("span");
    label.textContent = "最新出力";
    const value = document.createElement("strong");
    if (output?.link) {
      const link = document.createElement("a");
      link.href = output.link;
      link.textContent = output.title || output.link;
      value.appendChild(link);
    } else {
      value.textContent = "公開出力なし";
    }
    outputRow.append(label, value);
    card.appendChild(outputRow);

    return card;
  }

  function renderToday(state) {
    const today = getTodayKey();
    const taskContainer = qs(selectors.todayTasks);
    const outputContainer = qs(selectors.todayOutputs);
    if (taskContainer) {
      clear(taskContainer);
      const todayTasks = state.tasks.filter((task) => task.created === today || dateKey(task.updated) === today);
      if (todayTasks.length === 0) {
        taskContainer.appendChild(emptyMessage("今日のタスクはありません。"));
      } else {
        todayTasks.forEach((task) => {
          taskContainer.appendChild(createItemCard({
            title: task.title,
            meta: `${task.id} / ${task.department || "部署未設定"}`,
            badge: task.status,
            rows: [
              ["出力", task.output || "未設定"],
              ["人間確認", task.human_check || "未設定"]
            ]
          }));
        });
      }
    }

    if (outputContainer) {
      clear(outputContainer);
      const todayOutputs = state.outputs.filter((output) => output.date === today);
      if (todayOutputs.length === 0) {
        outputContainer.appendChild(emptyMessage("今日の成果物はありません。"));
      } else {
        todayOutputs.forEach((output) => {
          outputContainer.appendChild(createOutputCard(output));
        });
      }
    }
  }

  function createOutputCard(output) {
    const rows = [
      ["種別", output.type || "未設定"],
      ["公開", output.public ? "public" : "private"]
    ];

    const card = createItemCard({
      title: output.title,
      meta: output.date || "日付未設定",
      rows
    });

    if (output.public && output.link) {
      const linkRow = document.createElement("div");
      linkRow.className = "card-row";
      const label = document.createElement("span");
      label.textContent = "リンク";
      const value = document.createElement("strong");
      const link = document.createElement("a");
      link.href = output.link;
      link.textContent = output.link;
      value.appendChild(link);
      linkRow.append(label, value);
      card.appendChild(linkRow);
    }

    return card;
  }

  function renderBuildLog(text) {
    const container = qs(selectors.buildLog);
    if (!container) return;

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "))
      .slice(0, 20);

    container.textContent = lines.length ? lines.join("\n") : "";
  }

  function renderKnowledge(knowledge) {
    const container = qs(selectors.knowledgeStatus);
    if (!container) return;
    clear(container);

    if (!knowledge) {
      container.appendChild(emptyMessage("ナレッジデータは未取得です。"));
      return;
    }

    const counts = knowledge.counts && typeof knowledge.counts === "object" ? knowledge.counts : {};
    const countGrid = document.createElement("div");
    countGrid.className = "knowledge-grid";
    Object.entries(counts).forEach(([key, value]) => {
      const item = document.createElement("div");
      item.className = "knowledge-count";
      const label = document.createElement("span");
      label.textContent = key;
      const count = document.createElement("strong");
      count.textContent = value;
      item.append(label, count);
      countGrid.appendChild(item);
    });
    container.appendChild(countGrid);

    const recent = Array.isArray(knowledge.recent) ? knowledge.recent.slice(0, 5) : [];
    const recentStack = document.createElement("div");
    recentStack.className = "stack";

    if (recent.length === 0) {
      recentStack.appendChild(emptyMessage("直近更新はありません。"));
    } else {
      recent.forEach((entry) => {
        recentStack.appendChild(createItemCard({
          title: entry.title || "タイトル未設定",
          meta: `${entry.date || "日付未設定"} / ${entry.type || "種別未設定"}`
        }));
      });
    }

    if (knowledge.note) {
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = knowledge.note;
      container.appendChild(note);
    }

    container.appendChild(recentStack);
  }

  function renderFooter(state) {
    const container = qs(selectors.nextActions);
    if (container) {
      clear(container);
      const actions = state.tasks.filter((task) => task.next_action);
      if (actions.length === 0) {
        container.appendChild(emptyMessage("次のアクションはありません。"));
      } else {
        actions.forEach((task) => {
          container.appendChild(createItemCard({
            title: task.next_action,
            meta: `${task.id} / ${task.title}`,
            badge: task.status
          }));
        });
      }
    }

    const repoLink = qs(selectors.repoLink);
    const repoRun = state.runs.find((run) => typeof run.output_link === "string" && run.output_link.includes("github.com"));
    if (repoLink && repoRun?.output_link) {
      repoLink.href = repoRun.output_link;
    }
  }

  function createItemCard(options) {
    const card = document.createElement("article");
    card.className = "item-card";

    const top = document.createElement("div");
    top.className = "item-top";

    const textWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = options.title || "タイトル未設定";
    textWrap.appendChild(title);

    if (options.meta) {
      const meta = document.createElement("p");
      meta.className = "muted";
      meta.textContent = options.meta;
      textWrap.appendChild(meta);
    }

    top.appendChild(textWrap);
    if (options.badge) {
      top.appendChild(createBadge(options.badge));
    }
    card.appendChild(top);

    (options.rows || []).forEach(([label, value]) => appendCardRow(card, label, value));
    return card;
  }

  function createBadge(status) {
    const badge = document.createElement("span");
    const safeStatus = statusLabels[status] ? status : "idle";
    badge.className = `badge status-${safeStatus}`;
    badge.textContent = statusLabels[safeStatus];
    return badge;
  }

  function appendCardRow(parent, labelText, valueText) {
    const row = document.createElement("div");
    row.className = "card-row";
    const label = document.createElement("span");
    label.textContent = labelText;
    const value = document.createElement("strong");
    value.textContent = valueText || "未設定";
    row.append(label, value);
    parent.appendChild(row);
  }

  function getLatestPublicOutputsByAgent(outputs) {
    const sorted = outputs
      .filter((output) => output.public && output.agent_id)
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const byAgent = new Map();
    sorted.forEach((output) => {
      if (!byAgent.has(output.agent_id)) {
        byAgent.set(output.agent_id, output);
      }
    });
    return byAgent;
  }

  function groupBy(items, getKey) {
    return items.reduce((groups, item) => {
      const key = getKey(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  function getTodayKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function dateKey(value) {
    if (!value || typeof value !== "string") return "";
    return value.slice(0, 10);
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function emptyMessage(message) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = message;
    return p;
  }

  function setText(selector, value) {
    const element = qs(selector);
    if (element) element.textContent = value;
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function clear(element) {
    element.replaceChildren();
  }
})();
