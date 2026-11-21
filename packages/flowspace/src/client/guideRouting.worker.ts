import { buildGuideRoute, RouteObstacles, type GuideBatch, type GuideReply, type GuideResults } from "./sceneWires.ts";

const obstacles = new RouteObstacles();
const BATCH_SIZE = 12;
const continuation = new MessageChannel();
let queued = false;
let current: { batch: GuideBatch; offset: number } | undefined;

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
  const paths: GuideResults = batch.tasks.slice(offset, current.offset).map(task => [task.id, buildGuideRoute(task, obstacles)]);
  const done = current.offset >= batch.tasks.length;
  const reply: GuideReply = { id: batch.id, paths, done };
  self.postMessage(reply);
  if (done) current = undefined;
  schedule();
};

self.addEventListener("message", ({ data }: MessageEvent<GuideBatch>) => {
  if (current) {
    const superseded: GuideReply = { id: current.batch.id, paths: [], done: true };
    self.postMessage(superseded);
  }
  if (data.obstacles) obstacles.apply(data.obstacles);
  current = data.tasks.length ? { batch: data, offset: 0 } : undefined;
  schedule();
});
