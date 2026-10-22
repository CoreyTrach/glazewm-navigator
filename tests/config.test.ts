import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBindings, resolveConfigPath } from "../src/config";
import { syntheticConfig } from "./fixtures/synthetic";

test("derives labels and explicit destinations only from single workspace-focus commands", () => {
  const bindings = parseBindings(syntheticConfig);
  assert.deepEqual(bindings.map((b) => [b.workspace, b.label]), [
    ["code", "alt+1"], ["code", "ctrl+shift+c"], ["break", "alt+2"], ["research", "win+3"], ["research", "lalt+3"],
  ]);
  assert.deepEqual(bindings[1].shortcut, { modifiers: ["ctrl", "shift"], key: "c" });
  assert.deepEqual(bindings[3].shortcut, { modifiers: ["windows"], key: "3" });
  assert.equal(bindings[4].shortcut, undefined); // do not strip or broaden lalt
});
test("unmodified, unsupported, reserved, and ambiguous keys keep labels but cannot be registered", () => {
  const config = "keybindings:\n" + ["h", "alt+h", "ctrl+k", "alt+f1", "alt+alt+1", "ctrl+alt+9", "alt+ctrl+9"].map((key) =>
    `  - commands: ['focus --workspace code']\n    bindings: ['${key}']`).join("\n");
  const bindings = parseBindings(config);
  assert.equal(bindings.length, 7);
  assert.ok(bindings.every((b) => b.shortcut === undefined));
});
test("rejects command chains, move bindings, relative focus, quoted multiword names and extra flags", () => {
  const commands = ["focus --workspace x; shell-exec bad", "focus --workspace x && shell-exec bad", "move --workspace x",
    "focus --next-workspace", "focus --workspace x --monitor 0", 'focus --workspace "two words"', "focus --workspace"];
  for (const command of commands) assert.deepEqual(parseBindings(`keybindings:\n  - commands: [${JSON.stringify(command)}]\n    bindings: ['alt+1']`), []);
});
test("accepts --workspace=name and preserves exact destination names", () => {
  assert.equal(parseBindings("keybindings:\n  - commands: ['focus --workspace=Case-Sensitive']\n    bindings: ['ALT+4']")[0].workspace, "Case-Sensitive");
});
test("malformed YAML and duplicated keys fail with a useful warning", () => {
  assert.throws(() => parseBindings("keybindings: ["), /valid YAML/);
  assert.throws(() => parseBindings("keybindings: []\nkeybindings: []"), /valid YAML/);
  assert.throws(() => parseBindings("workspaces: []"), /keybindings/);
});
test("config discovery follows CLI, environment, then dynamic home without changing files", () => {
  assert.equal(resolveConfigPath(['glazewm.exe start --config="D:\\My Files\\custom.yaml"'], "E:\\env.yaml", "C:\\Users\\Synthetic"), "D:\\My Files\\custom.yaml");
  assert.equal(resolveConfigPath(['glazewm.exe start -c "D:\\My Files\\custom.yaml"'], undefined, "C:\\Users\\Synthetic"), "D:\\My Files\\custom.yaml");
  assert.equal(resolveConfigPath(["glazewm.exe start"], "E:\\env.yaml", "C:\\Users\\Synthetic"), "E:\\env.yaml");
  assert.equal(resolveConfigPath(["glazewm.exe start"], undefined, "C:\\Users\\Synthetic"), "C:\\Users\\Synthetic\\.glzr\\glazewm\\config.yaml");
  assert.throws(() => resolveConfigPath(["glazewm.exe start --config=relative.yaml"], undefined, "C:\\Users\\Synthetic"), /Relative/);
  assert.throws(() => resolveConfigPath([], undefined, "C:\\Users\\Synthetic"), /single/);
  assert.throws(() => resolveConfigPath(["a", "b"], undefined, "C:\\Users\\Synthetic"), /single/);
});
