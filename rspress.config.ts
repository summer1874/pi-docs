import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  base: '/pi-docs/',
  lang: 'zh',
  title: 'pi 源码讲解',
  description: '带语音讲解的 pi 架构文档',
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/earendil-works/pi',
      },
    ],
  },
});
