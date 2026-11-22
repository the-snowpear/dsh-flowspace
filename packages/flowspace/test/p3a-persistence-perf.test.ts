import assert from "node:assert/strict";
import test from "node:test";
import { emptyDocument, newNode } from "../src/core/document.ts";
import { DocumentService } from "../src/host/documentService.ts";
import {
  capMapSize,
  createHostState,
  MAX_NATIVE_MESSAGES,
  pruneHostState,
} from "../src/host/state.ts";
import type { FlowspaceRun } from "../src/types.ts";

function fakeTable<V>() {
  const data = new Map<string, V>();
  let puts = 0;
  let deletes = 0;
  return {
    get: (k: string) => data.get(k),
    put: async (k: string, v: V) => {
      puts++;
      data.set(k, v);
    },
    delete: async (k: string) => {
      deletes++;
      data.delete(k);
    },
    keys: () => data.keys(),
    entries: () => data.entries(),
    counts: () => ({ puts, deletes }),
  };
}

function makeRun(id: string, state: FlowspaceRun["state"] = "running"): FlowspaceRun {
  return {
    id,
    title: `Run ${id}`,
    origin: "canvas",
    state,
    createdAt: 1000,
    scope: null,
    roots: [],
    participants: [],
    graph: { nodes: [], edges: [] },
    steps: [],
    tokens: [],
    notes: [],
  };
}

test("DocumentService.persist skips unchanged documents, templates, snapshots, and historical runs", async () => {
  const docs = fakeTable<unknown>();
  const templates = fakeTable<unknown>();
  const snapshots = fakeTable<unknown>();
  const runs = fakeTable<unknown>();
  const domain = {
    table: (name: string) => {
      if (name === "documents") return docs;
      if (name === "templates") return templates;
      if (name === "snapshots") return snapshots;
      if (name === "runs") return runs;
      throw new Error(`unexpected table ${name}`);
    },
  };

  const state = createHostState();
  state.doc = {
    ...emptyDocument(),
    templates: [
      {
        id: "tpl-1",
        title: "T1",
        description: "",
        revision: 1,
        nodes: [],
        edges: [],
        createdAt: 1,
      },
    ],
    snapshots: [
      {
        id: "snap-1",
        title: "S1",
        createdAt: 1,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    ],
  };
  state.runs.push(makeRun("run-old", "completed"), makeRun("run-live", "running"));

  let arenaSettles = 0;
  let publishes = 0;
  const service = new DocumentService({
    ctx: { logger: { warn: () => {} } } as never,
    domain: domain as never,
    state,
    arena: {
      settle: async () => {
        arenaSettles++;
      },
    } as never,
    teamAssets: {} as never,
    teams: {} as never,
    runtime: {} as never,
    workspaceFs: {} as never,
    getScheduler: () => ({}) as never,
    getContainers: () => ({ changes: () => [] }) as never,
    getDataFileWatch: () => ({ sync: async () => {} }) as never,
    getReferences: () => ({ syncLiveReferenceVersions: () => ({}) }) as never,
    getIngestor: () => ({}) as never,
    publish: () => {
      publishes++;
    },
  });

  // First persist after seed: nothing changed -> 0 table writes, 1 arena settle for completed run-old
  await service.persist();
  assert.equal(docs.counts().puts, 0);
  assert.equal(templates.counts().puts, 0);
  assert.equal(snapshots.counts().puts, 0);
  assert.equal(runs.counts().puts, 0);
  assert.equal(arenaSettles, 1);
  assert.equal(publishes, 1);

  // Mutate ONLY run-live: should write ONLY run-live (0 doc/template/snapshot puts, 0 re-settle)
  state.runs[1].notes.push("step 1");
  await service.persist();
  assert.equal(docs.counts().puts, 0);
  assert.equal(templates.counts().puts, 0);
  assert.equal(snapshots.counts().puts, 0);
  assert.equal(runs.counts().puts, 1);
  assert.equal(arenaSettles, 1);
  assert.equal(publishes, 2);

  // Silent persist writes changed run without incrementing publishes
  state.runs[1].state = "completed";
  await service.persist({ silent: true });
  assert.equal(runs.counts().puts, 2);
  assert.equal(arenaSettles, 2);
  assert.equal(publishes, 2);

  // Repeat persist with no changes: 0 extra writes and 0 extra arena settles
  await service.persist({ silent: true });
  assert.equal(runs.counts().puts, 2);
  assert.equal(arenaSettles, 2);
});

test("pruneHostState removes deleted nodes and bounds nativeMessages", () => {
  const state = createHostState();
  const kept = newNode("agent", 0, 0, "Kept");
  state.doc.nodes.push(kept);
  state.live.set(kept.id, {
    nodeId: kept.id,
    sessionId: "s-kept",
    running: false,
    output: "",
    seq: 1,
    pendingInput: [],
  });
  state.live.set("removed-node", {
    nodeId: "removed-node",
    sessionId: "s-removed",
    running: false,
    output: "",
    seq: 1,
    pendingInput: [],
  });
  state.nativeOperations.set("removed-node:git", {
    nodeId: "removed-node",
    kind: "git",
    command: "git status",
    at: 1,
    seq: 1,
  });
  state.injectedSteps.add("stale-step");

  for (let i = 0; i < MAX_NATIVE_MESSAGES + 25; i++) {
    state.nativeMessages.set(`m-${i}`, {
      id: `m-${i}`,
      fromSessionId: "a",
      toSessionId: "b",
      kind: "agent-message",
      text: "hi",
      seq: i,
      time: i,
    });
  }
  capMapSize(state.nativeMessages, MAX_NATIVE_MESSAGES);
  pruneHostState(state);

  assert.equal(state.live.has(kept.id), true);
  assert.equal(state.live.has("removed-node"), false);
  assert.equal(state.nativeOperations.size, 0);
  assert.equal(state.injectedSteps.size, 0);
  assert.equal(state.nativeMessages.size, MAX_NATIVE_MESSAGES);
  assert.equal(state.nativeMessages.has("m-0"), false);
  assert.equal(state.nativeMessages.has(`m-${MAX_NATIVE_MESSAGES + 24}`), true);
});
