/** Controls the reveal of one element that `Reveal` or `Cascade` rendered. */
export interface RevealControl {
  /** Controls the reveal manually, as the `when` prop does. `null` gives the control to the viewport, and a revealed element stays revealed. */
  when: boolean | null;
  /** Tells if the element is revealed. It stays `false` until the client script attaches the element. */
  readonly revealed: boolean;
}

/**
 * Gets the control of an element that `Reveal` or `Cascade` rendered. Get the element again after
 * a `<ClientRouter />` navigation, which renders new elements.
 * @throws For any other element.
 */
export function getReveal(element: Element): RevealControl {
  const host = element.parentElement;
  if (host?.localName !== "awesome-reveal" || host.firstElementChild !== element)
    throw new Error(
      "getReveal() needs the element that Reveal or Cascade rendered. The HTML parser moves the element out of its parent when the parent cannot contain it, such as a <p>.",
    );
  return {
    // Keep in sync with readWhen() in element.ts.
    get when() {
      const when = host.getAttribute("when");
      return when == null ? null : when !== "false";
    },
    // The host reads the attribute when it connects, so a value set before the upgrade applies.
    set when(value) {
      if (value == null) host.removeAttribute("when");
      else host.setAttribute("when", value ? "true" : "false");
    },
    get revealed() {
      return (host as { revealed?: boolean }).revealed ?? false;
    },
  };
}
