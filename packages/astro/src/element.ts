import {
  type CascadeOptions,
  cascadeHiddenAttributes,
  createCascade,
  createReveal,
  hiddenAttributes,
  type RevealStore,
} from "@awesome-reveal/core/adapter";

const onReveal = (element: Element) =>
  element.dispatchEvent(new Event("reveal", { bubbles: true }));

// Keep in sync with getReveal(). A shared module would add a chunk to each page with a reveal.
function readWhen(host: Element): boolean | null {
  const when = host.getAttribute("when");
  return when == null ? null : when !== "false";
}

function readOptions(host: RevealElement): CascadeOptions {
  return {
    ...JSON.parse(host.getAttribute("options") || "{}"),
    when: readWhen(host),
    onReveal,
  };
}

// The TypeScript DOM lib does not have the Speculation Rules additions yet.
type PrerenderingDocument = Document & { prerendering?: boolean };

/** Controls the entrance and reveal events of an Astro-rendered element. */
export class RevealElement extends HTMLElement {
  static observedAttributes = ["options", "when"];

  private controller?: RevealStore<CascadeOptions>;

  /** Tells if the element is revealed. */
  get revealed(): boolean {
    return this.controller?.revealed ?? false;
  }

  connectedCallback() {
    if (this.controller || !this.isConnected) return;
    // A prerendered page is not visible, so it must not play the animation.
    if ((document as PrerenderingDocument).prerendering) {
      document.addEventListener("prerenderingchange", () => this.connectedCallback(), {
        once: true,
      });
      return;
    }
    const target = this.firstElementChild as HTMLElement | null;
    if (!target)
      throw new Error(
        "The HTML parser moved the element out of <awesome-reveal>. Check its parent elements.",
      );
    const cascade = this.hasAttribute("cascade");
    const hidden = (cascade ? cascadeHiddenAttributes : hiddenAttributes)["data-awesome-reveal"];
    target.setAttribute("data-awesome-reveal", hidden);
    // The options must apply at the attach, because the attach reveals an element that contains focus.
    let options: CascadeOptions = { onReveal };
    let invalid: unknown;
    try {
      options = readOptions(this);
    } catch (error) {
      invalid = error;
    }
    this.controller = cascade ? createCascade(options) : createReveal(options);
    this.controller.subscribe((visible) => {
      if (!visible) target.setAttribute("data-awesome-reveal", hidden);
    });
    this.controller.attach(target);
    // Invalid JSON throws after the reveal exists, so the viewport still reveals the element.
    if (invalid) throw invalid;
  }

  // The ClientRouter moves `transition:persist` elements with moveBefore(), which keeps the state.
  connectedMoveCallback() {}

  disconnectedCallback() {
    // Without moveBefore(), a persisted element leaves and enters the DOM in one task.
    queueMicrotask(() => {
      if (this.isConnected) return;
      this.controller?.attach(null);
      this.firstElementChild?.removeAttribute("data-awesome-reveal");
      this.controller = undefined;
    });
  }

  attributeChangedCallback() {
    this.controller?.setOptions(readOptions(this));
  }
}
