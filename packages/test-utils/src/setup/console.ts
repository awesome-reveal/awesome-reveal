import { forgetCollectedWindowErrors, isCollectedWindowError } from "../reports";

// Frameworks report invalid props, missing keys, act() problems and server warnings only through the console.
beforeEach(() => {
  vi.spyOn(console, "error");
  vi.spyOn(console, "warn");
});

afterEach(() => {
  // The browser test runner relays the window errors that collectWindowErrors() collected.
  const unexpected = vi
    .mocked(console.error)
    .mock.calls.filter((args) => !isCollectedWindowError(args));
  forgetCollectedWindowErrors();
  expect(unexpected).toEqual([]);
  expect(console.warn).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
