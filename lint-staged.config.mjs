export default {
	// Biome 检查暂存文件（受 biome.json 的 files.includes 过滤）
	"*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,json,jsonc,css,scss}": [
		"biome check --no-errors-on-unmatched",
	],
	// 仅当 core 包文件变更时才跑 typecheck，避免每次提交全量编译
	"packages/core/**/*.{ts,tsx}": () =>
		"pnpm --filter @typora-community-plugin/core run typecheck",
	// 语言文件变更时校验多语言 key 对齐
	"packages/core/src/locales/lang.*.json": () => "pnpm run check:i18n",
}
