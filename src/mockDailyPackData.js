export const mockDailyPackSnapshot = {
  id: "daily-pack-snapshot-2026-05-13-mock",
  date: "2026-05-13",
  schemaVersion: "daily_pack_snapshot.v1",
  generatedBy: "mock",
  createdAt: "2026-05-13T09:00:00+08:00",
  packJson: {
    id: "daily-pack-2026-05-13-mock",
    date: "2026-05-13",
    theme: "跟上课程节奏",
    estimatedMinutes: 35,
    summary: "这份 mock pack 用来验证听力语言点、标记、备注和自由反馈的页面体验，暂时不依赖 CloudBase 或真实生成规则。",
    sections: [
      {
        id: "listening",
        skill: "listening",
        label: "听",
        theme: "听懂学习压力相关表达",
        goal: "先理解 transcript 的语言重点，再用短复述确认是否真的听懂。",
        units: [
          {
            id: "listening-study-pressure",
            title: "Falling Behind in a Fast Course",
            tags: ["transcript", "academic life", "language focus"],
            instructions: "先听一遍抓主旨，再看 transcript 复听。重点不是做题，而是标记哪些表达已经掌握、哪些还不熟。",
            materials: [
              {
                id: "listening-study-pressure-audio",
                type: "external_link",
                title: "Mock audio source",
                source: "RuLingo mock data",
                url: "https://example.com/mock-listening",
                description: "临时链接，只用于验证页面布局。正式材料后续由每日包生成流程提供。"
              },
              {
                id: "listening-study-pressure-transcript",
                type: "text",
                title: "Transcript",
                content:
                  "I thought I could keep up at first, but after missing two lectures I started to fall behind. What makes it difficult is not just the amount of reading, but figuring out which parts really matter. I eventually got the hang of it by reviewing the slides before class and writing down one question for each reading."
              }
            ],
            learningItems: [
              {
                id: "li-keep-up",
                type: "keyword",
                text: "keep up",
                meaning: "跟上进度",
                sourceSentence: "I thought I could keep up at first.",
                note: "常用于课程、工作、对话速度或信息量太快时。"
              },
              {
                id: "li-fall-behind",
                type: "keyword",
                text: "fall behind",
                meaning: "落后，跟不上",
                sourceSentence: "I started to fall behind.",
                note: "可以描述学习进度、项目进度或任务积压。"
              },
              {
                id: "li-what-makes-it-difficult",
                type: "sentence_pattern",
                text: "What makes it difficult is...",
                meaning: "困难之处在于……",
                sourceSentence: "What makes it difficult is not just the amount of reading.",
                reusePrompt: "用这个句型说一句你最近学习上的困难。"
              },
              {
                id: "li-turning-point",
                type: "listening_cue",
                text: "but / not just... but...",
                meaning: "转折和递进信号",
                sourceSentence: "not just the amount of reading, but figuring out which parts really matter",
                note: "听到 but 后，后面的信息通常比前面更接近说话者真正想强调的点。"
              }
            ],
            tasks: []
          }
        ]
      },
      {
        id: "speaking",
        skill: "speaking",
        label: "说",
        theme: "解释自己的学习卡点",
        goal: "把听力里的表达迁移到自己的真实情况。",
        units: [
          {
            id: "speaking-study-bottleneck",
            title: "Explain a Study Bottleneck",
            tags: ["output", "self explanation"],
            instructions: "用今天的表达说清楚一个具体学习卡点。",
            materials: [
              {
                id: "speaking-scenario",
                type: "scenario",
                title: "Scenario",
                content: "你在 office hour 里向老师解释自己最近为什么跟不上课程，并说明你准备怎么调整。"
              }
            ],
            learningItems: [],
            tasks: [
              {
                id: "speaking-short-answer",
                prompt: "说或写 4 句话，解释一个你最近的学习卡点。",
                responseType: "text",
                answerLabel: "我的表达",
                completed: false
              }
            ]
          }
        ]
      },
      {
        id: "reading",
        skill: "reading",
        label: "读",
        theme: "抓住段落重点",
        goal: "快速判断一段学习建议中真正有用的信息。",
        units: [
          {
            id: "reading-study-advice",
            title: "Advice on Reviewing Before Class",
            tags: ["short text", "main idea"],
            instructions: "读短文并写一句英文总结。",
            materials: [
              {
                id: "reading-short-text",
                type: "text",
                title: "Short Text",
                content: "Reviewing slides before class helps students notice key terms during lectures. It also makes it easier to ask specific questions instead of waiting until confusion builds up."
              }
            ],
            learningItems: [],
            tasks: [
              {
                id: "reading-one-sentence-summary",
                prompt: "用一句英文总结这段建议。",
                responseType: "text",
                answerLabel: "一句话总结",
                completed: false
              }
            ]
          }
        ]
      },
      {
        id: "writing",
        skill: "writing",
        label: "写",
        theme: "写一个行动计划",
        goal: "把今天的听力内容转化成一个具体、可执行的学习调整。",
        units: [
          {
            id: "writing-study-plan",
            title: "One Small Adjustment",
            tags: ["planning", "reflection"],
            instructions: "写一个很小但本周能执行的调整。",
            materials: [
              {
                id: "writing-prompt",
                type: "text",
                title: "Prompt",
                content: "What is one small change you can make this week to keep up with your coursework?"
              }
            ],
            learningItems: [],
            tasks: [
              {
                id: "writing-small-adjustment",
                prompt: "写 2-3 句英文行动计划。",
                responseType: "text",
                answerLabel: "我的计划",
                completed: false
              }
            ]
          }
        ]
      }
    ],
    feedbackPackagePrompt: "请根据这份反馈包，帮我复盘今天的学习结果，整理我已经掌握的表达、不熟的语言点、自由补充的问题，以及下一次每日包应该继续追踪的内容。"
  }
};
