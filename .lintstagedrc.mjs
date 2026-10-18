// lint-staged runs the commands with no shell, so an env prefix in a command does not work. The child process gets process.env.
process.env.REVEAL_BROWSERS ??= "chromium";

// A task in the "*" list runs after the formatter; a separate glob would run at the same time.
const testRelated = (files) => {
  const sources = files.filter((file) => /\.(tsx?|vue|svelte|astro)$/.test(file));
  return sources.length
    ? `vitest related --run --project "*:unit" --project "*:ssr" --project "*:browser" ${sources.map((file) => JSON.stringify(file)).join(" ")}`
    : [];
};

export default {
  "*": [
    "oxlint --fix --no-error-on-unmatched-pattern",
    "oxfmt --no-error-on-unmatched-pattern",
    testRelated,
  ],
};
