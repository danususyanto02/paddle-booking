import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // Ban raw <table> / <select> outside shared UI — dashboard must use DataTable / Select
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
  // Allow raw table/select inside shared UI and outside dashboard
  {
    files: ["components/ui/**", "uidesign/**"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
