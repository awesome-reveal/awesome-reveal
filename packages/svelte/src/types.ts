import type { CascadeOptions, RevealOptions } from "@awesome-reveal/core/adapter";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

type Attributes = Omit<HTMLAttributes<HTMLElement>, "children" | keyof CascadeOptions>;

// The components render children, and Svelte warns in development when a void `svelte:element` has content.
type VoidTag =
  | "area"
  | "base"
  | "br"
  | "col"
  | "embed"
  | "hr"
  | "img"
  | "input"
  | "link"
  | "meta"
  | "source"
  | "track"
  | "wbr";

/** Configures the reveal and the element rendered around its children. Other props become global attributes of the element. */
export type RevealProps = RevealOptions &
  Attributes & {
    /**
     * The tag of the rendered element.
     * @default "div"
     */
    as?: Exclude<keyof HTMLElementTagNameMap, VoidTag>;
    children?: Snippet<[{ revealed: boolean }]>;
  };

/** Configures the cascade and the element rendered around its children. Other props become global attributes of the element. */
export type CascadeProps = RevealProps & Pick<CascadeOptions, "interval">;
