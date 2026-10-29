import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  base: '/pi-docs/',
  lang: 'zh',
  title: 'pi 源码解析',
  description: '带语音讲解的 pi 源码解析',
  // Restore the dragged sidebar width before first paint (key matches theme/SidebarResizer.tsx).
  head: [
    '<script>try{var w=localStorage.getItem("pi-docs-sidebar-width");if(w)document.documentElement.style.setProperty("--rp-sidebar-width",w+"px")}catch(e){}</script>',
  ],
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
