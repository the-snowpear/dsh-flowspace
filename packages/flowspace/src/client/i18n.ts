import { dict, tFor, trFor, type Locale } from "../core/i18n.ts";

export { dict, tFor, trFor, type Locale };

let language: Locale = "zh";
const subscribers = new Set<() => void>();

export const getLanguage = (): Locale =>
  language.startsWith("en") ? "en" : "zh";

export const setLanguage = (value: string): void => {
  const next: Locale = value.startsWith("en") ? "en" : "zh";
  if (next !== language) {
    language = next;
    subscribers.forEach((fn) => fn());
  }
};

export const subscribeLanguage = (fn: () => void): (() => void) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};

export function t(
  key: string,
  values?: Record<string, string | number>,
): string {
  return tFor(getLanguage(), key, values);
}

/** Only authored interface copy is translated; user text, tasks and model output stay intact. */
export function tr(text: string): string {
  return trFor(getLanguage(), text);
}
