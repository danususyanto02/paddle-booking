import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = defineConfig([
  ...compat.config({ extends: ["next/core-web-vitals"] }),
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "vitest.config.ts", "tests/**"]),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='table']",
          message:
            "Raw <table> is forbidden in app/(dashboard)/**. Use components/ui/data-table.tsx instead.",
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            "Raw <select> is forbidden in app/(dashboard)/**. Use components/ui/select.tsx instead.",
        },
      ],
    },
  },
  {
    files: ["components/ui/**", "uidesign/**"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
