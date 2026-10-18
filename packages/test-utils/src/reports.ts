/**
 * Holds the microtasks that report errors, and returns a function that runs them and gives the thrown errors.
 * Core reports each message only one time per module, so each test needs its own message.
 */
export function collectReports(): () => unknown[] {
  const callbacks: VoidFunction[] = [];
  vi.stubGlobal("queueMicrotask", (callback: VoidFunction) => callbacks.push(callback));
  return () => {
    const errors: unknown[] = [];
    for (const callback of callbacks) {
      try {
        callback();
      } catch (error) {
        errors.push(error);
      }
    }
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
