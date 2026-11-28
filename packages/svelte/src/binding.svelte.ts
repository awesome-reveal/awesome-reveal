import "./reveal.css";

import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import type { CascadeOptions, RevealStore } from "@awesome-reveal/core/adapter";

export function bind(
  create: (options: CascadeOptions) => RevealStore<CascadeOptions>,
  hidden: Record<"data-awesome-reveal", string>,
  options: () => CascadeOptions,
) {
  const store = untrack(() => create(options()));
  let revealed = $state(store.revealed);
  store.subscribe((value) => (revealed = value));
  // A component effect runs after the attachments of its template, so a new element attaches before a new `when` plays.
  $effect(() => {
    const next = options();
    untrack(() => store.setOptions(next));
  });
  const attach: Attachment = (element) => {
    // `onReveal` can run here, and its reads must not make the attachment run again.
    untrack(() => store.attach(element));
    return () => store.attach(null);
  };
  return {
    get revealed() {
      return revealed;
    },
    get hidden() {
      return revealed ? undefined : hidden["data-awesome-reveal"];
    },
    attach,
  };
}
