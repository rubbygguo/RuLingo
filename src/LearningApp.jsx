import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Burger,
  Button,
  Card as MantineCard,
  Checkbox,
  Drawer,
  Group,
  NavLink,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack as MantineStack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  getProgressStoreName,
  loadDayCompletions,
  loadRangeCompletions,
  saveTaskCompletion,
  signOutProgressUser
} from "./progressStore.js";
import { todayPlan } from "./todayPlanData.js";

export default function LearningApp() {
  return <TodayPlanPage />;
}

export function TodayPlanPage() {
  return (
    <ResponsiveShell
      query=""
      setQuery={() => {}}
      activeSection="today"
      setActiveSection={() => {}}
      statusText={`今日计划 · 完成记录：${getProgressStoreName()}`}
      searchDisabled
    >
      <TodayWorkbench dailyPlan={todayPlan} />
    </ResponsiveShell>
  );
}

export function ResponsiveShell({
  children,
  query,
  setQuery,
  activeSection,
  setActiveSection,
  statusText,
  searchDisabled = false
}) {
  const [navOpened, { close: closeNav, toggle: toggleNav }] = useDisclosure(false);
  const navItems = getNavItems();

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <Burger
          opened={navOpened}
          onClick={toggleNav}
          aria-label={navOpened ? "关闭导航" : "打开导航"}
          color="#203040"
          size="sm"
        />
        <div className="mobile-brand">
          <span>RuLingo</span>
          <strong>{navItems.find((item) => item.id === activeSection)?.label || "RuLingo"}</strong>
        </div>
      </header>

      <aside className="sidebar desktop-sidebar">
        <SidebarContent
          query={query}
          setQuery={setQuery}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          statusText={statusText}
          searchDisabled={searchDisabled}
        />
      </aside>

      <Drawer
        opened={navOpened}
        onClose={closeNav}
        title="RuLingo"
        padding="md"
        size="min(86vw, 340px)"
        classNames={{ body: "mobile-drawer-body", header: "mobile-drawer-header" }}
      >
        <SidebarContent
          query={query}
          setQuery={setQuery}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          statusText={statusText}
          searchDisabled={searchDisabled}
          onNavigate={closeNav}
        />
      </Drawer>

      <main>{children}</main>
    </div>
  );
}

function SidebarContent({
  query,
  setQuery,
  activeSection,
  setActiveSection,
  statusText,
  searchDisabled,
  onNavigate
}) {
  const navItems = getNavItems();

  async function signOut() {
    await signOutProgressUser();
    window.location.replace(`${getBasePath()}login`);
  }

  return (
    <div className="sidebar-content">
      <div className="brand">
        <p className="eyebrow">Local English Learning System</p>
        <h1>RuLingo</h1>
      </div>

      {!searchDisabled && (
        <TextInput
          type="search"
          aria-label="搜索素材、表达、题目"
          placeholder="搜索素材、表达、题目"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          leftSection="⌕"
          className="sidebar-search"
        />
      )}

      <ScrollArea.Autosize mah="42vh" type="auto">
        <nav className="nav" aria-label="主导航">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              component="a"
              href={item.href}
              label={item.label}
              active={activeSection === item.id}
              onClick={() => {
                setActiveSection(item.id);
                onNavigate?.();
              }}
            />
          ))}
        </nav>
      </ScrollArea.Autosize>

      <div className="sidebar-note">{statusText}</div>
      <Button variant="subtle" color="gray" className="sidebar-logout" onClick={signOut} fullWidth>
        退出登录
      </Button>
    </div>
  );
}

function getNavItems() {
  const navItems = [
    ["today", "今日计划", "今日", `${getBasePath()}today`],
    ["daily-pack", "今日练习", "练习", `${getBasePath()}daily-pack`],
    ["memory", "语言记忆库", "记忆", `${getBasePath()}memory`]
  ];

  return navItems.map(([id, label, shortLabel, href]) => ({ id, label, shortLabel, href }));
}

