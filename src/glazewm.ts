import WebSocket from "ws";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { parseBindings, resolveConfigPath, type Binding } from "./config";
import { focusCommand, hierarchy, parseMonitors, type Monitor, type Workspace } from "./model";

export const ENDPOINT = "ws://127.0.0.1:6123";
export type Request = (command: string) => Promise<unknown>;

// A new short-lived connection per operation. No subscription or persistent cache.
export function createRequest(endpoint = ENDPOINT, timeoutMs = 4000): Request {
  return (command) => new Promise((resolve, reject) => {
    const socket = new WebSocket(endpoint, { maxPayload: 16 * 1024 * 1024 });
    let settled = false;
    const finish = (error?: Error, data?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.terminate();
      if (error) reject(error); else resolve(data);
    };
    const timer = setTimeout(() => finish(new Error("GlazeWM did not reply in time. Check that it is running.")), timeoutMs);
    socket.on("error", () => finish(new Error("Cannot reach GlazeWM at its local WebSocket. Start GlazeWM and try again.")));
    socket.on("close", () => finish(new Error("GlazeWM closed the connection before replying.")));
    socket.on("open", () => socket.send(command));
    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.messageType !== "client_response" || message.clientMessage !== command) return;
        if (message.success !== true) finish(new Error(typeof message.error === "string" ? message.error : "GlazeWM rejected the request."));
        else finish(undefined, message.data);
      } catch { finish(new Error("GlazeWM returned invalid JSON.")); }
    });
  });
}

export async function readMonitors(request: Request): Promise<Monitor[]> {
  const data = await request("query monitors");
  return hierarchy(parseMonitors((data as { monitors?: unknown } | null)?.monitors));
}

export async function activateWorkspace(workspace: Workspace, request: Request, dismiss: () => Promise<void>): Promise<void> {
  // Recheck runtime identity: never activate a new workspace with the old name.
  const current = await readMonitors(request);
  if (!current.some((m) => m.workspaces.some((w) => w.id === workspace.id))) {
    throw new Error("That workspace disappeared or is no longer shown. Close and reopen the navigator for a fresh snapshot.");
  }
  await request(focusCommand(workspace));
  await dismiss();
}

export async function readConfigBindings(): Promise<Binding[]> {
  if (process.platform !== "win32") throw new Error("Config discovery requires Windows. Cloud fixtures are synthetic.");
  // Built-in Windows process metadata; no helper app and no command execution
  // from configuration. Do not print process command lines or file contents.
  const { stdout } = await promisify(execFile)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); ConvertTo-Json -Compress -InputObject @((Get-CimInstance Win32_Process -Filter \"Name='glazewm.exe'\").CommandLine)"],
  { timeout: 4000, windowsHide: true });
  const lines: unknown = JSON.parse(stdout.replace(/^\uFEFF/, "").trim());
  if (!Array.isArray(lines) || !lines.every((s) => typeof s === "string" && s.length > 0)) throw new Error("GlazeWM process configuration is inaccessible.");
  const path = resolveConfigPath(lines, process.env.GLAZEWM_CONFIG_PATH, homedir());
  return parseBindings(await readFile(path, "utf8"));
}
