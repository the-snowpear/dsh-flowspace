import { useCallback, useRef, useState } from "react";

export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const inFlight = useRef(false);

  const run = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      return await fnRef.current(...args);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : String(failure));
      return undefined;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return { run, pending, error, setError, clearError };
}
