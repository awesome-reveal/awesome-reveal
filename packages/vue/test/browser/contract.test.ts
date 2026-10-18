import { cleanup, render } from "vitest-browser-vue";
import { h, nextTick, shallowRef, type StyleValue, type VNode, withDirectives } from "vue";

import {
  type ContractOptions,
  describeCascadeContract,
  describeContract,
  type Harness,
} from "@awesome-reveal/test-utils/contract";

import { Cascade, Reveal } from "../../src/Reveal";
import { vCascade, vReveal } from "../../src/vReveal";

const children = () => [1, 2, 3].map((n) => h("span", n));

type Tree = (options: ContractOptions, style: StyleValue | undefined, swap: boolean) => VNode;

function harness(tree: Tree): Harness {
  return {
    replacesNode: true,
    async mount(options, init) {
      const state = shallowRef({ options, swap: false });
      let error: unknown;
      await render(
        { render: () => tree(state.value.options, init.style as StyleValue, state.value.swap) },
        {
          container: init.container,
          global: {
            config: {
              errorHandler: (thrown) => {
                error = thrown;
              },
            },
          },
        },
      );
      if (error) {
        cleanup();
        throw error;
      }
      return {
        element: () => init.container.querySelector<HTMLElement>("[data-contract]")!,
        rerender: async (next) => {
          state.value = { ...state.value, options: next };
          await nextTick();
        },
        // screen.unmount() keeps the wrapper in the list of the library, so its next cleanup() unmounts the app again.
        unmount: async () => cleanup(),
        replaceNode: async (next) => {
          state.value = { options: next ?? state.value.options, swap: true };
          await nextTick();
        },
      };
    },
  };
}

describeContract(
  "Vue Reveal",
  harness((options, style, swap) =>
    h(
      Reveal,
      { ...options, as: swap ? "section" : "div", style, "data-contract": "" } as never,
      children,
    ),
  ),
);

describeContract("Vue v-reveal", {
  ...harness((options, style, swap) =>
    withDirectives(
      h(swap ? "section" : "div", { key: String(swap), style, "data-contract": "" }, children()),
      [[vReveal, options]],
    ),
  ),
  boundToElement: true,
});

describeCascadeContract(
  "Vue Cascade",
  harness((options, style) =>
    h(Cascade, { ...options, style, "data-contract": "" } as never, children),
  ),
);

describeCascadeContract(
  "Vue v-cascade",
  harness((options, style) =>
    withDirectives(h("ul", { style, "data-contract": "" }, children()), [[vCascade, options]]),
  ),
);
