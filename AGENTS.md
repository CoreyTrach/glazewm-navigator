# GlazeWM Navigator

This is a personal Raycast extension for a Windows desktop running GlazeWM.
Develop and run automated tests in the cloud; do not require a local desktop
toolchain during initial development. Use this checkout directly, without
creating a Git worktree unless requested.

## Product constraints

- Capture fresh GlazeWM runtime state on invocation. Prefer local WebSocket
  requests. No subscriptions, background polling, or persistent state cache.
- Show monitors, workspaces, and informational window titles, including windows
  nested inside containers. Only workspaces may be selected or activated.
- Include occupied workspaces and currently displayed empty workspaces; hide
  other empty workspaces and omit monitors with no qualifying workspaces.
- Prefer a visual Detail hierarchy with monitor columns. Do not substitute a
  searchable list or a separate application without the user's agreement.
- Verify current official Raycast Windows, presentation, and keyboard APIs.
  Do not assume HTML/CSS layouts or raw unmodified H/J/K/L interception.
  The user approved an SVG monitor-column diagram in Detail with Alt+H/J/K/L
  navigation and Enter activation. Preserve this choice.
- Enter focuses the selected workspace and dismisses the extension after
  success. Escape dismisses without focusing a workspace.
- Read GlazeWM configuration without modifying it. Do not hard-code personal
  monitor names, workspace names, or configuration paths.
- Derive direct shortcuts only from straightforward explicit workspace-focus
  bindings. Preserve modifiers; reject unrelated command chains and window
  movement bindings. Skip unsupported shortcuts rather than reinterpret them.
- No custom keybinding preferences or other v1 settings. No window activation,
  thumbnails, browser tabs, YASB, Zebar, or standalone overlay/helper app.
- Handle unavailable GlazeWM and workspaces disappearing before activation.

## Validation and reporting

Keep clearly labeled synthetic fixtures separate from the production adapter.
Cover multiple monitors, occupied/displayed-empty/hidden-empty workspaces,
nested window containers, filtering, hierarchy, selection, configuration
parsing, and command generation. Test failure handling as well as success.

Report commands actually executed and their results. Cloud tests cannot prove
real Raycast rendering, Windows keyboard behavior, or GlazeWM integration.
Document eventual desktop checks in the README. Do not publish the extension
or send messages to external services without explicit authorization.
