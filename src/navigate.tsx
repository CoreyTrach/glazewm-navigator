import { Action, ActionPanel, Detail, closeMainWindow, environment, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { type Binding } from "./config";
import { diagramMarkdown, renderDiagram, markdownText } from "./diagram";
import { activateWorkspace, createRequest, readConfigBindings, readMonitors } from "./glazewm";
import { initialSelection, moveSelection, type Monitor, type Workspace } from "./model";

const request = createRequest();
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

export default function Navigate() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [selected, setSelected] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [activating, setActivating] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [snapshot, config] = await Promise.allSettled([readMonitors(request), readConfigBindings()]);
      if (!mounted) return;
      if (snapshot.status === "fulfilled") {
        setMonitors(snapshot.value); setSelected(initialSelection(snapshot.value));
      } else setError(errorText(snapshot.reason));
      if (config.status === "fulfilled") setBindings(config.value);
      else setWarning(`Config shortcuts unavailable: ${errorText(config.reason)}`);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function activate(workspace: Workspace) {
    if (busy.current) return;
    busy.current = true; setActivating(true);
    try { await activateWorkspace(workspace, request, () => closeMainWindow()); }
    catch (error) { await showToast({ style: Toast.Style.Failure, title: "Workspace was not activated", message: errorText(error) }); }
    finally { busy.current = false; setActivating(false); }
  }
  const workspace = monitors.flatMap((m) => m.workspaces).find((w) => w.id === selected);
  const svg = renderDiagram(monitors, selected, bindings, environment.appearance === "dark");
  const markdown = error ? `# GlazeWM unavailable\n\n${error}\n\nStart GlazeWM, then close and reopen this command to retry.`
    : loading ? "# GlazeWM Navigator\n\nTaking a fresh snapshot…"
    : !workspace ? "# No workspaces to show\n\nNo occupied or displayed workspaces were found. Close and reopen to refresh."
    : `${diagramMarkdown(svg)}\n\n**Alt+H/L:** monitor · **Alt+J/K:** workspace · **Enter:** activate · **Esc:** leave command\n\n${activating ? "Activating workspace…" : "Snapshot taken on invocation. Window titles are informational."}\n\n### ${markdownText(workspace.label)}\n\n${workspace.windows.length ? workspace.windows.map((title) => `- ${markdownText(title)}`).join("\n") : "Empty workspace"}\n\n${markdownText(warning ?? "")}`;
  return <Detail navigationTitle="GlazeWM Navigator" isLoading={loading || activating} markdown={markdown} actions={
    <ActionPanel>
      {workspace && !loading && !error && <Action title="Activate Workspace" onAction={() => activate(workspace)} />}
      <Action title="Dismiss Navigator" onAction={() => closeMainWindow()} />
      {workspace && !loading && !error && <ActionPanel.Section title="Move Highlight">
        {(["h", "j", "k", "l"] as const).map((direction) => <Action key={direction}
          title={({ h: "Previous Monitor", j: "Next Workspace", k: "Previous Workspace", l: "Next Monitor" })[direction]}
          shortcut={{ modifiers: ["alt"], key: direction }}
          onAction={() => { if (!busy.current) setSelected((id) => moveSelection(monitors, id, direction)); }} />)}
      </ActionPanel.Section>}
      <ActionPanel.Section title="Configured Workspace Shortcuts">
        {bindings.filter((b) => b.shortcut).flatMap((b, index) => {
          const target = monitors.flatMap((m) => m.workspaces).find((w) => w.name === b.workspace);
          if (!target || error || loading) return [];
          return [<Action key={index} title={`Focus ${target.label} (${b.label})`}
            shortcut={{ Windows: b.shortcut!, macOS: b.shortcut! }}
            onAction={() => activate(target)} />];
        })}
      </ActionPanel.Section>
    </ActionPanel>
  } />;
}