export function TodayWorkbench({ dailyPlan }) {
  const todayKey = getTodayDateKey();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [rangeStart, setRangeStart] = useState(() => getStartOfWeekKey(todayKey));
  const [rangeEnd, setRangeEnd] = useState(() => getEndOfWeekKey(todayKey));
  const [completedTasks, setCompletedTasks] = useState({});
  const [rangeRecords, setRangeRecords] = useState([]);
  const [progressError, setProgressError] = useState("");
  const categories = dailyPlan?.categories || [];
  const taskCount = categories.reduce((sum, category) => sum + (category.tasks?.length || 0), 0);
  const completedCount = categories.reduce(
    (sum, category) =>
      sum + (category.tasks || []).filter((task) => completedTasks[getTaskKey(category.id, task.id)]).length,
    0
  );
  const stats = useMemo(
    () => buildRangeStats(categories, rangeStart, rangeEnd, rangeRecords),
    [categories, rangeStart, rangeEnd, rangeRecords]
  );

  useEffect(() => {
    if (!dailyPlan) return;
    let ignore = false;

    loadDayCompletions(selectedDate)
      .then((tasks) => {
        if (ignore) return;
        setCompletedTasks(tasks);
        setProgressError("");
      })
      .catch((error) => {
        console.error(error);
        if (!ignore) setProgressError(error.message || "完成记录读取失败");
      });

    return () => {
      ignore = true;
    };
  }, [dailyPlan, selectedDate]);

  useEffect(() => {
    if (!dailyPlan) return;
    let ignore = false;

    loadRangeCompletions(rangeStart, rangeEnd)
      .then((records) => {
        if (ignore) return;
        setRangeRecords(records);
        setProgressError("");
      })
      .catch((error) => {
        console.error(error);
        if (!ignore) setProgressError(error.message || "统计记录读取失败");
      });

    return () => {
      ignore = true;
    };
  }, [dailyPlan, rangeStart, rangeEnd, completedTasks]);

  if (!dailyPlan) {
    return (
      <section id="today" className="workbench">
        <div className="panel">正在读取今日计划...</div>
      </section>
    );
  }

  function toggleTask(categoryId, taskId) {
    const taskKey = getTaskKey(categoryId, taskId);
    setCompletedTasks((current) => {
      const next = { ...current, [taskKey]: !current[taskKey] };
      saveTaskCompletion({
        dateKey: selectedDate,
        categoryId,
        taskId,
        completed: next[taskKey]
      }).catch((error) => {
        console.error(error);
        setProgressError(error.message || "完成记录保存失败");
      });
      return next;
    });
  }

  function moveSelectedDate(offset) {
    setSelectedDate((current) => addDaysKey(current, offset));
  }

  function applyRangePreset(preset) {
    if (preset === "week") {
      setRangeStart(getStartOfWeekKey(selectedDate));
      setRangeEnd(getEndOfWeekKey(selectedDate));
      return;
    }

    if (preset === "month") {
      setRangeStart(getStartOfMonthKey(selectedDate));
      setRangeEnd(getEndOfMonthKey(selectedDate));
      return;
    }

    setRangeStart(addDaysKey(selectedDate, -6));
    setRangeEnd(selectedDate);
  }

  return (
    <section id="today" className="workbench">
      <div className="page-title">
        <div>
          <p className="eyebrow">每日学习入口</p>
          <h2>{formatDate(selectedDate)} · 听说读写</h2>
        </div>
        <span className="status-pill">{completedCount}/{taskCount} 已完成</span>
      </div>
      {progressError && <div className="inline-alert">{progressError}</div>}

      <Paper component="section" className="panel calendar-panel compact-date-panel" withBorder shadow="sm" radius="md" p="md">
        <Group justify="space-between" align="flex-end" gap="sm" wrap="wrap" className="compact-date-bar">
          <div className="compact-date-title">
            <p className="eyebrow">Calendar</p>
            <h3>切换日期</h3>
          </div>
          <Group gap="xs" wrap="nowrap" className="date-controls compact-date-controls">
            <Button variant="default" px="xs" onClick={() => moveSelectedDate(-1)} aria-label="前一天">‹</Button>
            <TextInput
              type="date"
              aria-label="待办日期"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.currentTarget.value || todayKey)}
              className="compact-date-input"
            />
            <Button variant="default" px="xs" onClick={() => moveSelectedDate(1)} aria-label="后一天">›</Button>
            <Button variant="light" color="teal" onClick={() => setSelectedDate(todayKey)}>今天</Button>
          </Group>
        </Group>
      </Paper>

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
              <p className="eyebrow">Stats</p>
              <h3>完成统计</h3>
            </div>
          </div>
          <div className="stats-controls">
            <div className="segmented">
              <button type="button" onClick={() => applyRangePreset("week")}>本周</button>
              <button type="button" onClick={() => applyRangePreset("month")}>本月</button>
              <button type="button" onClick={() => applyRangePreset("recent")}>近 7 天</button>
            </div>
            <div className="range-fields">
              <label className="date-field">
                <span>开始</span>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(event) => setRangeStart(event.target.value || rangeStart)}
                />
              </label>
              <label className="date-field">
                <span>结束</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(event) => setRangeEnd(event.target.value || rangeEnd)}
                />
              </label>
            </div>
          </div>
          <div className="stats-summary">
            <div>
              <strong>{stats.completedTasks}</strong>
              <span>已完成任务</span>
            </div>
            <div>
              <strong>{stats.totalTasks}</strong>
              <span>范围内任务</span>
            </div>
            <div>
              <strong>{stats.completionRate}%</strong>
              <span>完成率</span>
            </div>
          </div>
          <Progress
            value={stats.completionRate}
            color="teal"
            radius="xl"
            mt="md"
            aria-label="日期范围完成率"
          />
          <div className="stack">
            <Mini title={`${formatDate(rangeStart)} - ${formatDate(rangeEnd)}`}>
              已按 {stats.dayCount} 天统计，数据源：{getProgressStoreName()}。
            </Mini>
            {stats.byCategory.map((category) => (
              <Mini key={category.id} title={`${category.title}：${category.completed}/${category.total}`}>
                完成率 {category.completionRate}%。
              </Mini>
            ))}
          </div>
        </Paper>
      </SimpleGrid>
    </section>
  );
}

