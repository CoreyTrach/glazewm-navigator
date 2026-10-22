import { parseDocument } from "yaml";
import { win32 } from "node:path";
import type { Keyboard } from "@raycast/api";

export type Modifier = "alt" | "ctrl" | "shift" | "windows";
export interface Binding {
  workspace: string;
  label: string;
  shortcut?: { modifiers: Modifier[]; key: Keyboard.KeyEquivalent };
}

// Deliberately narrow: no chains, relative destinations, binding modes, or
// reinterpretation of side-specific modifiers. Labels preserve the original.
export function parseBindings(source: string): Binding[] {
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length) throw new Error("GlazeWM configuration is not valid YAML.");
  const config = doc.toJS({ maxAliasCount: 50 });
  if (!config || !Array.isArray(config.keybindings)) throw new Error("No keybindings array in GlazeWM configuration.");
  const result: Binding[] = [];
  for (const entry of config.keybindings) {
    if (!entry || !Array.isArray(entry.commands) || entry.commands.length !== 1 || !Array.isArray(entry.bindings)) continue;
    if (typeof entry.commands[0] !== "string") continue;
    // GlazeWM's IPC/config parser uses split_whitespace, not shell quoting.
    const match = /^focus\s+--workspace(?:\s+|=)([^\s"';&|]+)\s*$/.exec(entry.commands[0].trim());
    if (!match) continue;
    for (const label of entry.bindings) {
      if (typeof label !== "string") continue;
      const parts = label.toLowerCase().split("+").map((p: string) => p.trim());
      const key = parts.pop()!;
      const mods = parts.map((p: string) => p === "win" ? "windows" : p);
      const supported = mods.length > 0 && mods.every((m: string) => ["alt", "ctrl", "shift", "windows"].includes(m))
        && new Set(mods).size === mods.length && /^[a-z0-9]$/.test(key);
      const reserved = (mods.length === 1 && mods[0] === "alt" && "hjkl".includes(key))
        || (mods.includes("ctrl") && ["k", "r"].includes(key));
      result.push({ workspace: match[1], label, shortcut: supported && !reserved
        ? { modifiers: mods as Modifier[], key: key as Keyboard.KeyEquivalent } : undefined });
    }
  }
  // Never resolve ambiguous shortcuts by silently choosing a destination.
  const identity = (b: Binding) => b.shortcut ? [...b.shortcut.modifiers].sort().join("+") + "+" + b.shortcut.key : undefined;
  const counts = new Map<string, number>();
  for (const b of result) { const key = identity(b); if (key) counts.set(key, (counts.get(key) ?? 0) + 1); }
  return result.map((b) => ({ ...b, shortcut: (counts.get(identity(b) ?? "") ?? 0) > 1 ? undefined : b.shortcut }));
}

export function resolveConfigPath(commandLines: string[], envPath: string | undefined, home: string): string {
  if (commandLines.length !== 1) throw new Error("Cannot identify a single GlazeWM process for configuration discovery.");
  const matches = [...commandLines[0].matchAll(/(?:^|\s)(?:--config|-c)(?:=|\s+)(?:"([^"]+)"|([^\s"]+))/g)];
  if (matches.length > 1) throw new Error("Ambiguous GlazeWM configuration arguments.");
  if (!matches.length && /(?:^|\s)(?:--config|-c)(?:=|\s|$)/.test(commandLines[0])) {
    throw new Error("Cannot safely parse GlazeWM's config argument.");
  }
  const path = matches[0]?.[1] ?? matches[0]?.[2] ?? envPath ?? win32.join(home, ".glzr", "glazewm", "config.yaml");
  if (!win32.isAbsolute(path)) throw new Error("Relative GlazeWM config paths cannot be resolved safely from Raycast.");
  return path;
}
