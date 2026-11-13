/// <reference types="vite/client" />
// Modules loaded by convex-test, without the test files themselves.
const all = import.meta.glob("./**/*.*s");
export const modules = Object.fromEntries(
  Object.entries(all).filter(([path]) => !/\.test\.|test\.setup\./.test(path)),
);
