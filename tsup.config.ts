import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["cjs", "esm"],
  dts: false,
  clean: true,
  target: "node16", // Mammoth supports node mostly, but we compile for broad support
});
