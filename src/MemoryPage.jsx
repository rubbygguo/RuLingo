import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { ResponsiveShell } from "./LearningApp.jsx";
import { loadMemoryItems, loadMemoryTagFilters } from "./memoryClient.js";

const typeLabels = {
  word: "单词",
  phrase: "短语",
  sentence_pattern: "句型",
  collocation: "搭配",
  grammar_point: "语法",
  pronunciation: "发音",
  topic_expression: "主题表达"
};

export function MemoryPage() {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [activeTag, setActiveTag] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState([]);
  const [tagFilters, setTagFilters] = useState([{ key: "all", label: "全部" }]);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let ignore = false;

    loadMemoryTagFilters()
      .then((tags) => {
        if (!ignore) setTagFilters(tags);
      })
      .catch((error) => {
        console.error(error);
        if (!ignore) setLoadError(error);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setStatus("loading");
    setLoadError(null);

    loadMemoryItems({ query, tagKey: activeTag })
      .then((nextItems) => {
        if (ignore) return;
        setItems(nextItems);
        setSelectedId((current) => nextItems.some((item) => item.id === current) ? current : nextItems[0]?.id || "");
        setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!ignore) {
          setItems([]);
          setSelectedId("");
          setLoadError(error);
          setStatus(error.code === "cloudbase_not_configured" ? "not-configured" : "error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeTag, query]);

  const filteredItems = items;
  const selectedItem = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;
  const stats = getMemoryStats(items, tagFilters);
  const activeTagLabel = tagFilters.find((tag) => tag.key === activeTag)?.label || "全部";

  function toggleSearch() {
    setSearchOpen((value) => !value);
    setActiveTag("all");
  }

  function updateSearch(nextQuery) {
    setQuery(nextQuery);
    if (nextQuery.trim()) setActiveTag("all");
  }

  function chooseTag(tagKey) {
    setActiveTag(tagKey);
    setTagModalOpen(false);
    if (tagKey !== "all") {
      setQuery("");
      setSearchOpen(false);
    }
  }

  return (
    <ResponsiveShell
      query=""
      setQuery={() => {}}
      activeSection="memory"
      setActiveSection={() => {}}
      statusText={`Memory · CloudBase · ${items.length} 条`}
      searchDisabled
    >
      <section className="memory-page">
        <Paper className="memory-hero" withBorder radius="md" p="lg">
          <Group justify="space-between" align="flex-start" gap="lg">
            <div className="memory-hero-copy">
              <Text className="eyebrow">Language Memory</Text>
              <Title order={1}>语言记忆库</Title>
              <Text c="dimmed" mt="sm" maw={760}>
                已确认的词、短语、句型和搭配会在这里翻阅和搜索。新增内容仍通过 Chat 结构化后入库。
              </Text>
            </div>
            <SimpleGrid cols={3} spacing="xs" className="memory-stat-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="memory-stat">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </SimpleGrid>
          </Group>
        </Paper>

        <Paper className="memory-toolbar" withBorder radius="md" p="sm">
          <Group gap="xs" wrap="nowrap" className="memory-toolbar-row">
            <Button
              variant={searchOpen || query ? "filled" : "light"}
              color={searchOpen || query ? "teal" : "gray"}
              size="xs"
              radius="md"
              onClick={toggleSearch}
            >
              搜索
            </Button>
            {searchOpen && (
              <TextInput
                className="memory-inline-search"
                type="search"
                aria-label="搜索记忆内容"
                placeholder="搜索表达、释义、上下文"
                value={query}
                onChange={(event) => updateSearch(event.currentTarget.value)}
              />
            )}
            <Button
              variant={activeTag === "all" ? "light" : "filled"}
              color={activeTag === "all" ? "gray" : "teal"}
              size="xs"
              radius="md"
              onClick={() => setTagModalOpen(true)}
            >
              标签：{activeTagLabel}
            </Button>
          </Group>
        </Paper>

        <Modal
          opened={tagModalOpen}
          onClose={() => setTagModalOpen(false)}
          title="选择标签"
          centered
          size="sm"
          radius="md"
        >
          <div className="memory-tag-modal-grid">
            {tagFilters.map((tag) => (
              <Button
                key={tag.key}
                variant={activeTag === tag.key ? "filled" : "light"}
                color={activeTag === tag.key ? "teal" : "gray"}
                radius="md"
                onClick={() => chooseTag(tag.key)}
              >
                {tag.label}
              </Button>
            ))}
          </div>
        </Modal>

        <div className="memory-layout">
          <Stack gap="sm" className="memory-list">
            {status === "loading" && (
              <Paper className="memory-empty" withBorder radius="md" p="lg">
                <Text c="dimmed">正在读取语言记忆库...</Text>
              </Paper>
            )}
            {status === "error" && (
              <Paper className="memory-empty" withBorder radius="md" p="lg">
                <Text fw={800}>读取失败</Text>
                <Text c="dimmed" size="sm">
                  {loadError?.message || "请检查 CloudBase memory 表和权限配置。"}
                </Text>
              </Paper>
            )}
            {status === "not-configured" && (
              <Paper className="memory-empty" withBorder radius="md" p="lg">
                <Text fw={800}>还没有连接数据库</Text>
                <Text c="dimmed" size="sm">
                  请先配置 CloudBase 环境变量。
                </Text>
              </Paper>
            )}
            {filteredItems.map((item) => (
              <div key={item.id} className="memory-list-entry">
                <MemoryItemCard
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onSelect={() => setSelectedId(item.id)}
                />
                {selectedItem?.id === item.id && (
                  <div className="memory-inline-detail">
                    <MemoryDetail item={item} />
                  </div>
                )}
              </div>
            ))}
            {status === "ready" && !filteredItems.length && (
              <Paper className="memory-empty" withBorder radius="md" p="lg">
                <Text fw={800}>没有匹配内容</Text>
                <Text c="dimmed" size="sm">
                  换一个关键词，或切回全部标签。
                </Text>
              </Paper>
            )}
          </Stack>

          {selectedItem && status === "ready" && (
            <div className="memory-side-detail">
              <MemoryDetail item={selectedItem} />
            </div>
          )}
        </div>
      </section>
    </ResponsiveShell>
  );
}

function MemoryItemCard({ item, selected, onSelect }) {
  return (
    <Card
      component="button"
      type="button"
      className={`memory-item-card${selected ? " is-selected" : ""}`}
      withBorder
      radius="md"
      p="md"
      onClick={onSelect}
    >
      <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
        <div className="memory-item-copy">
          <Group gap="xs" mb={6}>
            <Badge color={getTypeColor(item.type)} variant="light">
              {typeLabels[item.type] || item.type}
            </Badge>
          </Group>
          <Title order={3}>{item.displayText}</Title>
          <Text c="dimmed" size="sm" lineClamp={2}>
            {item.meaningZh}
          </Text>
        </div>
        <Text size="xs" c="dimmed" className="memory-next-review">
          {getSourceLabel(item.sourceKind)}
        </Text>
      </Group>
    </Card>
  );
}

function MemoryDetail({ item }) {
  return (
    <Paper className="memory-detail" withBorder radius="md" p="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div className="memory-detail-title">
          <Text className="eyebrow">Detail</Text>
          <Title order={2}>{item.displayText}</Title>
          <Text c="dimmed" mt={6}>
            {item.meaningZh}
          </Text>
        </div>
      </Group>

      <Divider my="md" />

      <Stack gap="md">
        <DetailBlock title="英文解释" body={item.explanationEn} />
        {item.baseForm && <DetailBlock title="关联词形" body={`${item.baseForm} · ${item.wordForm}`} />}
        <DetailList title="例句" values={item.examples} />
        <DetailList title="上下文" values={item.contexts} />
        <DetailList title="易错点" values={item.mistakeNotes} />

        <div>
          <Text fw={900} size="sm" mb="xs">
            标签
          </Text>
          <Group gap="xs">
            {item.tags.map((tag) => (
              <Badge key={`${tag.category}:${tag.key}`} color="gray" variant="light">
                {tag.label}
              </Badge>
            ))}
          </Group>
        </div>
      </Stack>
    </Paper>
  );
}

function DetailBlock({ title, body }) {
  if (!body) return null;

  return (
    <div>
      <Text fw={900} size="sm" mb={4}>
        {title}
      </Text>
      <Text c="dimmed">{body}</Text>
    </div>
  );
}

function DetailList({ title, values }) {
  if (!values?.length) return null;

  return (
    <div>
      <Text fw={900} size="sm" mb={4}>
        {title}
      </Text>
      <Stack gap={6}>
        {values.map((value) => (
          <Text key={value} c="dimmed" className="memory-detail-line">
            {value}
          </Text>
        ))}
      </Stack>
    </div>
  );
}

function getMemoryStats(items, tagFilters) {
  return [
    { label: "总记录", value: items.length },
    { label: "内容类型", value: new Set(items.map((item) => item.type)).size },
    { label: "可选标签", value: Math.max(tagFilters.length - 1, 0) }
  ];
}

function getSourceLabel(sourceKind) {
  if (sourceKind === "daily_pack_review") return "DailyPack";
  if (sourceKind === "chat") return "Chat";
  return sourceKind || "";
}

function getTypeColor(type) {
  if (type === "word") return "blue";
  if (type === "sentence_pattern") return "grape";
  if (type === "collocation") return "orange";
  return "teal";
}
