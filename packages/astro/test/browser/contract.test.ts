import {
  describeCascadeContract,
  describeContract,
  type ContractOptions,
  type Harness,
} from "@awesome-reveal/test-utils/contract";

import { getReveal } from "../../src/control";

// Builds the markup of Host.astro by hand. ssr.test.ts checks the real server output.
const harness = (cascade: boolean): Harness => ({
  async mount(options, init) {
    const host = document.createElement("awesome-reveal");
    if (cascade) host.setAttribute("cascade", "");
    const element = document.createElement("div");
    element.setAttribute("data-contract", "");
    element.setAttribute("data-awesome-reveal", cascade ? "cascade" : "hidden");
    Object.assign(element.style, init.style);
    element.innerHTML = "<span>1</span><span>2</span><span>3</span>";
    host.append(element);
    const reveal = getReveal(element);
    let current = options;
    const write = ({ when, onReveal, ...rest }: ContractOptions) => {
      host.setAttribute("options", JSON.stringify(rest));
      reveal.when = when ?? null;
    };
    write(options);
    element.addEventListener("reveal", () => current.onReveal?.(element));
    init.container.append(host);
    return {
      element: () => element,
      rerender: async (next) => {
        current = next;
        write(next);
      },
      unmount: async () => {
        host.remove();
        await Promise.resolve();
      },
    };
  },
});

describeContract("Astro <awesome-reveal>", harness(false));

describeCascadeContract("Astro <awesome-reveal cascade>", harness(true));
