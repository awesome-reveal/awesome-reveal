import { flushSync, mount, unmount } from "svelte";

import {
  type ContractOptions,
  describeCascadeContract,
  describeContract,
  type Harness,
} from "@awesome-reveal/test-utils/contract";

import Contract from "../fixtures/Contract.svelte";

const css = (style: Partial<CSSStyleDeclaration> = {}) =>
  Object.entries(style)
    .map(([name, value]) => `${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value}`)
    .join("; ") || undefined;

function harness(kind: "Reveal" | "Cascade" | "reveal" | "cascade"): Harness {
  return {
    replacesNode: kind === "Reveal" || kind === "reveal",
    boundToElement: kind === "reveal",
    async mount(options, init) {
      const props = $state({ kind, options, style: css(init.style), swap: false });
      const app = mount(Contract, { target: init.container, props });
      flushSync();
      let mounted = true;
      return {
        element: () => init.container.querySelector<HTMLElement>("[data-contract]")!,
        rerender: async (next: ContractOptions) => {
          props.options = next;
          flushSync();
        },
        // The scenarios and the cleanup of the suite both unmount, and Svelte warns on a second unmount.
        unmount: async () => {
          if (!mounted) return;
          mounted = false;
          await unmount(app);
        },
        replaceNode: async (next?: ContractOptions) => {
          if (next) props.options = next;
          props.swap = true;
          flushSync();
        },
      };
    },
  };
}

describeContract("Svelte Reveal", harness("Reveal"));
describeContract("Svelte reveal attachment", harness("reveal"));
describeCascadeContract("Svelte Cascade", harness("Cascade"));
describeCascadeContract("Svelte cascade attachment", harness("cascade"));
