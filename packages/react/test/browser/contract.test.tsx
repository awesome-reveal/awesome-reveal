import type { CSSProperties, ReactElement } from "react";
import { render } from "vitest-browser-react";

import {
  type ContractOptions,
  describeCascadeContract,
  describeContract,
  type Harness,
} from "@awesome-reveal/test-utils/contract";

import { Cascade, Reveal } from "../../src/Reveal";
import { useCascade } from "../../src/useCascade";
import { type RevealOptions, useReveal } from "../../src/useReveal";

const children = [1, 2, 3].map((n) => <span key={n}>{n}</span>);

type Tree = (
  options: ContractOptions,
  style: CSSProperties | undefined,
  swap: boolean,
) => ReactElement;

function harness(tree: Tree): Harness {
  return {
    replacesNode: true,
    async mount(options, init) {
      const style = init.style as CSSProperties | undefined;
      let current = options;
      let swap = false;
      const screen = await render(tree(current, style, swap), { container: init.container });
      const update = () => screen.rerender(tree(current, style, swap));
      return {
        element: () => screen.container.querySelector<HTMLElement>("[data-contract]")!,
        rerender: async (next) => {
          current = next;
          await update();
        },
        unmount: () => screen.unmount(),
        replaceNode: async (next) => {
          if (next) current = next;
          swap = true;
          await update();
        },
      };
    },
  };
}

describeContract(
  "React Reveal",
  harness((options, style, swap) => (
    <Reveal
      {...(options as RevealOptions)}
      as={swap ? "section" : "div"}
      style={style}
      data-contract=""
    >
      {children}
    </Reveal>
  )),
);

function HookBox({
  options,
  style,
  swap,
}: {
  options: ContractOptions;
  style?: CSSProperties;
  swap: boolean;
}) {
  const { getProps } = useReveal<HTMLElement>(options as RevealOptions);
  const Tag = swap ? "section" : "div";
  return <Tag {...getProps({ style, "data-contract": "" })}>{children}</Tag>;
}

describeContract(
  "React useReveal",
  harness((options, style, swap) => <HookBox options={options} style={style} swap={swap} />),
);

describeCascadeContract(
  "React Cascade",
  harness((options, style) => (
    <Cascade {...(options as RevealOptions)} style={style} data-contract="">
      {children}
    </Cascade>
  )),
);

function CascadeHookBox({ options }: { options: ContractOptions }) {
  const { getProps } = useCascade<HTMLElement>(options as RevealOptions);
  return <ul {...getProps({ "data-contract": "" })}>{children}</ul>;
}

describeCascadeContract(
  "React useCascade",
  harness((options) => <CascadeHookBox options={options} />),
);
