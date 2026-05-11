import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card as MantineCard,
  Checkbox,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack as MantineStack,
  Text,
  Title
} from "@mantine/core";
import { loadLearningData } from "./dataClient.js";

const emptyData = {
  settings: null,
  taxonomy: null,
  routines: [],
  weekly: [],
  milestones: [],
  dailyPlan: null,
  materials: [],
  expressions: [],
  practices: [],
  writings: [],
  writingGuidance: null,
  checkinTemplates: []
};

export default function LearningApp() {
  const [data, setData] = useState(emptyData);
  const [status, setStatus] = useState("loading");
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedPracticeDuration, setSelectedPracticeDuration] = useState("all");
  const [activeSection, setActiveSection] = useState("today");

  useEffect(() => {
    let ignore = false;

    loadLearningData()
      .then((result) => {
        if (ignore) return;
        setData(result);
        setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!ignore) setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, []);

  const searchText = query.trim().toLowerCase();
  const materialTags = useMemo(
    () => Array.from(new Set(data.materials.flatMap((material) => material.tags))).slice(0, 10),
    [data.materials]
  );
  const practiceDurations = useMemo(
    () => ["all", ...Array.from(new Set(data.practices.map((practice) => practice.duration)))],
    [data.practices]
  );
  const filteredMaterials = data.materials.filter(
    (material) => matchesQuery(material, searchText) && matchesTag(material, selectedTag)
  );
  const filteredExpressions = data.expressions.filter(
    (expression) => matchesQuery(expression, searchText) && matchesTag(expression, selectedTag)
  );
  const filteredPractices = data.practices.filter(
    (practice) =>
      matchesQuery(practice, searchText) &&
      (selectedPracticeDuration === "all" || practice.duration === selectedPracticeDuration)
  );
  const hasSearchResults =
    filteredMaterials.length + filteredExpressions.length + filteredPractices.length > 0;

  return (
    <div className="app-shell">
      <Sidebar
        query={query}
        setQuery={setQuery}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        statusText={getStatusText(status, data)}
      />

      <main>
        {status === "error" && (
          <div className="empty-state">
            数据读取失败。请运行开发服务器后访问 <strong>http://localhost:4173/site/</strong>。
          </div>
        )}

        {status !== "error" && (
          <>
            <TodayWorkbench data={data} />
            <MaterialsSection
              materials={filteredMaterials}
              expressions={data.expressions}
              tags={materialTags}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
            />
            <ExpressionsSection expressions={filteredExpressions} materials={data.materials} />
            <PracticesSection
              practices={filteredPractices}
              durations={practiceDurations}
              selectedPracticeDuration={selectedPracticeDuration}
              setSelectedPracticeDuration={setSelectedPracticeDuration}
            />
            <WritingSection writings={data.writings} writingGuidance={data.writingGuidance} />
            <ReviewSection checkinTemplates={data.checkinTemplates} milestones={data.milestones} />
            {searchText && !hasSearchResults && (
              <div className="empty-state">没有找到匹配内容，换一个关键词或标签试试。</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Sidebar({ query, setQuery, activeSection, setActiveSection, statusText }) {
  const navItems = [
    ["today", "今日工作台"],
    ["materials", "素材库"],
    ["expressions", "表达库"],
    ["practices", "练习库"],
    ["writing", "写作"],
    ["review", "复盘"]
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <p className="eyebrow">Local English Learning System</p>
        <h1>英文提升</h1>
      </div>

      <label className="search-box">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="搜索素材、表达、题目"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <nav className="nav" aria-label="主导航">
        {navItems.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className={activeSection === id ? "active" : ""}
            onClick={() => setActiveSection(id)}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="sidebar-note">{statusText}</div>
    </aside>
  );
}

function TodayWorkbench({ data }) {
  const { dailyPlan } = data;
  const todayKey = getTodayDateKey();
  const completionKey = dailyPlan ? `daily-plan-completions:${todayKey}` : "";
  const [completedTasks, setCompletedTasks] = useState({});

  useEffect(() => {
    if (!completionKey) return;
    const saved = window.localStorage.getItem(completionKey);
    try {
      setCompletedTasks(saved ? JSON.parse(saved) : {});
    } catch {
      setCompletedTasks({});
    }
  }, [completionKey]);

  if (!dailyPlan) {
    return (
      <section id="today" className="workbench">
        <div className="panel">正在读取今日计划...</div>
      </section>
    );
  }

  const categories = dailyPlan.categories || [];
  const taskCount = categories.reduce((sum, category) => sum + (category.tasks?.length || 0), 0);
  const completedCount = categories.reduce(
    (sum, category) =>
      sum + (category.tasks || []).filter((task) => completedTasks[getTaskKey(category.id, task.id)]).length,
    0
  );

  function toggleTask(categoryId, taskId) {
    const taskKey = getTaskKey(categoryId, taskId);
    setCompletedTasks((current) => {
      const next = { ...current, [taskKey]: !current[taskKey] };
      window.localStorage.setItem(completionKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <section id="today" className="workbench">
      <div className="page-title">
        <div>
          <p className="eyebrow">今日学习入口</p>
          <h2>{formatDate(todayKey)} · 听说读写</h2>
        </div>
        <span className="status-pill">{completedCount}/{taskCount} 已完成</span>
      </div>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" className="dashboard-grid mantine-dashboard">
        <Paper component="section" className="panel today-plan" withBorder shadow="sm" radius="md" p="lg">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Plan</p>
              <h3>今日计划</h3>
            </div>
            <Badge color="teal" variant="light">{dailyPlan.status}</Badge>
          </div>
          <Progress
            value={taskCount ? (completedCount / taskCount) * 100 : 0}
            color="teal"
            radius="xl"
            mt="md"
            aria-label="今日计划完成进度"
          />
          <div className="category-list">
            {categories.map((category) => (
              <TaskCategory
                key={category.id}
                category={category}
                completedTasks={completedTasks}
                onToggleTask={toggleTask}
              />
            ))}
          </div>
        </Paper>

        <Paper component="section" className="panel focus-panel" withBorder shadow="sm" radius="md" p="lg">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Focus</p>
              <h3>当前重点</h3>
            </div>
          </div>
          <div className="stack">
            <Mini title={dailyPlan.focus}>任务项已经固化在系统里。除非你明确要求新增、删除或调整任务，否则每天沿用同一套清单。</Mini>
            <Mini title="记录方式">每天只记录当天每个任务是否完成，后续可以按周或按月统计完成情况。</Mini>
          </div>
        </Paper>
      </SimpleGrid>
    </section>
  );
}

function MaterialsSection({ materials, expressions, tags, selectedTag, setSelectedTag }) {
  return (
    <section id="materials" className="content-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Input</p>
          <h2>素材库</h2>
        </div>
        <div className="filters" aria-label="标签筛选">
          {["all", ...tags].map((tag) => (
            <button
              key={tag}
              type="button"
              className={tag === selectedTag ? "active" : ""}
              onClick={() => setSelectedTag(tag)}
            >
              {tag === "all" ? "全部" : tag}
            </button>
          ))}
        </div>
      </div>

      <div className="list-grid">
        {materials.map((material) => (
          <MaterialCard key={material.id} material={material} expressions={expressions} />
        ))}
      </div>
    </section>
  );
}

function MaterialCard({ material, expressions }) {
  const related = expressions.filter((expression) => material.expressionIds.includes(expression.id));

  return (
    <article className="card">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{material.date} · {material.type}</p>
          <h3>{material.title}</h3>
        </div>
        <span className="source-pill">{material.durationMinutes} min</span>
      </div>
      <div className="meta-row">{material.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
      <div className="card-body markdown" dangerouslySetInnerHTML={{ __html: markdownToHTML(material.content) }} />
      <div className="prompt"><strong>Speaking</strong><br />{material.tasks.speaking}</div>
      <div className="prompt"><strong>Writing</strong><br />{material.tasks.writing}</div>
      <div className="meta-row">
        {related.slice(0, 6).map((expression) => <Tag key={expression.id}>{expression.text}</Tag>)}
      </div>
    </article>
  );
}

function ExpressionsSection({ expressions, materials }) {
  return (
    <section id="expressions" className="content-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Reuse</p>
          <h2>表达库</h2>
        </div>
        <span className="count">{expressions.length} items</span>
      </div>
      <div className="expression-grid">
        {expressions.map((expression) => {
          const material = materials.find((item) => item.id === expression.sourceMaterialId);
          return (
            <article key={expression.id} className="expression-card">
              <p className="eyebrow">{expression.category || "Expression"}</p>
              <h3>{expression.text}</h3>
              <p>{expression.meaning}</p>
              <div className="prompt">{expression.example || "Add your own example."}</div>
              <div className="meta-row">
                {expression.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                {material && <span className="source-pill">{material.title}</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PracticesSection({ practices, durations, selectedPracticeDuration, setSelectedPracticeDuration }) {
  return (
    <section id="practices" className="content-section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Output</p>
          <h2>口语和课程练习</h2>
        </div>
        <div className="segmented">
          {durations.map((duration) => (
            <button
              key={duration}
              type="button"
              className={duration === selectedPracticeDuration ? "active" : ""}
              onClick={() => setSelectedPracticeDuration(duration)}
            >
              {duration === "all" ? "全部" : duration}
            </button>
          ))}
        </div>
      </div>
      <div className="list-grid compact">
        {practices.map((practice) => (
          <article key={practice.id} className="card">
            <p className="eyebrow">{practice.duration} · {practice.type}</p>
            <h3>{practice.title}</h3>
            <div className="prompt">{practice.prompt}</div>
            <ul className="frame-list">
              {practice.frames.map((frame) => <li key={frame}>{frame}</li>)}
            </ul>
            <div className="meta-row">{practice.tags.slice(0, 4).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WritingSection({ writings, writingGuidance }) {
  return (
    <section id="writing" className="content-section two-column">
      <div>
        <p className="eyebrow">Writing</p>
        <h2>写作练习</h2>
        <div className="stack">
          {writings.map((writing) => <Mini key={writing.id} title={writing.title}>{writing.prompt}</Mini>)}
        </div>
      </div>
      <div className="panel">
        <p className="eyebrow">Revision</p>
        <h3>三层修改</h3>
        <div className="stack">
          {(writingGuidance?.revisionLayers || []).map((layer) => (
            <Mini key={layer.name} title={layer.name}>{layer.description}</Mini>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewSection({ checkinTemplates, milestones }) {
  return (
    <section id="review" className="content-section two-column">
      <div>
        <p className="eyebrow">Check-in</p>
        <h2>复盘模板</h2>
        <div className="stack">
          {checkinTemplates.map((template) => (
            <Mini key={template.id} title={template.title}>{template.fields.join(" / ")}</Mini>
          ))}
        </div>
      </div>
      <div className="panel">
        <p className="eyebrow">Growth</p>
        <h3>30 天阶段目标</h3>
        <div className="stack">
          {milestones.map((milestone) => (
            <Mini key={milestone.week} title={`第 ${milestone.week} 周：${milestone.title}`}>
              {milestone.goal}
            </Mini>
          ))}
        </div>
      </div>
    </section>
  );
}

function TaskCategory({ category, completedTasks, onToggleTask }) {
  const tasks = category.tasks || [];
  const completedCount = tasks.filter((task) => completedTasks[getTaskKey(category.id, task.id)]).length;

  return (
    <MantineCard component="article" className="task-category" withBorder radius="md" padding="md">
      <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
        <div>
          <Title order={4} size="h4">{category.title}</Title>
          <Text c="dimmed" size="sm">{category.description}</Text>
        </div>
        <Badge color="blue" variant="light">{completedCount}/{tasks.length}</Badge>
      </Group>
      <MantineStack gap="sm" mt="md">
        {tasks.length === 0 && <Text c="dimmed" size="sm">这个分类下还没有固定任务。</Text>}
        {tasks.map((task) => {
          const taskKey = getTaskKey(category.id, task.id);
          const checked = Boolean(completedTasks[taskKey]);

          return (
            <Checkbox
              key={task.id}
              checked={checked}
              onChange={() => onToggleTask(category.id, task.id)}
              className={checked ? "is-complete" : ""}
              label={
                <span className="task-check-label">
                  <strong>{task.title}</strong>
                  {task.note && <small>{task.note}</small>}
                </span>
              }
            />
          );
        })}
      </MantineStack>
    </MantineCard>
  );
}

function Mini({ title, children }) {
  return (
    <article className="mini">
      <h4>{title}</h4>
      <p>{children}</p>
    </article>
  );
}

function Tag({ children }) {
  return <span className="tag">{children}</span>;
}

function getTaskKey(categoryId, taskId) {
  return `${categoryId}:${taskId}`;
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStatusText(status, data) {
  if (status === "loading") return "正在读取本地数据...";
  if (status === "error") return "本地数据读取失败";
  return `已读取 ${data.materials.length} 份素材、${data.expressions.length} 个表达、${data.practices.length} 个练习`;
}

function matchesTag(item, selectedTag) {
  return selectedTag === "all" || item.tags?.includes(selectedTag);
}

function matchesQuery(item, query) {
  if (!query) return true;
  return JSON.stringify(item).toLowerCase().includes(query);
}

function markdownToHTML(markdown) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => {
      const text = block.trim();
      if (!text) return "";
      if (text.startsWith("# ")) return `<h1>${escapeHTML(text.slice(2))}</h1>`;
      if (text.startsWith("## ")) return `<h2>${escapeHTML(text.slice(3))}</h2>`;
      if (text.startsWith("### ")) return `<h3>${escapeHTML(text.slice(4))}</h3>`;
      return `<p>${escapeHTML(text).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

function formatDate(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
