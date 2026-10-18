// This import adds the `page` property to the command context.
import "@vitest/browser-playwright";
import type { BrowserCommand } from "vitest/node";

type ReducedMotion = "reduce" | "no-preference";

// Playwright has no `emulateMedia` for a frame, so the command changes the media of the whole page.
export const emulateReducedMotion: BrowserCommand<[options: { reducedMotion: ReducedMotion }]> = (
  ctx,
  options,
) => {
  if (ctx.provider.name !== "playwright") {
    throw new Error(`emulateReducedMotion needs the playwright provider, not ${ctx.provider.name}`);
  }
  return ctx.page.emulateMedia(options);
};
