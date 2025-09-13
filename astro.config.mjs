// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeObsidian from 'starlight-theme-obsidian'

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			plugins: [starlightThemeObsidian()],
			title: 'My Notes',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/FeiZGe' }],
			sidebar: [
				{
					label: 'เริ่มต้น',
					autogenerate: { directory: 'started' }
				},
				{
					label: 'ThreeJS',
					autogenerate: { directory: 'threejs' },
				},
			],
		}),
	],
});
