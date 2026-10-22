export interface Node {
  id: string;
  type: string;
  name?: string;
  displayName?: string | null;
  deviceName?: string;
  title?: string;
  hasFocus?: boolean;
  isDisplayed?: boolean;
  x?: number;
  y?: number;
  children?: Node[];
}
export interface Workspace {
  id: string;
  name: string;
  label: string;
  displayed: boolean;
  focused: boolean;
  windows: string[];
}
export interface Monitor {
  id: string;
  label: string;
  workspaces: Workspace[];
}

export function parseMonitors(value: unknown): Node[] {
  function node(value: unknown): Node {
    if (!value || typeof value !== "object") throw new Error("Invalid GlazeWM container.");
    const n = value as Record<string, unknown>;
    if (typeof n.id !== "string" || typeof n.type !== "string") throw new Error("Invalid GlazeWM container identity.");
    for (const field of ["name", "deviceName", "title"]) {
      if (n[field] !== undefined && typeof n[field] !== "string") throw new Error(`Invalid ${field}.`);
    }
    if (n.displayName !== undefined && n.displayName !== null && typeof n.displayName !== "string") throw new Error("Invalid display name.");
    for (const field of ["x", "y"]) {
      if (n[field] !== undefined && (typeof n[field] !== "number" || !Number.isFinite(n[field]))) throw new Error(`Invalid ${field}.`);
    }
    if (n.type === "workspace" && typeof n.name !== "string") throw new Error("Missing workspace name.");
    for (const field of ["hasFocus", "isDisplayed"]) {
      if (n[field] !== undefined && typeof n[field] !== "boolean") throw new Error(`Invalid ${field}.`);
    }
    if (n.children !== undefined && !Array.isArray(n.children)) throw new Error("Invalid container children.");
    return { ...n, children: (n.children as unknown[] | undefined)?.map(node) } as Node;
  }
  if (!Array.isArray(value)) throw new Error("GlazeWM did not return monitors.");
  const monitors = value.map(node);
  if (monitors.some((m) => m.type !== "monitor")) throw new Error("Invalid monitor response.");
  return monitors;
}

export function hierarchy(nodes: Node[]): Monitor[] {
  function windows(n: Node): string[] {
    return n.type === "window" ? [n.title || "Untitled window"] : (n.children ?? []).flatMap(windows);
  }
  return [...nodes].sort((a, b) => (a.x ?? 0) - (b.x ?? 0) || (a.y ?? 0) - (b.y ?? 0)).map((m) => ({
    id: m.id,
    label: m.deviceName || "Monitor",
    workspaces: (m.children ?? []).filter((w) => w.type === "workspace").map((w) => ({
      id: w.id, name: w.name!, label: w.displayName || w.name!, displayed: w.isDisplayed === true,
      focused: w.hasFocus === true, windows: windows(w),
    })).filter((w) => w.displayed || w.windows.length > 0),
  })).filter((m) => m.workspaces.length > 0);
}

export function initialSelection(monitors: Monitor[]): string | undefined {
  const all = monitors.flatMap((m) => m.workspaces);
  return (all.find((w) => w.focused) ?? all.find((w) => w.displayed) ?? all[0])?.id;
}

export function moveSelection(monitors: Monitor[], id: string | undefined, direction: "h" | "j" | "k" | "l"): string | undefined {
  const column = monitors.findIndex((m) => m.workspaces.some((w) => w.id === id));
  if (column < 0) return initialSelection(monitors);
  const row = monitors[column].workspaces.findIndex((w) => w.id === id);
  if (direction === "j" || direction === "k") {
    const next = Math.max(0, Math.min(monitors[column].workspaces.length - 1, row + (direction === "j" ? 1 : -1)));
    return monitors[column].workspaces[next].id;
  }
  const next = Math.max(0, Math.min(monitors.length - 1, column + (direction === "l" ? 1 : -1)));
  return monitors[next].workspaces[Math.min(row, monitors[next].workspaces.length - 1)].id;
}

export function focusCommand(workspace: Pick<Workspace, "id">): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspace.id)) {
    throw new Error("Invalid workspace ID; no focus command was sent.");
  }
  return `command focus --container-id ${workspace.id}`;
}
