# Official API findings

Reviewed October 22, 2026. The developers.raycast.com website was blocked by
the cloud network proxy, so the documentation was read from Raycast's official
[extensions repository](https://github.com/raycast/extensions/tree/master/docs).

- [Changelog](https://github.com/raycast/extensions/blob/master/docs/changelog.md):
  Raycast 2.0 (August 25, 2026) brings the extension API to macOS and Windows.
  The CLI requires Node.js 22.22.2 or later.
- [Manifest](https://github.com/raycast/extensions/blob/master/docs/information/manifest.md):
  extensions declare supported platforms, including `Windows`.
- [UI](https://github.com/raycast/extensions/blob/master/docs/api-reference/user-interface/README.md):
  React declarations render supported native components, rather than an
  arbitrary browser DOM.
- [Detail](https://github.com/raycast/extensions/blob/master/docs/api-reference/user-interface/detail.md):
  Markdown content with an optional metadata panel. There is no documented
  selectable workspace or monitor-column component inside Detail.
- [Changelog](https://github.com/raycast/extensions/blob/master/docs/changelog.md):
  SVG images are supported where images are accepted, including Detail Markdown.
  A generated SVG diagram could depict columns and a selection highlight;
  interaction would come from actions, not clickable SVG workspace controls.
- [Keyboard](https://github.com/raycast/extensions/blob/master/docs/api-reference/keyboard.md):
  documented action shortcuts use one or more modifiers and a key. No raw
  unmodified H/J/K/L handler is documented for Detail. Windows supports `alt`.
- [Action panel](https://github.com/raycast/extensions/blob/master/docs/api-reference/user-interface/action-panel.md):
  Enter invokes the primary action in Detail.

User-approved adaptation: an SVG monitor-column diagram
inside Detail, with Alt+H/J/K/L updating the highlighted workspace and Enter
activating it. A stacked Markdown hierarchy is another supported presentation.
Neither rendering nor Windows shortcut behavior has been tested on a desktop.
Global GlazeWM bindings may conflict with Raycast shortcuts; this requires
desktop validation. Do not silently strip modifiers to evade conflicts.
