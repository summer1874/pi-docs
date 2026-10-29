// Learn how to customize the theme: https://rspress.rs/guide/basic/custom-theme
import { Layout as BasicLayout } from '@rspress/core/theme-original';
import { NarrationBar } from './narration';
import './index.css';

export * from '@rspress/core/theme-original';

export const Layout = () => <BasicLayout bottom={<NarrationBar />} />;
