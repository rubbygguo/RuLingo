export const mockMemoryItems = [
  {
    id: "mem_take_it_for_granted",
    type: "phrase",
    canonicalText: "take it for granted",
    displayText: "take it for granted",
    meaningZh: "认为某事理所当然",
    explanationEn: "To fail to appreciate something because it feels normal or expected.",
    nextReviewAt: "2026-05-15 09:00:00",
    lastSeenAt: "2026-05-14 20:20:00",
    sourceKind: "chat",
    tags: [
      { category: "type", key: "phrase", label: "短语" },
      { category: "topic", key: "daily-life", label: "日常生活" },
      { category: "usage", key: "attitude", label: "态度表达" }
    ],
    examples: ["We often take clean water for granted."],
    contexts: ["Chat 讨论语言记忆库设计时记录。"],
    mistakeNotes: ["容易只理解字面意思，忽略其中“不够珍惜”的语气。"]
  },
  {
    id: "mem_it_is_not_that",
    type: "sentence_pattern",
    canonicalText: "It is not that..., but that...",
    displayText: "It is not that..., but that...",
    meaningZh: "不是因为……，而是因为……",
    explanationEn: "A contrastive pattern used to correct the reason behind a situation.",
    nextReviewAt: "2026-05-14 09:00:00",
    lastSeenAt: "2026-05-13 22:10:00",
    sourceKind: "daily_pack_review",
    tags: [
      { category: "type", key: "pattern", label: "句型" },
      { category: "topic", key: "academic", label: "学术讨论" },
      { category: "skill", key: "speaking", label: "口语" }
    ],
    examples: ["It is not that I disagree with the idea, but that I need more evidence."],
    contexts: ["DailyPack 口语复盘：解释不同意某个观点时使用。"],
    mistakeNotes: ["容易漏掉第二个 that，导致句子结构不完整。"]
  },
  {
    id: "mem_taken",
    type: "word",
    canonicalText: "taken",
    displayText: "taken",
    baseForm: "take",
    wordForm: "past_participle",
    meaningZh: "take 的过去分词；被拿走、被接受、被占用等",
    explanationEn: "Past participle form of take, often used in passive voice or perfect tense.",
    nextReviewAt: "2026-05-15 09:00:00",
    lastSeenAt: "2026-05-14 18:40:00",
    sourceKind: "daily_pack_review",
    tags: [
      { category: "type", key: "word", label: "单词" },
      { category: "problem", key: "word-form", label: "词形" },
      { category: "skill", key: "listening", label: "听力" }
    ],
    examples: ["The seats were already taken when we arrived."],
    contexts: ["听力 transcript 中没有及时识别 taken。"],
    mistakeNotes: ["和 take 的原形分开复习，不默认合并熟悉度。"]
  },
  {
    id: "mem_pose_a_threat",
    type: "collocation",
    canonicalText: "pose a threat",
    displayText: "pose a threat",
    meaningZh: "构成威胁",
    explanationEn: "A common collocation used when something creates danger or risk.",
    nextReviewAt: "2026-05-20 09:00:00",
    lastSeenAt: "2026-05-12 21:00:00",
    sourceKind: "daily_pack_review",
    tags: [
      { category: "type", key: "collocation", label: "搭配" },
      { category: "topic", key: "technology", label: "科技" },
      { category: "skill", key: "reading", label: "阅读" }
    ],
    examples: ["Unverified AI-generated content may pose a threat to public trust."],
    contexts: ["阅读材料：AI news 主题。"],
    mistakeNotes: ["不要写成 make a threat，语义会变成“发出威胁”。"]
  },
  {
    id: "mem_worth_noting",
    type: "phrase",
    canonicalText: "worth noting",
    displayText: "worth noting",
    meaningZh: "值得注意",
    explanationEn: "Used to introduce an important point in writing or discussion.",
    nextReviewAt: "2026-05-16 09:00:00",
    lastSeenAt: "2026-05-14 19:15:00",
    sourceKind: "daily_pack_review",
    tags: [
      { category: "type", key: "phrase", label: "短语" },
      { category: "topic", key: "academic", label: "学术写作" },
      { category: "skill", key: "writing", label: "写作" }
    ],
    examples: ["It is worth noting that the sample size is relatively small."],
    contexts: ["写作反馈：引出限制条件时可以使用。"],
    mistakeNotes: ["注意后面常接 that 从句，不要写成 worth to note。"]
  },
  {
    id: "mem_in_terms_of",
    type: "phrase",
    canonicalText: "in terms of",
    displayText: "in terms of",
    meaningZh: "就……而言；从……方面来看",
    explanationEn: "Used to specify the aspect being discussed.",
    nextReviewAt: "2026-06-01 09:00:00",
    lastSeenAt: "2026-05-10 21:30:00",
    sourceKind: "chat",
    tags: [
      { category: "type", key: "phrase", label: "短语" },
      { category: "topic", key: "academic", label: "学术讨论" },
      { category: "usage", key: "framing", label: "限定范围" }
    ],
    examples: ["In terms of methodology, the study is quite limited."],
    contexts: ["Chat 中整理 seminar 发言句型时记录。"],
    mistakeNotes: ["避免过度使用，可和 regarding / when it comes to 轮换。"]
  }
];
