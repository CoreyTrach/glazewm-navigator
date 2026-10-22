import type { Node } from "../../src/model";

// Entirely SYNTHETIC data. IDs, monitors, names, and titles are invented.
export const ids = {
  occupied: "11111111-1111-4111-8111-111111111111",
  displayedEmpty: "22222222-2222-4222-8222-222222222222",
  hiddenEmpty: "33333333-3333-4333-8333-333333333333",
  second: "44444444-4444-4444-8444-444444444444",
  omitted: "55555555-5555-4555-8555-555555555555",
};
export const syntheticMonitors: Node[] = [
  { id: "monitor-right", type: "monitor", deviceName: "Synthetic Right", x: 1920, children: [
    { id: ids.second, type: "workspace", name: "research", isDisplayed: true, children: [
      { id: "window-research", type: "window", title: "Synthetic Reference" },
    ] },
  ] },
  { id: "monitor-left", type: "monitor", deviceName: "Synthetic Left", x: 0, children: [
    { id: ids.occupied, type: "workspace", name: "code", displayName: "Synthetic Code", isDisplayed: false, children: [
      { id: "split-outer", type: "split", children: [
        { id: "window-editor", type: "window", title: "Synthetic Editor <draft> & notes" },
        { id: "split-inner", type: "split", children: [
          { id: "window-terminal", type: "window", title: "Synthetic Terminal" },
          { id: "window-untitled", type: "window", title: "" },
        ] },
      ] },
    ] },
    { id: ids.displayedEmpty, type: "workspace", name: "break", isDisplayed: true, hasFocus: true, children: [] },
    { id: ids.hiddenEmpty, type: "workspace", name: "hidden", isDisplayed: false, children: [{ id: "empty-split", type: "split", children: [] }] },
  ] },
  { id: "monitor-omitted", type: "monitor", deviceName: "Synthetic Omitted", x: 3840, children: [
    { id: ids.omitted, type: "workspace", name: "unused", isDisplayed: false, children: [] },
  ] },
];

export const syntheticConfig = `# SYNTHETIC GlazeWM YAML; never read by production.
keybindings:
  - commands: ['focus --workspace code']
    bindings: ['alt+1', 'ctrl+shift+c']
  - commands: ['focus --workspace break']
    bindings: ['alt+2']
  - commands: ['focus --workspace research']
    bindings: ['win+3', 'lalt+3']
  - commands: ['move --workspace code']
    bindings: ['alt+shift+1']
  - commands: ['move --workspace break', 'focus --workspace break']
    bindings: ['alt+shift+2']
  - commands: ['focus --next-workspace']
    bindings: ['alt+n']
binding_modes:
  - name: synthetic-mode
    keybindings:
      - commands: ['focus --workspace code']
        bindings: ['alt+9']
`;
