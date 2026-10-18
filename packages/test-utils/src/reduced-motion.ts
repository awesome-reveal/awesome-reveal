import { commands } from "vitest/browser";

import { settle } from "./layout";

type ReducedMotion = "reduce" | "no-preference" | null;

declare module "vitest/browser" {
  interface BrowserCommands {
    emulateReducedMotion: (options: { reducedMotion: ReducedMotion }) => Promise<void>;
  }
}

let changed = false;

// The media query change event arrives only after a rendering update, so settle() waits for it.
export async function setReducedMotion(value: ReducedMotion): Promise<void> {
  changed = true;
  await commands.emulateReducedMotion({ reducedMotion: value });
  await settle();
}

export async function resetReducedMotion(): Promise<void> {
  if (!changed) return;
  await setReducedMotion(null);
  changed = false;
}
