import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts"],
    pool: "forks", // better-sqlite3 (nativo) anda mejor en forks
  },
});
