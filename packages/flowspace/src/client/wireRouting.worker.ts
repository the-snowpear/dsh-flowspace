import { buildRoutingResult, RouteObstacles, type RoutingBatchRequest, type RoutingBatchReply } from "./sceneWires.ts";

const obstacles = new RouteObstacles();
const BATCH_SIZE = 12;
const continuation = new MessageChannel();
let queued = false;
let current: { batch: RoutingBatchRequest; offset: number } | undefined;

function schedule() {
  if (!current || queued) return;
  queued = true;
  continuation.port2.postMessage(null);
}

continuation.port1.onmessage = () => {
  queued = false;
  if (!current) return;
  const { batch, offset } = current;
  current.offset += BATCH_SIZE;
  const results = batch.tasks.slice(offset, current.offset).flatMap(task => {
    try { return [buildRoutingResult(task, obstacles)]; }
    catch { return []; }
  });
  const done = current.offset >= batch.tasks.length;
  const reply: RoutingBatchReply = { id: batch.id, results, done };
  self.postMessage(reply);
  if (done) current = undefined;
  schedule();
};

self.addEventListener("message", ({ data }: MessageEvent<RoutingBatchRequest>) => {
  if (current) {
    const superseded: RoutingBatchReply = { id: current.batch.id, results: [], done: true };
    self.postMessage(superseded);
  }
  if (data.obstacles) obstacles.apply(data.obstacles);
  current = data.tasks.length ? { batch: data, offset: 0 } : undefined;
  schedule();
});
