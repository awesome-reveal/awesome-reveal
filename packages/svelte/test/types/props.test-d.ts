import type { Attachment } from "svelte/attachments";

import { cascade, type CascadeProps, reveal, type RevealProps } from "../../src/index";

describe("RevealProps", () => {
  it("accepts the options, a tag and global attributes", () => {
    expectTypeOf<{
      as: "section";
      from: "left";
      duration: 300;
      when: null;
      class: "card";
      "data-test": "x";
      onReveal: (element: Element) => void;
    }>().toExtend<RevealProps>();
  });

  it("rejects keyframes together with from", () => {
    expectTypeOf<{ from: "left"; keyframes: Keyframe[] }>().not.toExtend<RevealProps>();
  });

  it("rejects an unknown tag", () => {
    expectTypeOf<{ as: "foo" }>().not.toExtend<RevealProps>();
  });

  it("rejects a void tag, because the components render children", () => {
    expectTypeOf<{ as: "img" }>().not.toExtend<RevealProps>();
  });

  it("gives interval to the cascade", () => {
    expectTypeOf<{ interval: 100 }>().toExtend<CascadeProps>();
  });
});

describe("attachments", () => {
  it("take an options getter and return an attachment", () => {
    expectTypeOf(reveal()).toEqualTypeOf<Attachment>();
    expectTypeOf(reveal(() => ({ when: true, duration: 300 }))).toEqualTypeOf<Attachment>();
    expectTypeOf(cascade(() => ({ interval: 50 }))).toEqualTypeOf<Attachment>();
    // @ts-expect-error the options are a getter
    reveal({ duration: 300 });
    // @ts-expect-error a reveal has no interval
    reveal(() => ({ interval: 50 }));
  });
});
