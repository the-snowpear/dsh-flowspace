import source from "./wireRouting.worker.ts?source";
import type { Box } from "./geometry.ts";
import { obstacleDelta, type RoutingBatchReply, type RoutingBatchRequest, type RoutingResultItem, type RoutingTask } from "./sceneWires.ts";

interface Request {
  boxes: Box[];
  tasks: RoutingTask[];
  receive: (results: RoutingResultItem[], done: boolean) => void;
}

/** Send new work immediately. The Worker switches jobs between small batches. */
export class WireWorker {
  private worker?: Worker;
  private blobUrl?: string;
  private nextId = 0;
  private latest?: number;
  private receive?: Request["receive"];
  private boxes: Box[] = [];
  private failed = false;

  get available() { return Boolean(this.worker); }

  private revokeBlob() {
    if (!this.blobUrl) return;
    URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = undefined;
  }

  start(onError?: () => void) {
    if (this.worker || this.failed) return;
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    this.blobUrl = url;
    try {
      this.worker = new Worker(url, { name: "FlowSpace wire routing" });
      this.worker.onmessage = ({ data }: MessageEvent<RoutingBatchReply>) => {
        this.revokeBlob();
        if (this.latest !== data.id) return;
        const receive = this.receive;
        if (data.done) {
          this.latest = undefined;
          this.receive = undefined;
        }
        receive?.(data.results, data.done);
      };
      this.worker.onerror = () => {
        this.dispose();
        this.failed = true;
        onError?.();
      };
    } catch {
      this.revokeBlob();
      this.failed = true;
    }
  }

  request(request: Request) {
    if (!this.worker) return;
    const id = this.latest = ++this.nextId;
    this.receive = request.receive;
    const message: RoutingBatchRequest = {
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
    this.receive = undefined;
    const message: RoutingBatchRequest = { id: ++this.nextId, tasks: [] };
    this.worker.postMessage(message);
  }

  dispose() {
    this.revokeBlob();
    this.worker?.terminate();
    this.worker = undefined;
    this.latest = undefined;
    this.receive = undefined;
    this.boxes = [];
  }
}
