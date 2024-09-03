# typora-plugin-loader

Decide to load which `core` (production or development).

## Loader Config

- `coreVersion`: version of using `core` (like `2.0.0`)
- `debug`: debug mode. `true` or `false`, default is `false`

## Environment

Create `env.json` under `.typora` in your note vault.

### Variables

- `PLUGIN_CORE_PATH`: Path of `core` under development
- `PLUGIN_GLOBAL_DIR`: Path of plugins under development
