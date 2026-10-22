import tseslint from "typescript-eslint";
export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", "raycast-env.d.ts"] },
  ...tseslint.configs.recommended,
);
