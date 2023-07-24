# typora-plugin-loader

Decide to load which `core` (production or development).

## Environment

Create `env.json` under `.typora` in your note vault.

### Variables

- `TYPORA_EXTENSION_ENV`
  - `production` (Default)
  - `development`: Enable devtools - auto open Chrome DevTools, hot reload (restart window after build)
- `PLUGIN_CORE_PATH`: Path of `core` under development
- `PLUGIN_GLOBAL_DIR`: Path of plugins under development
- `PLUGIN_WIN_ID`: Current window id for hot reload