function TaskCategory({ category, completedTasks, onToggleTask }) {
  const tasks = category.tasks || [];
  const completedCount = tasks.filter((task) => completedTasks[getTaskKey(category.id, task.id)]).length;

  return (
    <MantineCard component="article" className="task-category" withBorder radius="md" padding="md">
      <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap" className="task-category-head">
        <div className="task-category-copy">
          <Title order={4} size="h4">{category.title}</Title>
          <Text c="dimmed" size="sm">{category.description}</Text>
        </div>
        <Badge color="blue" variant="light" className="task-count-badge">
          {completedCount}/{tasks.length}
        </Badge>
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

function getTaskKey(categoryId, taskId) {
  return `${categoryId}:${taskId}`;
}

function getTodayDateKey() {
  const today = new Date();
  return dateToKey(today);
}

function buildRangeStats(categories, startKey, endKey, rangeRecords) {
  const dates = getDateRangeKeys(startKey, endKey);
  const byCategory = categories.map((category) => {
    const tasks = category.tasks || [];
    const completed = dates.reduce(
      (sum, dateKey) =>
        sum +
        tasks.filter((task) =>
          rangeRecords.some(
            (record) =>
              record.dateKey === dateKey &&
              record.categoryId === category.id &&
              record.taskId === task.id &&
              record.completed
          )
        ).length,
      0
    );
    const total = dates.length * tasks.length;

    return {
      id: category.id,
      title: category.title,
      completed,
      total,
      completionRate: getCompletionRate(completed, total)
    };
  });
  const completedTasks = byCategory.reduce((sum, category) => sum + category.completed, 0);
  const totalTasks = byCategory.reduce((sum, category) => sum + category.total, 0);

  return {
    dayCount: dates.length,
    completedTasks,
    totalTasks,
    completionRate: getCompletionRate(completedTasks, totalTasks),
    byCategory
  };
}

function getCompletionRate(completed, total) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

function getDateRangeKeys(startKey, endKey) {
  const startDate = parseDateKey(startKey);
  const endDate = parseDateKey(endKey);
  if (!startDate || !endDate) return [];

  const first = startDate <= endDate ? startDate : endDate;
  const last = startDate <= endDate ? endDate : startDate;
  const dates = [];
  let cursor = new Date(first);

  while (cursor <= last) {
    dates.push(dateToKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function getStartOfWeekKey(dateKey) {
  const date = parseDateKey(dateKey) || new Date();
  const day = date.getDay() || 7;
  return dateToKey(addDays(date, 1 - day));
}

function getEndOfWeekKey(dateKey) {
  const start = parseDateKey(getStartOfWeekKey(dateKey));
  return dateToKey(addDays(start, 6));
}

function getStartOfMonthKey(dateKey) {
  const date = parseDateKey(dateKey) || new Date();
  return dateToKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getEndOfMonthKey(dateKey) {
  const date = parseDateKey(dateKey) || new Date();
  return dateToKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function addDaysKey(dateKey, offset) {
  const date = parseDateKey(dateKey) || new Date();
  return dateToKey(addDays(date, offset));
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function parseDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBasePath() {
  return "/";
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
