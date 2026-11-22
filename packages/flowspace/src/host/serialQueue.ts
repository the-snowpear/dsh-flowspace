/**
 * Promise-chain serializer that ensures async operations execute one at a time
 * without breaking the chain when an individual task rejects.
 */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly onError?: (error: unknown) => void) {}

  run<T>(action: () => Promise<T>): Promise<T> {
    const next = this.tail.then(action);
    this.tail = next.then(
      () => undefined,
      (error) => {
        this.onError?.(error);
      },
    );
    return next;
  }
}

/**
 * Per-key promise serializer with automatic map cleanup once the last queued
 * operation for a key settles.
 */
export class KeyedSerialQueue {
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(private readonly onError?: (error: unknown) => void) {}

  run<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const next = previous.then(action, action);
    const settled = next.then(
      () => undefined,
      (error) => {
        this.onError?.(error);
      },
    );
    this.queues.set(key, settled);
    void settled.finally(() => {
      if (this.queues.get(key) === settled) this.queues.delete(key);
    });
    return next;
  }

  clear(): void {
    this.queues.clear();
  }
}
