import { test } from "node:test";
import assert from "node:assert/strict";
import { hierarchy, initialSelection, moveSelection, focusCommand, parseMonitors } from "../src/model";
import { diagramMarkdown, renderDiagram } from "../src/diagram";
import { parseBindings } from "../src/config";
import { ids, syntheticMonitors, syntheticConfig } from "./fixtures/synthetic";

const monitors = hierarchy(parseMonitors(syntheticMonitors));
test("filters hidden empty workspaces and empty monitors, preserving occupied and displayed empty workspaces", () => {
  assert.deepEqual(monitors.map((m) => [m.label, m.workspaces.map((w) => w.name)]), [
    ["Synthetic Left", ["code", "break"]], ["Synthetic Right", ["research"]],
  ]);
  assert.deepEqual(monitors[0].workspaces[0].windows, ["Synthetic Editor <draft> & notes", "Synthetic Terminal", "Untitled window"]);
  assert.equal(monitors[0].workspaces[0].label, "Synthetic Code");
  assert.equal(monitors[0].workspaces[1].windows.length, 0);
});
test("hierarchy does not mutate the runtime snapshot", () => {
  const before = JSON.stringify(syntheticMonitors);
  hierarchy(syntheticMonitors);
  assert.equal(JSON.stringify(syntheticMonitors), before);
});
test("initial selection prefers focus, then displayed, then first workspace", () => {
  assert.equal(initialSelection(monitors), ids.displayedEmpty);
  assert.equal(initialSelection(monitors.map((m) => ({ ...m, workspaces: m.workspaces.map((w) => ({ ...w, focused: false })) }))), ids.displayedEmpty);
  assert.equal(initialSelection(monitors.map((m) => ({ ...m, workspaces: m.workspaces.map((w) => ({ ...w, focused: false, displayed: false })) }))), ids.occupied);
  assert.equal(initialSelection([]), undefined);
});
test("Vim directions move between workspace rows and monitor columns with clamping", () => {
  assert.equal(moveSelection(monitors, ids.occupied, "j"), ids.displayedEmpty);
  assert.equal(moveSelection(monitors, ids.displayedEmpty, "j"), ids.displayedEmpty);
  assert.equal(moveSelection(monitors, ids.displayedEmpty, "k"), ids.occupied);
  assert.equal(moveSelection(monitors, ids.occupied, "k"), ids.occupied);
  assert.equal(moveSelection(monitors, ids.displayedEmpty, "l"), ids.second);
  assert.equal(moveSelection(monitors, ids.second, "l"), ids.second);
  assert.equal(moveSelection(monitors, ids.second, "h"), ids.occupied);
  assert.equal(moveSelection(monitors, ids.occupied, "h"), ids.occupied);
  assert.equal(moveSelection(monitors, "missing", "j"), ids.displayedEmpty);
  assert.equal(moveSelection([], undefined, "j"), undefined);
});
test("workspace command targets only a validated runtime ID, never a title or name", () => {
  assert.equal(focusCommand({ id: ids.occupied }), `command focus --container-id ${ids.occupied}`);
  assert.throws(() => focusCommand({ id: "123; shell-exec bad" }), /Invalid workspace ID/);
  assert.throws(() => focusCommand({ id: "window-editor" }), /Invalid workspace ID/);
});
test("invalid protocol shapes fail rather than silently produce an empty navigator", () => {
  for (const bad of [null, {}, [{ id: "x" }], [{ id: "x", type: "window" }], [{ id: "m", type: "monitor", children: "oops" }],
    [{ id: "m", type: "monitor", children: [{ id: "w", type: "workspace", name: "x", isDisplayed: "true" }] }]]) {
    assert.throws(() => parseMonitors(bad));
  }
});
test("SVG renders columns, escapes titles, highlights only the selection, and hides omitted workspaces", () => {
  const svg = renderDiagram(monitors, ids.occupied, parseBindings(syntheticConfig), true);
  assert.match(svg, /Synthetic Left/); assert.match(svg, /Synthetic Right/);
  assert.match(svg, /&lt;draft&gt; &amp; notes/);
  assert.match(svg, /Empty workspace/); assert.match(svg, /alt\+1/);
  assert.doesNotMatch(svg, /Synthetic Omitted|>hidden<|>unused</);
  assert.equal((svg.match(/stroke-width="3"/g) ?? []).length, 1);
  assert.match(svg, /width="600"/);
  assert.match(diagramMarkdown(svg), /^!\[.*\]\(data:image\/svg\+xml;base64,/);
  const light = renderDiagram(monitors, ids.second, [], false);
  assert.match(light, /#fafafa/);
});
