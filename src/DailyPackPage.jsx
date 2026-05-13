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

const responseStoreKey = "rulingo:daily-pack:2026-05-13:responses";

export function DailyPackPage() {
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState(null);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    let ignore = false;

    loadDailyPackSnapshot("2026-05-13")
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
  }, []);

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
          今日素材包读取失败：{loadError?.message || "请检查 CloudBase MySQL 配置和表结构。"}
        </Alert>
      )}

      {status === "not-configured" && (
        <EmptyDailyPackState
          title="还没有连接素材包数据库"
          message="页面不会读取本地 JSON。请先配置 CloudBase，并创建 daily pack snapshot 表，然后重新生成并上传今天的素材包。"
        />
      )}

      {status === "empty" && (
        <EmptyDailyPackState
          title="今天还没有素材包"
          message="数据库里没有找到今天的 daily_pack_snapshot。请先让 Codex 生成今天的素材包，并上传覆盖到 CloudBase。"
        />
      )}

      {status === "loading" && (
        <Paper className="daily-pack-page" withBorder radius="md" p="lg">
          <Text c="dimmed">正在从数据库读取今日素材包...</Text>
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
            <Tabs.Tab value="expressions">表达</Tabs.Tab>
            <Tabs.Tab value="feedback">反馈包</Tabs.Tab>
          </Tabs.List>
        </ScrollArea>

        {pack.sections.map((section) => (
          <Tabs.Panel key={section.id} value={section.id} pt="md">
            <SkillSection section={section} responses={responses} setResponses={setResponses} />
          </Tabs.Panel>
        ))}

        <Tabs.Panel value="expressions" pt="md">
          <ExpressionPool expressions={pack.expressionPool || []} responses={responses} setResponses={setResponses} />
        </Tabs.Panel>

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
      <Paper withBorder radius="md" p="lg">
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Text className="eyebrow">{section.skill}</Text>
            <Title order={2}>
              {section.label}：{section.theme}
            </Title>
            <Text c="dimmed" mt="xs" maw={780}>
              {section.goal}
            </Text>
          </div>
          <Badge color={getPackColor()} variant="light" size="lg">
            {section.units.length} units
          </Badge>
        </Group>
      </Paper>

      <Accordion variant="separated" radius="md" defaultValue={section.units[0]?.id}>
        {section.units.map((unit) => (
          <Accordion.Item key={unit.id} value={unit.id}>
            <Accordion.Control>
              <Group justify="space-between" gap="md" wrap="nowrap">
                <div>
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
  return (
    <Stack gap="md">
      <Text c="dimmed">{unit.instructions}</Text>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {unit.materials.map((material) => (
          <MaterialCard key={material.id} material={material} color={getPackColor()} />
        ))}
      </SimpleGrid>

      {unit.targetExpressions.length > 0 && (
        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-gray-0)">
          <Text fw={800} mb="xs">
            本单元目标表达
          </Text>
          <Group gap="xs">
            {unit.targetExpressions.map((expression) => (
              <Badge key={expression} color={getPackColor()} variant="outline" radius="sm">
                {expression}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      <Stack gap="sm">
        <Text fw={850}>练习任务</Text>
        {unit.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            responses={responses}
            setResponses={setResponses}
          />
        ))}
      </Stack>
    </Stack>
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

function ExpressionPool({ expressions, responses, setResponses }) {
  function toggleExpression(expressionId, checked) {
    setResponses((current) => ({
      ...current,
      expressions: {
        ...(current.expressions || {}),
        [expressionId]: checked
      }
    }));
  }

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="lg">
        <Text className="eyebrow">Expression Asset Layer</Text>
        <Title order={2}>今日表达池</Title>
        <Text c="dimmed" mt="xs" maw={760}>
          表达独立汇总，方便复习和勾选；每条表达保留服务于哪个技能和场景。
        </Text>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {expressions.map((expression) => (
          <Card key={expression.id} withBorder radius="md" padding="md">
            <Checkbox
              checked={Boolean(responses.expressions?.[expression.id])}
              onChange={(event) => toggleExpression(expression.id, event.currentTarget.checked)}
              label={
                <Stack gap={6}>
                  <Text fw={800}>{expression.text}</Text>
                  <Group gap={6}>
                    {expression.skills.map((skill) => (
                      <Badge key={skill} color={getPackColor()} variant="light" radius="sm">
                        {skill}
                      </Badge>
                    ))}
                    {expression.tags.map((tag) => (
                      <Badge key={tag} color="gray" variant="outline" radius="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              }
            />
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
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
          这里不是复盘表单，只负责汇总完成状态、回答和勾选表达。复制后发给 Codex，由 Codex 在对话里引导复盘并整理沉淀。
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
  const tasks = pack.sections.flatMap((section) => section.units.flatMap((unit) => unit.tasks));
  const done = tasks.filter((task) => responses.tasks?.[task.id]?.completed).length;
  return { done, total: tasks.length };
}

function buildFeedbackText(pack, responses) {
  const completedTasks = [];
  const answeredTasks = [];
  const selectedExpressions = [];

  pack.sections.forEach((section) => {
    section.units.forEach((unit) => {
      unit.tasks.forEach((task) => {
        const response = responses.tasks?.[task.id];
        if (response?.completed) completedTasks.push(`${section.label} / ${unit.title}: ${task.prompt}`);
        if (response?.answer) answeredTasks.push(`${section.label} / ${unit.title} / ${task.answerLabel || "回答"}:\n${response.answer}`);
      });
    });
  });

  pack.expressionPool?.forEach((expression) => {
    if (responses.expressions?.[expression.id]) selectedExpressions.push(expression.text);
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
    "已勾选表达：",
    selectedExpressions.length ? selectedExpressions.map((item) => `- ${item}`).join("\n") : "- 暂无",
    "",
    "任务回答 / 外部反馈：",
    answeredTasks.length ? answeredTasks.join("\n\n") : "（暂无）"
  ].join("\n");
}

function getStatusText(status, pack, completion) {
  if (status === "loading") return "正在读取今日素材包...";
  if (status === "not-configured") return "CloudBase 未配置";
  if (status === "empty") return "今天还没有素材包";
  if (status === "error") return "数据库读取失败";
  if (!pack) return "今日素材包未就绪";
  return `${pack.date} · ${completion.done}/${completion.total} 个任务完成`;
}

function getPackColor() {
  return "teal";
}
