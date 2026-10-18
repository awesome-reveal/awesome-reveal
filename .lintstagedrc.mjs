// lint-staged runs the commands with no shell, so an env prefix in a command does not work. The child process gets process.env.
process.env.REVEAL_BROWSERS ??= "chromium";

// `vitest related` fails on a browser project that imports CSS: Vitest transforms the files in the SSR environment of
// that project, and there vite:css-post throws. So the hook runs these projects in full when a file that they use changes.
const fullProjects = {
  "react:browser": /^packages\/(core|test-utils|react)\//,
  "vue:browser": /^packages\/(core|test-utils|vue)\//,
};

// A task in the "*" list runs after the formatter; a separate glob would run at the same time.
const testRelated = (files) => {
  const sources = files
    .map((file) => file.replace(`${process.cwd()}/`, ""))
    .filter((file) => /\.(tsx?|vue|svelte|astro)$/.test(file));
  if (!sources.length) return [];
  const full = Object.keys(fullProjects).filter((project) =>
    sources.some((file) => fullProjects[project].test(file)),
  );
  return [
    `vitest related --run --project "*:unit" --project "*:ssr" --project "core:browser" --project "astro:browser" ${sources.map((file) => JSON.stringify(file)).join(" ")}`,
    ...(full.length
      ? [`vitest run ${full.map((project) => `--project "${project}"`).join(" ")}`]
      : []),
  ];
};

export default {
  "*": [
    "oxlint --fix --no-error-on-unmatched-pattern",
    "oxfmt --no-error-on-unmatched-pattern",
    testRelated,
  ],
};
