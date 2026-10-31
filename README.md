# pi 源码解析（带语音）

Rspress 文档站。每句讲解写成 `<Say id="…" cue="节点id">…</Say>`，点底部播放条按句朗读；讲到哪句，archify 图上 `cue` 指定的节点就会亮起。

```bash
npm install --ignore-scripts
python3 scripts/narrate.py      # 生成 docs/public/audio/*.mp3 和 theme/narration/manifest.json
npm run dev
```

- `narrate.py` 只重新生成文本或音色改过的句子；`python3 scripts/narrate.py a03` 强制重录一句。读音不对就在脚本的 `LEXICON` 里加一条。
- MiniMax key 从 `$MINIMAX_API_KEY` 或 `~/.config/pixel-science-video/minimax.env` 读取，不进页面、不进仓库。
- 图的源文件在 `archify/*.json`，用 archify `finalize` 生成到 `docs/public/diagrams/`。`flow.html` 复制自 `doc/pi-flow-archify.html`。
- 页面顺序由 `docs/_meta.json` 决定，读完一页会自动翻到下一页。
- 推送到 `main` 后，GitHub Actions 构建并发布到 https://summer1874.github.io/pi-docs/ 。音频是本地用 `narrate.py` 生成后提交的，构建时不需要 MiniMax key。
- 总览页的视频 `docs/public/video/overview.mp4` 来自奶蛙像素研究所 `episodes/004-pi-overview`，台词和配音就是 `a01`–`a14` 这套。`theme/narration/videos.json` 记录每句在视频里的起始秒数，播放条读到哪句就把视频跳到哪里（静音播放）。改了这几句的文字或音频后，要重新渲染视频、重新生成这个文件。
- 逐章讲解视频（如 `docs/public/video/ch02.mp4`）用 `source-lecture-video` skill 制作，项目在 `/Users/summer/Desktop/vibe-coding/source-lectures/<章节>/`。页面用 `<LectureVideo>` 嵌入，小节跳转表在 `theme/narration/lectures.json`，由项目里的 `tools/export.py` 输出。
