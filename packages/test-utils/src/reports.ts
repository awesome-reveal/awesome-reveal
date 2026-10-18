/**
 * Collects the errors that microtasks throw, such as the reports of core, and returns an async function
 * that gives them after the queued microtasks ran. The wrapper runs each microtask at once, because
 * React `act` and the adapters schedule their own work with `queueMicrotask`.
 * Core reports each message only one time per module, so each test and each repeat needs its own message.
 */
export function collectReports(): () => Promise<unknown[]> {
  const errors: unknown[] = [];
  const original = globalThis.queueMicrotask;
  vi.stubGlobal("queueMicrotask", (callback: VoidFunction) =>
    original(() => {
      try {
        callback();
      } catch (error) {
        errors.push(error);
      }
    }),
  );
  return async () => {
    await new Promise((resolve) => setTimeout(resolve));
    return errors;
  };
}

const collectedMessages = new Set<string>();

/**
 * Collects the errors of the window error event, where the browser reports an error of a custom element
 * callback, and returns a function that stops the collection and gives the errors.
 * Vitest relays each window error to `console.error`, also after `preventDefault()`. A capture listener
 * with `stopImmediatePropagation()` does not stop the relay in Chromium.
 */
export function collectWindowErrors(): () => unknown[] {
  const errors: unknown[] = [];
  const onError = (event: ErrorEvent) => {
    event.preventDefault();
    collectedMessages.add(event.message);
    errors.push(event.error);
  };
  window.addEventListener("error", onError);
  return () => {
    window.removeEventListener("error", onError);
    return errors;
  };
}

export function isCollectedWindowError(args: unknown[]): boolean {
  const [error] = args;
  return args.length === 1 && error instanceof Error && collectedMessages.has(error.message);
}
