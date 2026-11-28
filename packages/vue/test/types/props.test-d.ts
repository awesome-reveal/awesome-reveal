import type { RevealOptions } from "@awesome-reveal/core/adapter";
import type { Directive } from "vue";

import type { CascadeProps, RevealProps } from "../../src";
import { vReveal } from "../../src";

// Templates.vue holds the template checks. vue-tsc checks it with this file.
test("Reveal takes the core options and as", () => {
  expectTypeOf<RevealProps>().toExtend<RevealOptions>();
  expectTypeOf<"section">().toExtend<RevealProps["as"]>();
});

test("as accepts a table tag and a custom element", () => {
  expectTypeOf<"tbody">().toExtend<CascadeProps["as"]>();
  expectTypeOf<"my-card">().toExtend<RevealProps["as"]>();
});

test("as rejects a void tag", () => {
  expectTypeOf<"img">().not.toExtend<RevealProps["as"]>();
  expectTypeOf<"input">().not.toExtend<CascadeProps["as"]>();
});

test("as rejects a tag whose children cannot hydrate", () => {
  expectTypeOf<"textarea">().not.toExtend<RevealProps["as"]>();
  expectTypeOf<"title">().not.toExtend<RevealProps["as"]>();
  expectTypeOf<"template">().not.toExtend<RevealProps["as"]>();
  expectTypeOf<"body">().not.toExtend<CascadeProps["as"]>();
  expectTypeOf<"unknown">().not.toExtend<RevealProps["as"]>();
});

test("Reveal and Cascade take delay", () => {
  expectTypeOf<RevealProps>().toHaveProperty("delay");
  expectTypeOf<CascadeProps>().toHaveProperty("delay");
});

test("v-reveal takes the core options or nothing", () => {
  expectTypeOf(vReveal).toEqualTypeOf<Directive<HTMLElement, RevealOptions | undefined>>();
});
