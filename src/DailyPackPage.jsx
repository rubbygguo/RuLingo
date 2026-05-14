import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  CopyButton,
  Divider,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title
} from "@mantine/core";
import { loadDailyPackSnapshot } from "./dailyPackClient.js";
import { ResponsiveShell } from "./LearningApp.jsx";
import { mockDailyPackSnapshot } from "./mockDailyPackData.js";

const useMockDailyPack = false;

export function DailyPackPage() {
  const todayKey = getTodayDateKey();
  const responseStoreKey = useMockDailyPack
    ? `rulingo:daily-pack:${mockDailyPackSnapshot.date}:mock:responses`
    : `rulingo:daily-pack:${todayKey}:responses`;
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    if (useMockDailyPack) {
      setSnapshot(mockDailyPackSnapshot);
      setStatus("mock");
      return undefined;
    }

    let ignore = false;

    loadDailyPackSnapshot(todayKey)
      .then((result) => {
        if (ignore) return;
        setSnapshot(result);
        setStatus(result ? "ready" : "empty");
      })
      .catch((error) => {
        console.error(error);
        if (!ignore) {
          setLoadError(error);
          setStatus(error.code === "cloudbase_not_configured" ? "not-configured" : "error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [todayKey]);

  useEffect(() => {
    const saved = window.localStorage.getItem(responseStoreKey);
    if (saved) setResponses(JSON.parse(saved));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(responseStoreKey, JSON.stringify(responses));
  }, [responses]);

  const pack = snapshot?.packJson;
  const completion = useMemo(() => getCompletion(pack, responses), [pack, responses]);

  return (
    <ResponsiveShell
      query=""
      setQuery={() => {}}
      activeSection="daily-pack"
      setActiveSection={() => {}}
      statusText={getStatusText(status, pack, completion)}
      searchDisabled
    >
      {status === "error" && (
        <Alert color="red" variant="light" radius="md">
          今日练习读取失败：{loadError?.message || "请检查 CloudBase MySQL 配置和表结构。"}
        </Alert>
      )}

      {status === "not-configured" && (
        <EmptyDailyPackState
          title="还没有连接今日练习数据库"
          message="页面不会读取本地 JSON。请先配置 CloudBase，并创建 daily pack snapshot 表，然后重新生成并上传今天的练习。"
        />
      )}

      {status === "empty" && (
        <EmptyDailyPackState
          title="今天还没有练习"
          message="数据库里没有找到今天的 daily_pack_snapshot。请先让 Codex 生成今天的练习，并上传覆盖到 CloudBase。"
        />
      )}

      {status === "loading" && (
        <Paper className="daily-pack-page" withBorder radius="md" p="lg">
          <Text c="dimmed">正在从数据库读取今日练习...</Text>
        </Paper>
      )}

      {pack && (
        <DailyPackWorkbench
          pack={pack}
          completion={completion}
          responses={responses}
          setResponses={setResponses}
        />
      )}
    </ResponsiveShell>
  );
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function EmptyDailyPackState({ title, message }) {
  return (
    <Paper className="daily-pack-page" withBorder radius="md" p="xl">
      <Stack gap="sm">
        <Text className="eyebrow">Daily Pack</Text>
        <Title order={1}>{title}</Title>
        <Text c="dimmed" maw={720}>
          {message}
        </Text>
      </Stack>
    </Paper>
  );
}

function DailyPackWorkbench({ pack, completion, responses, setResponses }) {
  const firstSection = pack.sections?.[0]?.id || "listening";

  return (
    <section className="daily-pack-page">
      {useMockDailyPack && (
        <Alert color="blue" variant="light" radius="md" mb="md">
          当前为 mock data 开发模式：用于验证新数据结构和页面交互，不读取 CloudBase。
        </Alert>
      )}

      <Paper className="daily-pack-hero" withBorder radius="md" p="lg">
        <Group justify="space-between" align="flex-start" gap="lg">
          <div>
            <Text className="eyebrow">Daily Pack Snapshot · {pack.date}</Text>
            <Title order={1}>{pack.theme}</Title>
            <Text c="dimmed" mt="sm" maw={820}>
              {pack.summary}
            </Text>
          </div>
          <Stack gap="xs" className="daily-pack-progress">
            <Badge color="teal" variant="light" size="lg">
              {pack.estimatedMinutes} min
            </Badge>
            <Text size="sm" fw={700}>
              {completion.done} / {completion.total} tasks
            </Text>
          </Stack>
        </Group>
      </Paper>

      <Tabs defaultValue={firstSection} keepMounted={false} className="daily-pack-tabs">
        <ScrollArea type="auto" offsetScrollbars scrollbarSize={6}>
          <Tabs.List className="daily-pack-tab-list">
            {pack.sections.map((section) => (
              <Tabs.Tab key={section.id} value={section.id}>
                {section.label}
              </Tabs.Tab>
            ))}
            <Tabs.Tab value="feedback">反馈包</Tabs.Tab>
          </Tabs.List>
        </ScrollArea>

        {pack.sections.map((section) => (
          <Tabs.Panel key={section.id} value={section.id} pt="md">
            <SkillSection section={section} responses={responses} setResponses={setResponses} />
          </Tabs.Panel>
        ))}

        <Tabs.Panel value="feedback" pt="md">
          <FeedbackPackage pack={pack} responses={responses} />
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}

function SkillSection({ section, responses, setResponses }) {
  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg" className="daily-pack-skill-summary">
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Text className="eyebrow">{section.skill} · 今日练习核心主题</Text>
            <Title order={2}>
              {section.label}：{section.theme}
            </Title>
          </div>
          <Badge color={getPackColor()} variant="light" size="lg">
            {section.units.length} units
          </Badge>
        </Group>
      </Paper>

      <Accordion variant="separated" radius="md" defaultValue={section.units[0]?.id}>
        {section.units.map((unit, index) => (
          <Accordion.Item key={unit.id} value={unit.id}>
            <Accordion.Control>
              <Group justify="space-between" gap="md" wrap="nowrap">
                <div>
                  <Text className="eyebrow" mb={4}>
                    Unit {index + 1}
                  </Text>
                  <Text fw={850}>{unit.title}</Text>
                  <Group gap={6} mt={6}>
                    {unit.tags.map((tag) => (
                      <Badge key={tag} color={getPackColor()} variant="light" radius="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </div>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <UnitContent
                unit={unit}
                skill={section.skill}
                responses={responses}
                setResponses={setResponses}
              />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}

function UnitContent({ unit, skill, responses, setResponses }) {
  const learningItems = unit.learningItems || [];
  const tasks = unit.tasks || [];

  return (
    <Stack gap="md">
      <Text c="dimmed">{unit.instructions}</Text>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {unit.materials.map((material) => (
          <MaterialCard key={material.id} material={material} color={getPackColor()} />
        ))}
      </SimpleGrid>

      {learningItems.length > 0 && (
        <LearningItemsPanel
          items={learningItems}
          responses={responses}
          setResponses={setResponses}
        />
      )}

      {tasks.length > 0 && (
        <Stack gap="sm">
          <Text fw={850}>练习任务</Text>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              responses={responses}
              setResponses={setResponses}
            />
          ))}
        </Stack>
      )}

      <UnitFeedback unit={unit} responses={responses} setResponses={setResponses} />
    </Stack>
  );
}

function LearningItemsPanel({ items, responses, setResponses }) {
  return (
    <Stack gap="xs" className="daily-pack-learning-section">
      <Group className="daily-pack-subsection-title" justify="space-between" align="center">
        <div>
          <Text className="eyebrow">Language Focus</Text>
          <Text fw={900}>语言点预处理</Text>
        </div>
        <Badge color={getPackColor()} variant="light" radius="sm">
          {items.length} items
        </Badge>
      </Group>
      <Stack gap="xs">
        {items.map((item) => (
          <LearningItemCard
            key={item.id}
            item={item}
            responses={responses}
            setResponses={setResponses}
          />
        ))}
      </Stack>
    </Stack>
  );
}

function LearningItemCard({ item, responses, setResponses }) {
  const [expanded, setExpanded] = useState(false);
  const itemResponse = responses.learningItems?.[item.id] || {};
  const status = itemResponse.status || "";
  const note = itemResponse.note || "";

  function patchLearningItem(next) {
    setResponses((current) => ({
      ...current,
      learningItems: {
        ...(current.learningItems || {}),
        [item.id]: {
          ...(current.learningItems?.[item.id] || {}),
          ...next
        }
      }
    }));
  }

  return (
    <Card withBorder radius="md" padding="sm" className="daily-pack-learning-item">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
          <Group gap="sm" align="flex-start" className="daily-pack-learning-main">
            <Badge color={getLearningItemColor(item.type)} variant="light" radius="sm">
              {getLearningItemLabel(item.type)}
            </Badge>
            <div className="daily-pack-learning-copy">
              <Text fw={900} className="daily-pack-learning-term">
                {item.text}
              </Text>
              {item.meaning && (
                <Text c="dimmed" size="sm">
                  {item.meaning}
                </Text>
              )}
            </div>
          </Group>
        </Group>

        <Group gap="xs" justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" className="daily-pack-status-actions">
            {[
              ["mastered", "掌握"],
              ["unfamiliar", "不熟"],
              ["ignored", "忽略"]
            ].map(([value, label]) => (
              <Button
                key={value}
                size="xs"
                radius="md"
                variant={status === value ? "filled" : "light"}
                color={status === value ? getPackColor() : "gray"}
                onClick={() => patchLearningItem({ status: status === value ? "" : value })}
              >
                {label}
              </Button>
            ))}
          </Group>
          <Button
            size="xs"
            radius="md"
            variant="subtle"
            color="gray"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "收起" : "展开"}
          </Button>
        </Group>

        {expanded && (
          <Stack gap="xs" className="daily-pack-learning-detail">
            {item.sourceSentence && (
              <Paper withBorder radius="sm" p="sm" bg="var(--mantine-color-gray-0)">
                <Text size="sm" c="dimmed">
                  {item.sourceSentence}
                </Text>
              </Paper>
            )}

            {item.note && <Text size="sm">{item.note}</Text>}
            {item.reusePrompt && (
              <Text size="sm" c="dimmed">
                {item.reusePrompt}
              </Text>
            )}

            <Textarea
              label="备注"
              placeholder="比如：听的时候没反应过来 / 想下次继续追踪 / 我会用这个造句"
              autosize
              minRows={2}
              value={note}
              onChange={(event) => patchLearningItem({ note: event.currentTarget.value })}
            />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function UnitFeedback({ unit, responses, setResponses }) {
  const freeNote = responses.unitFeedback?.[unit.id]?.freeNote || "";

  function patchUnitFeedback(next) {
    setResponses((current) => ({
      ...current,
      unitFeedback: {
        ...(current.unitFeedback || {}),
        [unit.id]: {
          ...(current.unitFeedback?.[unit.id] || {}),
          ...next
        }
      }
    }));
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Textarea
        label="我额外想标记的问题"
        description="可以写系统漏掉的词、没听懂的句子、材料难度感受，或想让 Codex 下次继续追踪的问题。"
        placeholder="例如：get the hang of 这个表达我没掌握，但系统没有单独列出来。"
        autosize
        minRows={4}
        value={freeNote}
        onChange={(event) => patchUnitFeedback({ freeNote: event.currentTarget.value })}
      />
    </Card>
  );
}

function MaterialCard({ material, color }) {
  if (material.type === "external_link") {
    return (
      <Card withBorder radius="md" padding="md" className="daily-pack-material">
        <Stack gap="xs">
          <Badge color={color} variant="light" w="fit-content">
            external link
          </Badge>
          <Title order={3}>{material.title}</Title>
          <Text size="sm" c="dimmed">
            {material.source}
          </Text>
          <Text>{material.description}</Text>
          <Button component="a" href={material.url} target="_blank" rel="noreferrer" variant="light" color={color}>
            打开素材
          </Button>
        </Stack>
      </Card>
    );
  }

  if (material.type === "copyable_prompt") {
    return (
      <Card withBorder radius="md" padding="md" className="daily-pack-material">
        <Stack gap="xs">
          <Badge color={color} variant="light" w="fit-content">
            copyable prompt
          </Badge>
          <Title order={3}>{material.title}</Title>
          <Text c="dimmed">这段文本用于复制到外部工具启动练习。</Text>
          <CopyButton value={material.content} timeout={1800}>
            {({ copied, copy }) => (
              <Button color={color} onClick={copy}>
                {copied ? "已复制" : material.copyLabel || "复制内容"}
              </Button>
            )}
          </CopyButton>
          <Accordion variant="contained" radius="md">
            <Accordion.Item value="preview">
              <Accordion.Control>查看指令内容</Accordion.Control>
              <Accordion.Panel>
                <Text component="pre" className="daily-pack-pre">
                  {material.content}
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" padding="md" className="daily-pack-material">
      <Stack gap="xs">
        <Badge color={color} variant="light" w="fit-content">
          {material.type}
        </Badge>
        <Title order={3}>{material.title}</Title>
        <Text>{material.content}</Text>
      </Stack>
    </Card>
  );
}

function TaskCard({ task, responses, setResponses }) {
  const taskResponse = responses.tasks?.[task.id] || {};
  const completed = Boolean(taskResponse.completed);
  const answer = taskResponse.answer || "";

  function patchTask(next) {
    setResponses((current) => ({
      ...current,
      tasks: {
        ...(current.tasks || {}),
        [task.id]: {
          ...(current.tasks?.[task.id] || {}),
          ...next
        }
      }
    }));
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Checkbox
          checked={completed}
          label={task.prompt}
          onChange={(event) => patchTask({ completed: event.currentTarget.checked })}
        />

        {task.responseType === "text" && (
          <Textarea
            label={task.answerLabel || "回答"}
            placeholder="把你的回答或外部反馈写在这里"
            autosize
            minRows={4}
            value={answer}
            onChange={(event) => patchTask({ answer: event.currentTarget.value })}
          />
        )}
      </Stack>
    </Card>
  );
}

function FeedbackPackage({ pack, responses }) {
  const feedbackText = buildFeedbackText(pack, responses);

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg">
        <Text className="eyebrow">Feedback Package</Text>
        <Title order={2}>给 Codex 的练后反馈包</Title>
        <Text c="dimmed" mt="xs" maw={760}>
          这里不是复盘表单，只负责汇总完成状态、回答、语言点标记和自由反馈。复制后发给 Codex，由 Codex 在对话里引导复盘并整理沉淀。
        </Text>
      </Paper>

      <Card withBorder radius="md" padding="md">
        <Group justify="space-between" align="center" mb="sm">
          <Text fw={850}>可复制内容</Text>
          <CopyButton value={feedbackText} timeout={1800}>
            {({ copied, copy }) => (
              <Button onClick={copy} color="teal">
                {copied ? "已复制" : "复制反馈包"}
              </Button>
            )}
          </CopyButton>
        </Group>
        <Divider mb="sm" />
        <Text component="pre" className="daily-pack-pre">
          {feedbackText}
        </Text>
      </Card>
    </Stack>
  );
}

function getCompletion(pack, responses) {
  if (!pack) return { done: 0, total: 0 };
  const tasks = pack.sections.flatMap((section) => section.units.flatMap((unit) => unit.tasks || []));
  const done = tasks.filter((task) => responses.tasks?.[task.id]?.completed).length;
  return { done, total: tasks.length };
}

function buildFeedbackText(pack, responses) {
  const completedTasks = [];
  const answeredTasks = [];
  const learningItemFeedback = {
    mastered: [],
    unfamiliar: [],
    ignored: [],
    notes: []
  };
  const freeUnitFeedback = [];

  pack.sections.forEach((section) => {
    section.units.forEach((unit) => {
      (unit.tasks || []).forEach((task) => {
        const response = responses.tasks?.[task.id];
        if (response?.completed) completedTasks.push(`${section.label} / ${unit.title}: ${task.prompt}`);
        if (response?.answer) answeredTasks.push(`${section.label} / ${unit.title} / ${task.answerLabel || "回答"}:\n${response.answer}`);
      });

      (unit.learningItems || []).forEach((item) => {
        const response = responses.learningItems?.[item.id];
        if (!response) return;

        const itemLabel = `${section.label} / ${unit.title}: ${item.text}`;
        if (response.status && learningItemFeedback[response.status]) {
          learningItemFeedback[response.status].push(itemLabel);
        }
        if (response.note) learningItemFeedback.notes.push(`${itemLabel}\n  备注：${response.note}`);
      });

      const unitNote = responses.unitFeedback?.[unit.id]?.freeNote;
      if (unitNote) freeUnitFeedback.push(`${section.label} / ${unit.title}:\n${unitNote}`);
    });
  });

  return [
    pack.feedbackPackagePrompt,
    "",
    `日期：${pack.date}`,
    `主题：${pack.theme}`,
    "",
    "已完成任务：",
    completedTasks.length ? completedTasks.map((item) => `- ${item}`).join("\n") : "- 暂无",
    "",
    "语言点标记：",
    `已掌握：${formatFeedbackList(learningItemFeedback.mastered)}`,
    `不熟：${formatFeedbackList(learningItemFeedback.unfamiliar)}`,
    `忽略：${formatFeedbackList(learningItemFeedback.ignored)}`,
    "",
    "语言点备注：",
    learningItemFeedback.notes.length ? learningItemFeedback.notes.map((item) => `- ${item}`).join("\n") : "- 暂无",
    "",
    "自由补充反馈：",
    freeUnitFeedback.length ? freeUnitFeedback.join("\n\n") : "（暂无）",
    "",
    "任务回答 / 外部反馈：",
    answeredTasks.length ? answeredTasks.join("\n\n") : "（暂无）"
  ].join("\n");
}

function formatFeedbackList(items) {
  return items.length ? `\n${items.map((item) => `- ${item}`).join("\n")}` : " 暂无";
}

function getStatusText(status, pack, completion) {
  if (status === "loading") return "正在读取今日练习...";
  if (status === "not-configured") return "CloudBase 未配置";
  if (status === "empty") return "今天还没有练习";
  if (status === "error") return "数据库读取失败";
  if (status === "mock") return `Mock · ${completion.done}/${completion.total} 个任务完成`;
  if (!pack) return "今日练习未就绪";
  return `${pack.date} · ${completion.done}/${completion.total} 个任务完成`;
}

function getPackColor() {
  return "teal";
}

function getLearningItemLabel(type) {
  return {
    keyword: "关键词",
    phrase: "重点词组",
    expression: "重点表达",
    sentence_pattern: "重点句型",
    listening_cue: "听力抓手",
    missed_sound: "易漏听表达"
  }[type] || "语言点";
}

function getLearningItemColor(type) {
  return {
    keyword: "teal",
    phrase: "cyan",
    expression: "blue",
    sentence_pattern: "indigo",
    listening_cue: "orange",
    missed_sound: "red"
  }[type] || "gray";
}
