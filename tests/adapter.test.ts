import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocketServer } from "ws";
import { activateWorkspace, createRequest, readMonitors, type Request } from "../src/glazewm";
import { hierarchy } from "../src/model";
import { ids, syntheticMonitors } from "./fixtures/synthetic";

const selected = hierarchy(syntheticMonitors)[0].workspaces[0];
test("activation rechecks the snapshot, focuses by ID, then dismisses", async () => {
  const calls: string[] = [];
  const request: Request = async (command) => { calls.push(command); return { monitors: syntheticMonitors }; };
  await activateWorkspace(selected, request, async () => { calls.push("dismiss"); });
  assert.deepEqual(calls, ["query monitors", `command focus --container-id ${ids.occupied}`, "dismiss"]);
});
test("disappearing workspace never sends focus or dismisses", async () => {
  const calls: string[] = [];
  await assert.rejects(activateWorkspace(selected, async (command) => { calls.push(command); return { monitors: [] }; }, async () => { calls.push("dismiss"); }), /disappeared/);
  assert.deepEqual(calls, ["query monitors"]);
});
test("failure after recheck leaves the navigator open", async () => {
  let dismissed = false;
  const request: Request = async (command) => {
    if (command === "query monitors") return { monitors: syntheticMonitors };
    throw new Error("No container with given id");
  };
  await assert.rejects(activateWorkspace(selected, request, async () => { dismissed = true; }), /No container/);
  assert.equal(dismissed, false);
});
test("unavailable GlazeWM errors propagate without dismissal", async () => {
  await assert.rejects(readMonitors(async () => { throw new Error("unavailable"); }), /unavailable/);
});

async function withServer(handler: (server: WebSocketServer) => Promise<void>) {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  try { await handler(server); }
  finally { for (const client of server.clients) client.terminate(); await new Promise<void>((resolve) => server.close(() => resolve())); }
}
const endpoint = (server: WebSocketServer) => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test server port");
  return `ws://127.0.0.1:${address.port}`;
};
test("synthetic WebSocket server exercises actual framing, response matching and one-shot queries", async () => {
  await withServer(async (server) => {
    const commands: string[] = [];
    server.on("connection", (socket) => socket.on("message", (raw) => {
      const command = raw.toString(); commands.push(command);
      socket.send(JSON.stringify({ messageType: "event_subscription", success: true }));
      socket.send(JSON.stringify({ messageType: "client_response", clientMessage: "unrelated", success: true }));
      socket.send(JSON.stringify({ messageType: "client_response", clientMessage: command, success: true, data: { monitors: syntheticMonitors } }));
    }));
    const request = createRequest(endpoint(server), 1000);
    assert.equal((await readMonitors(request)).length, 2);
    assert.equal((await readMonitors(request)).length, 2);
    assert.deepEqual(commands, ["query monitors", "query monitors"]);
  });
});
test("WebSocket command errors reject instead of pretending activation succeeded", async () => {
  await withServer(async (server) => {
    server.on("connection", (socket) => socket.on("message", (raw) => socket.send(JSON.stringify({
      messageType: "client_response", clientMessage: raw.toString(), success: false, error: "No container with given id",
    }))));
    await assert.rejects(createRequest(endpoint(server), 1000)(`command focus --container-id ${ids.occupied}`), /No container/);
  });
});
test("WebSocket timeout closes an unresponsive connection", async () => {
  await withServer(async (server) => {
    await assert.rejects(createRequest(endpoint(server), 50)("query monitors"), /did not reply/);
  });
});
test("activation completes through a synthetic WebSocket server before dismissal", async () => {
  await withServer(async (server) => {
    const commands: string[] = [];
    let dismissed = false;
    server.on("connection", (socket) => socket.on("message", (raw) => {
      const command = raw.toString(); commands.push(command);
      socket.send(JSON.stringify({ messageType: "client_response", clientMessage: command, success: true,
        data: command === "query monitors" ? { monitors: syntheticMonitors } : { subjectContainerId: ids.occupied } }));
    }));
    await activateWorkspace(selected, createRequest(endpoint(server), 1000), async () => { dismissed = true; });
    assert.deepEqual(commands, ["query monitors", `command focus --container-id ${ids.occupied}`]);
    assert.equal(dismissed, true);
  });
});
test("malformed JSON rejects and closes the connection", async () => {
  await withServer(async (server) => {
    server.on("connection", (socket) => socket.on("message", () => socket.send("not JSON")));
    await assert.rejects(createRequest(endpoint(server), 1000)("query monitors"), /invalid JSON/);
  });
});
test("premature WebSocket close produces an actionable error", async () => {
  await withServer(async (server) => {
    server.on("connection", (socket) => socket.on("message", () => socket.close()));
    await assert.rejects(createRequest(endpoint(server), 1000)("query monitors"), /closed the connection/);
  });
});
