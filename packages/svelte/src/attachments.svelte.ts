import "./reveal.css";

import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import {
  type CascadeOptions,
  cascadeHiddenAttributes,
  createCascade,
  createReveal,
  hiddenAttributes,
  type RevealOptions,
  type RevealStore,
} from "@awesome-reveal/core/adapter";

function defineAttachment<Options extends CascadeOptions>(
  create: (options?: Options) => RevealStore<Options>,
  hidden: Record<"data-awesome-reveal", string>,
) {
  const hide = (element: Element) =>
    element.setAttribute("data-awesome-reveal", hidden["data-awesome-reveal"]);

  // An options object would run the attachment again at each change, and replay the entrance.
  return (options?: () => Options): Attachment =>
    (element) => {
      // `create` reads the options, which can be a `$state` object, and its reads must not run the attachment again.
      const store = untrack(() => create(options?.()));
      store.subscribe((revealed) => {
        if (!revealed) hide(element);
      });
      hide(element);
      // `onReveal` can run here, and its reads must not make the attachment run again.
      untrack(() => store.attach(element));
      $effect(() => {
        const next = { ...options?.() } as Options;
        untrack(() => store.setOptions(next));
      });
      return () => {
        store.attach(null);
        element.removeAttribute("data-awesome-reveal");
      };
    };
}

/**
 * Reveals the element when it enters the viewport. Give the options as a getter, such as
 * `{@attach reveal(() => ({ when: open }))}`. Attachments do not run on the server, so use
 * `<Reveal>` for server-rendered content.
 */
export const reveal = /* @__PURE__ */ defineAttachment<RevealOptions>(
  createReveal,
  hiddenAttributes,
);

/**
 * Reveals the direct element children in sequence, `interval` milliseconds apart, when the element
 * enters the viewport. Give the options as a getter. Attachments do not run on the server, so use
 * `<Cascade>` for server-rendered content.
 */
export const cascade = /* @__PURE__ */ defineAttachment<CascadeOptions>(
  createCascade,
  cascadeHiddenAttributes,
);
