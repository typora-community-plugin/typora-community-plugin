/**
 * Stable id of the development-only test plugin.
 *
 * Keep this in a dependency-free module so production builds can reference the
 * id (e.g. in default settings) without pulling the test plugin implementation.
 */
export const PLUGIN_TEST_ID = 'internal.test'
