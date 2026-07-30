import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "__tests__/**",
      "tests/**",
      "e2e/**",
      "scripts/**",
      "app/api/**",
      "lib/**",
      "node_modules/**",
      "*.js",
      "*.mjs",
      "*.ts",
      "public/**",
      "scratch/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
