import "#reveal-style.css";

import {
  defineComponent,
  h,
  onMounted,
  type PropType,
  type DefineSetupFnComponent,
  ref,
  type SlotsType,
  watch,
} from "vue";

import {
  type CascadeOptions,
  cascadeHiddenAttributes,
  createCascade,
  createReveal,
  hiddenAttributes,
  type RevealOptions,
  type RevealStore,
} from "@awesome-reveal/core/adapter";

type WithoutCallback<T> = T extends unknown ? Omit<T, "onReveal"> : never;

// The server renders no children in a void tag, so the hydration of the slot fails.
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

// The parser reads the content of these tags as text or as a template fragment, or it drops the tag in the body.
// The hydration of the slot then fails, and for `template` it throws.
type UnhydratableTag =
  | "body"
  | "head"
  | "html"
  | "iframe"
  | "noscript"
  | "script"
  | "style"
  | "template"
  | "textarea"
  | "title";

/** Configures the reveal and the element rendered around its slot. */
export type RevealProps = WithoutCallback<RevealOptions> & {
  /**
   * The tag of the rendered element: an HTML tag that can contain the slot, or a custom element.
   * @default "div"
   */
  as?: Exclude<keyof HTMLElementTagNameMap, VoidTag | UnhydratableTag> | `${string}-${string}`;
};

/** Configures the cascade and the element rendered around its slot. */
export type CascadeProps = RevealProps & Pick<CascadeOptions, "interval">;

type RuntimeProps = Omit<CascadeProps, "from" | "keyframes"> & {
  from?: RevealOptions["from"];
  keyframes?: Keyframe[];
};

type Component<Props extends Record<string, unknown>> = DefineSetupFnComponent<
  Props,
  { reveal: (element: Element) => void },
  SlotsType<{ default: { revealed: boolean } }>
>;

function defineReveal(
  name: string,
  create: (options: CascadeOptions) => RevealStore<CascadeOptions>,
  hidden: Record<"data-awesome-reveal", string>,
  extraProps: { interval?: NumberConstructor } = {},
) {
  return defineComponent(
    (props: RuntimeProps, { emit, slots }) => {
      const options = (): CascadeOptions =>
        ({
          ...props,
          onReveal: (element) => emit("reveal", element),
        }) as CascadeOptions;
      const state = create(options());
      const revealed = ref(state.revealed);
      state.subscribe((value) => (revealed.value = value));
      // The watcher runs after the patch, so a new element of the same tick plays with the new options.
      watch(options, state.setOptions, { flush: "post" });
      // Attaches in onMounted, which a pending Suspense defers while the element is outside the document.
      let element: Element | null = null;
      let mounted = false;
      const attach = (node: unknown) => {
        element = node as Element | null;
        if (mounted) state.attach(element);
      };
      onMounted(() => {
        mounted = true;
        // Suspense defers the watcher too.
        state.setOptions(options());
        state.attach(element);
      });

      return () =>
        h(
          props.as ?? "div",
          revealed.value ? { ref: attach } : { ref: attach, ...hidden },
          slots.default?.({ revealed: revealed.value }),
        );
    },
    {
      name,
      props: {
        as: String as PropType<RevealProps["as"]>,
        keyframes: Array as PropType<RevealOptions["keyframes"]>,
        from: [String, Object] as PropType<RevealOptions["from"]>,
        duration: Number,
        delay: Number,
        threshold: Number,
        // Vue casts an absent Boolean prop to false, which would make `when` control the reveal.
        when: { type: Boolean, default: undefined },
        ...extraProps,
      },
      emits: { reveal: (element: Element) => element != null },
      slots: Object as SlotsType<{ default: { revealed: boolean } }>,
    },
  );
}

/** Renders an element around its slot and reveals it when it enters the viewport. It emits `reveal` with the element. */
export const Reveal = /* @__PURE__ */ defineReveal(
  "Reveal",
  createReveal,
  hiddenAttributes,
) as unknown as Component<RevealProps>;

/**
 * Renders an element and reveals its direct element children in sequence, `interval` milliseconds
 * apart, when it enters the viewport.
 */
export const Cascade = /* @__PURE__ */ defineReveal(
  "Cascade",
  createCascade,
  cascadeHiddenAttributes,
  {
    interval: Number,
  },
) as unknown as Component<CascadeProps>;
