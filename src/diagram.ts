import type { Binding } from "./config";
import type { Monitor } from "./model";

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!)
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const shortened = (text: string, limit: number) => Array.from(text).length > limit ? Array.from(text).slice(0, limit - 1).join("") + "…" : text;

export function renderDiagram(monitors: Monitor[], selected: string | undefined, bindings: Binding[], dark: boolean): string {
  const width = Math.max(1, monitors.length) * 300;
  const heights = monitors.map((m) => 64 + m.workspaces.reduce((h, w) => h + 76 + Math.max(1, w.windows.length) * 22, 0));
  const height = Math.max(120, ...heights);
  const ink = dark ? "#f4f4f5" : "#18181b";
  const muted = dark ? "#b4b4be" : "#52525b";
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${dark ? "#18181b" : "#fafafa"}"/>`;
  const text = (x: number, y: number, value: string, size = 14, color = ink) => `<text x="${x}" y="${y}" font-family="Segoe UI, sans-serif" font-size="${size}" fill="${color}">${escape(value)}</text>`;
  monitors.forEach((m, column) => {
    const x = column * 300 + 12;
    svg += text(x + 8, 30, shortened(m.label, 30), 17);
    let y = 50;
    for (const w of m.workspaces) {
      const cardHeight = 64 + Math.max(1, w.windows.length) * 22;
      svg += `<rect x="${x}" y="${y}" width="276" height="${cardHeight}" rx="8" fill="${dark ? "#27272a" : "#eeeeef"}" stroke="${w.id === selected ? "#3b82f6" : muted}" stroke-width="${w.id === selected ? 3 : 1}"/>`;
      svg += text(x + 10, y + 24, shortened(`${w.id === selected ? "▶ " : ""}${w.label}${w.displayed ? " • displayed" : ""}`, 29), 15);
      const labels = bindings.filter((b) => b.workspace === w.name).map((b) => b.label);
      svg += text(x + 10, y + 45, shortened(labels.join(" / ") || "No direct binding", 34), 12, muted);
      (w.windows.length ? w.windows : ["Empty workspace"]).forEach((title, index) => {
        svg += text(x + 10, y + 68 + index * 22, shortened(title, 34), 13, muted);
      });
      y += cardHeight + 12;
    }
  });
  return svg + "</svg>";
}

export function diagramMarkdown(svg: string): string {
  return `![GlazeWM workspace diagram](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}

export function markdownText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/([`*_{}\[\]()#+.!|>~\-])/g, "\\$1").replace(/[\r\n]+/g, " ");
}
