# 章节写作规范

“逐章源码解析”各章（`docs/chapters/*.mdx`）的统一写法。

## 源码基准

- pi 仓库：`/Users/summer/Desktop/vibe-coding/pi`，固定在提交 `44f6851b7f27ad5c18ccc94f6b4321650e757e3e`，工作区与该提交一致。
- 所有事实都要读源码确认，不凭印象写。函数名、字段名、行号以源码为准。
- 不改动 pi 仓库里的任何文件。

## 文件结构

```mdx
---
title: 第 2 章　pi-agent-core：Agent 循环
---

import { Diagram, Say } from '../../theme/narration';

# 第 2 章　pi-agent-core：Agent 循环

## 导读

<Say id="k02-01">……</Say>
<Say id="k02-02">……</Say>

## 1. ……
```

- 文件名按 `docs/chapters/_meta.json` 中的名字，例如 `ch02-agent-core.mdx`。
- `import` 路径固定为 `'../../theme/narration'`。

## 导读（语音部分）

- 每章开头一个 `## 导读`，5–8 句 `<Say>`。这是本章唯一会被朗读的部分；正文不用 `<Say>`。
- 导读讲三件事：这一章解决什么问题、核心设计是什么、读完能回答什么问题。
- `id` 格式：`k` + 两位章号 + `-` + 两位序号，例如 `k02-01`。附录用 `kap-01`。全站唯一。
- `<Say>` 里只写纯文本：不能有反引号、链接、加粗或其他标签，每句不超过 60 字。英文标识符可以直接写（如 runLoop、AgentSession），朗读脚本会处理读音。
- 有图时可以加 `cue="节点id"`，让讲到的节点亮起来；没图就不加。

## 正文

- 尽量详细：每章 6000 字以上（附录可以短些），覆盖大纲列出的每个要点，再补上读源码时发现的重要细节。
- 讲解顺序：问题 → 具体例子或调用链 → 解决方案。说清楚为什么这样设计，而不只是列出代码做了什么。
- **源码对照**是重点。每个要点都配源码片段：
  - 片段原样摘自源码，可以用 `// ...` 省略无关行，不改写代码。
  - 代码块写标题，格式为“路径:起始行-结束行”：

    ````mdx
    ```ts title="packages/agent/src/agent-loop.ts:251-268"
    const message = await streamAssistantResponse(currentContext, config, signal, emit, streamFunction);
    // ...
    ```
    ````

  - 片段前后用文字解释关键行。
  - 正文提到文件或函数时，链接到 GitHub 固定提交：`[agent-loop.ts:172](https://github.com/earendil-works/pi/blob/44f6851b7f27ad5c18ccc94f6b4321650e757e3e/packages/agent/src/agent-loop.ts#L172)`。行号区间用 `#L172-L338`。
- 每章 10 段以上源码片段。
- 适合表格的内容用表格（事件列表、字段对照、钩子一览）。
- 章末写 `## 小结`，列出本章要点，再写 `## 动手验证`，给 2–4 个可以在本地跑的小实验或该读的测试文件。

## 图

- 能用文字、表格、代码讲清楚的，不画图。
- 只有结构或流程确实复杂（比如多个组件之间的调用关系、状态流转）才画，每章最多 1 张。
- 画图用 archify：先读 `~/.claude/skills/archify/SKILL.md` 并照它的流程做。候选文件放 `archify/<名字>.json`，输出到 `docs/public/diagrams/<名字>.html`，在 `doc/site` 目录下执行 finalize，带 `--repo-root ../..`，`meta.repository` 用 `{"url":"git@github.com:earendil-works/pi.git","provider":"github","link_mode":"local-only","revision":"44f6851b7f27ad5c18ccc94f6b4321650e757e3e"}`，`meta.locale` 用 `zh-CN`。
- 在 MDX 里用 `<Diagram src="/diagrams/<名字>.html" title="……" />` 嵌入。

## MDX 注意事项

- 正文里的 `{`、`}`、`<`、`>` 会被 MDX 当成语法。出现在类型、泛型、对象字面量里的，一律放进行内代码或代码块。
- 不要写 HTML 注释 `<!-- -->`，用 `{/* */}`。
- 不要运行 `npm run build` 或启动开发服务器（多个作者同时在写，由汇总的人统一构建）。

## 语言

- 中文，技术写作，直接，不要客套。
- 专有名词第一次出现时用一句话解释。
- 不写“本章我们将会……”这类空话。
