import source from "./guideRouting.worker.ts?source";
import type { Box } from "./geometry.ts";
import { obstacleDelta, type GuideBatch, type GuideReply, type GuideResults, type GuideRoute } from "./sceneWires.ts";

interface Request {
  boxes: Box[];
  tasks: GuideRoute[];
  receive: (paths: GuideResults) => void;
}

/** Send new work immediately. The Worker switches jobs between small batches. */
export class GuideWorker {
  private worker?: Worker;
  private nextId = 0;
  private latest?: number;
  private receivers = new Map<number, Request["receive"]>();
  private boxes: Box[] = [];
  private failed = false;

  get available() { return Boolean(this.worker); }

  start() {
    if (this.worker || this.failed) return;
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    try {
      this.worker = new Worker(url, { name: "FlowSpace guide routing" });
      this.worker.onmessage = ({ data }: MessageEvent<GuideReply>) => {
        if (data.paths.length) this.receivers.get(data.id)?.(data.paths);
        if (!data.done) return;
        this.receivers.delete(data.id);
        if (this.latest === data.id) this.latest = undefined;
      };
      this.worker.onerror = () => {
        this.dispose();
        this.failed = true;
      };
    } catch {
      this.failed = true;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  request(request: Request) {
    if (!this.worker) return;
    const id = this.latest = ++this.nextId;
    this.receivers.set(id, request.receive);
    const message: GuideBatch = {
      id,
      obstacles: this.boxes === request.boxes ? undefined : obstacleDelta(this.boxes, request.boxes),
      tasks: request.tasks,
    };
    this.boxes = request.boxes;
    this.worker.postMessage(message);
  }

  discard() {
    if (this.latest === undefined || !this.worker) return;
    this.latest = undefined;
    const message: GuideBatch = { id: ++this.nextId, tasks: [] };
    this.worker.postMessage(message);
  }

  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
    this.latest = undefined;
    this.receivers.clear();
    this.boxes = [];
  }
}
