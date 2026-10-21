import type { CascadeOptions, RevealOptions } from "@awesome-reveal/core/adapter";
// Astro's JSX entry resolves its ambient types in NodeNext; astro/types uses an extensionless import.
import type { JSX } from "astro/jsx-runtime";
import type { Polymorphic } from "astro/types";

import CascadeComponent from "./Cascade.astro";
import RevealComponent from "./Reveal.astro";

export type { CascadeOptions, RevealOptions };
export { getReveal, type RevealControl } from "./control.js";

type WithoutCallback<T> = T extends unknown ? Omit<T, "onReveal"> : never;

type TablePart = "caption" | "col" | "colgroup" | "thead" | "tbody" | "tfoot" | "tr" | "td" | "th";

/**
 * Selects an HTML tag, or `svg`, that the HTML parser keeps inside the custom element host. It
 * excludes document tags, table parts and SVG-only tags.
 */
export type RevealTag =
  | Exclude<
      Extract<keyof JSX.DefinedIntrinsicElements, keyof HTMLElementTagNameMap>,
      "html" | "head" | "body" | TablePart
    >
  | "svg";

/** Configures the rendered tag, its attributes and the serializable reveal options. */
export type RevealProps<Tag extends RevealTag = "div"> = Polymorphic<{ as: Tag }> &
  WithoutCallback<RevealOptions>;

/** Configures the rendered tag, its attributes and the serializable cascade options. */
export type CascadeProps<Tag extends RevealTag = "div"> = RevealProps<Tag> &
  Pick<CascadeOptions, "interval">;

// Only the Astro language tools resolve a .astro import, so the declarations must not contain one.
/** Renders one element and reveals it when it enters the viewport. */
export const Reveal = RevealComponent as unknown as <Tag extends RevealTag = "div">(
  props: RevealProps<Tag>,
) => any;

/**
 * Renders one element and reveals its direct element children in sequence, `interval` milliseconds
 * apart, when it enters the viewport.
 */
export const Cascade = CascadeComponent as unknown as <Tag extends RevealTag = "div">(
  props: CascadeProps<Tag>,
) => any;

export type { Side, StartState } from "@awesome-reveal/core";
