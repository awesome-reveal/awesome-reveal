export function mountBelowTheFold(): HTMLElement {
  document.body.innerHTML = `<div style="height: 150vh"></div><div id="target" style="height: 100px"><p>a</p><p>b</p><p>c</p></div><div style="height: 150vh"></div>`;
  scrollTo(0, 0);
  return document.getElementById("target")!;
}

export function createStage(): HTMLElement {
  document.body.innerHTML = `<div style="height: 150vh"></div><div id="stage"></div><div style="height: 150vh"></div><style>[data-contract] { height: 100px }</style>`;
  scrollTo(0, 0);
  return document.getElementById("stage")!;
}

export function scrollIntoView(element: Element) {
  element.scrollIntoView({ block: "center" });
}

/** Scrolls the element into view, and waits until it reveals. */
export async function intersect(element: HTMLElement): Promise<void> {
  scrollIntoView(element);
  await expect.element(element).not.toHaveAttribute("data-awesome-reveal");
}

export function showPart(element: Element, fraction: number) {
  const { top, height } = element.getBoundingClientRect();
  scrollTo(0, scrollY + top - innerHeight + height * fraction);
}

export function scrollToTop() {
  scrollTo(0, 0);
}

/** Waits until the observers of the current layout have reported. */
export function settle(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve))),
  );
}
