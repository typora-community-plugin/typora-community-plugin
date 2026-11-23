export default {
	// Biome 检查暂存文件（受 biome.json 的 files.includes 过滤）
	"*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,json,jsonc,css,scss}": [
		"biome check --no-errors-on-unmatched",
	],
	// 仅当 core 包文件变更时才跑 typecheck，避免每次提交全量编译
	"packages/core/**/*.{ts,tsx}": () =>
		"pnpm --filter @typora-community-plugin/core run typecheck",
}
