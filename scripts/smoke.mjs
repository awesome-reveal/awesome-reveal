// Installs the packed tarballs into a clean project outside the workspace, then builds and type-checks it.
// The cases with a browser check load the build in Chromium.
// Usage: node scripts/smoke.mjs <core|react|compat|vue|astro|astro-island|next|next-pages> [dependency@version ...]
// Build the packages first (pnpm build). Extra arguments replace the default framework dependencies.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Next.js would send telemetry on each build and start.
process.env.NEXT_TELEMETRY_DISABLED = "1";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [name, ...extra] = process.argv.slice(2);

const hiddenCheck = (render) => `
const html = ${render};
if (!html.includes('data-awesome-reveal="hidden"')) throw new Error("The server markup is not hidden: " + html);
console.log(html);
`;

const reactPage = `
<main>
  <Reveal id="top" from="left">Top</Reveal>
  <div style={{ height: "200vh" }} />
  <Reveal id="below" from="bottom">Below</Reveal>
</main>
`;

const browse = (options) => async (app, server) =>
  (await import("./smoke-browser.mjs")).verifyInBrowser(app, server, options);

const nextPage = (id, module, next, extra = "") => `
import Link from "next/link";
import { Reveal } from "${module}";

${extra}
export default function Page() {
  return (
    <main>
      <Reveal id="${id}" from={{ opacity: 0 }}>
        ${id}
      </Reveal>
      <Link href="${next}">Next</Link>
    </main>
  );
}
`;

// Each page links to the next one, and the last links home.
const nextRoutes = [
  { path: "/", id: "#top" },
  { path: "/about", id: "#about" },
  { path: "/legacy", id: "#legacy" },
];

const cases = {
  core: {
    packages: ["core"],
    deps: [],
    typescript: true,
    files: {
      "src/main.ts": `
import { reveal, cascade, type RevealHandle } from "@awesome-reveal/core";

const hero: RevealHandle = reveal(".hero");
reveal(".card", { from: "left" });
reveal(".logo", { keyframes: [{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "scale(1)" }] });
cascade(".features", { from: { opacity: 0, y: 16 }, interval: 80 });
hero.dispose();
// @ts-expect-error you cannot use from and keyframes together
reveal(document.body, { from: "left", keyframes: [{}] });

`,
      "src/ssr.ts": `
import { reveal } from "@awesome-reveal/core";

if (typeof reveal !== "function") throw new Error("reveal is not a function");
`,
    },
  },
  react: {
    packages: ["core", "react"],
    deps: ["react@19", "react-dom@19", "@types/react@19", "@types/react-dom@19"],
    typescript: true,
    verify: browse(),
    files: {
      "src/app.tsx": `
import { Reveal, useReveal } from "@awesome-reveal/react";

export function Card() {
  const { getProps } = useReveal<HTMLElement>({ from: { opacity: 0 } });
  return <article {...getProps({ className: "card" })}>Card</article>;
}

export const App = () => (
  <main>
    <Reveal id="top" from="left" onReveal={() => {}}>
      <Card />
      <Reveal from="top">Slide</Reveal>
    </Reveal>
    <div style={{ height: "200vh" }} />
    <Reveal id="below" from="bottom">
      Below
    </Reveal>
  </main>
);
`,
      "src/main.tsx": `
import { createRoot } from "react-dom/client";
import { App } from "./app.js";

createRoot(document.getElementById("root")!).render(<App />);
`,
      "src/ssr.tsx": `
import { renderToString } from "react-dom/server";
import { App } from "./app.js";

${hiddenCheck("renderToString(<App />)")}
`,
    },
  },
  compat: {
    packages: ["core", "react", "react-awesome-reveal"],
    deps: ["react@19", "react-dom@19", "@types/react@19", "@types/react-dom@19"],
    typescript: true,
    files: {
      "src/main.tsx": `
import { Reveal } from "react-awesome-reveal";

export const App = () => <Reveal from={{ opacity: 0 }}>Hello</Reveal>;
`,
      "src/ssr.tsx": `
import { renderToString } from "react-dom/server";
import { App } from "./main.js";

${hiddenCheck("renderToString(<App />)")}
`,
    },
  },
  vue: {
    packages: ["core", "vue"],
    deps: ["vue@3.5", "@vitejs/plugin-vue", "vue-tsc"],
    plugins: `import vue from "@vitejs/plugin-vue";`,
    pluginCall: "vue()",
    check: ["vue-tsc", "--noEmit"],
    verify: browse(),
    files: {
      "src/App.vue": `
<script setup lang="ts">
import { Reveal, vReveal } from "@awesome-reveal/vue";
</script>

<template>
  <Reveal id="top" from="left" @reveal="() => {}">Component</Reveal>
  <Reveal from="top" v-slot="{ revealed }">{{ revealed }}</Reveal>
  <p v-reveal="{ from: { opacity: 0 }, onReveal: () => {} }">Directive</p>
  <div style="height: 200vh"></div>
  <Reveal id="below" from="bottom">Below</Reveal>
</template>
`,
      "src/main.ts": `
import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount(document.body);
`,
      "src/ssr.ts": `
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import App from "./App.vue";

${hiddenCheck("await renderToString(createSSRApp(App))")}
`,
      "src/env.d.ts": `/// <reference types="vite/client" />`,
    },
  },
  next: {
    packages: ["core", "react", "react-awesome-reveal"],
    deps: ["next@16", "react@19", "react-dom@19", "@types/react@19", "@types/react-dom@19"],
    scaffold: false,
    build: ["next", "build"],
    verify: browse({
      paths: nextRoutes.map(({ path }) => path),
      async more(page) {
        await page.locator("#card").scrollIntoViewIfNeeded();
        await page.waitForSelector("#card:not([data-awesome-reveal])");

        // Each page mounts its own reveal after a client navigation.
        for (const { path, id } of nextRoutes.slice(1)) {
          await page.locator(`a[href="${path}"]`).click();
          await page.waitForURL(`**${path}`);
          await page.waitForSelector(`${id}:not([data-awesome-reveal])`);
        }
      },
    }),
    files: {
      // Next writes the rest. Some Next versions set "node", which cannot resolve the package exports.
      "tsconfig.json": `{ "compilerOptions": { "module": "esnext", "moduleResolution": "bundler" } }\n`,
      "app/layout.tsx": `
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      // A Server Component passes serializable reveal options, also native keyframes, to the client boundary.
      "app/page.tsx": `
import Link from "next/link";
import { Reveal } from "@awesome-reveal/react";

import { Card } from "./card";

export default function Page() {
  return (
    <main>
      <Reveal id="top" from="left">
        Top
      </Reveal>
      <div style={{ height: "200vh" }} />
      <Reveal id="below" from="bottom">
        <p>One</p>
        <p>Two</p>
      </Reveal>
      <Card />
      <Link href="/about">About</Link>
    </main>
  );
}
`,
      "app/card.tsx": `
"use client";

import { useReveal } from "@awesome-reveal/react";

export function Card() {
  const { getProps } = useReveal<HTMLElement>({ from: { opacity: 0 } });
  return <article {...getProps({ id: "card" })}>Card</article>;
}
`,
      // The other pages are prerendered. This one renders on each request.
      "app/about/page.tsx": nextPage(
        "about",
        "@awesome-reveal/react",
        "/legacy",
        'export const dynamic = "force-dynamic";',
      ),
      // The compat package re-exports the React package, so it crosses the same boundary.
      "app/legacy/page.tsx": nextPage("legacy", "react-awesome-reveal", "/"),
    },
  },
  astro: {
    packages: ["core", "astro"],
    deps: ["astro@7", "@astrojs/check", "typescript@5.9"],
    scaffold: false,
    check: ["astro", "check"],
    build: ["astro", "build"],
    verify: browse({
      paths: ["/"],
      more: (page) => page.waitForSelector("#manual:not([data-awesome-reveal])"),
    }),
    files: {
      "astro.config.mjs": `import { defineConfig } from "astro/config";\nexport default defineConfig({});\n`,
      "tsconfig.json": `{ "extends": "astro/tsconfigs/strict", "include": [".astro/types.d.ts", "**/*"], "exclude": ["dist"] }\n`,
      "src/pages/index.astro": `
---
import { Reveal } from "@awesome-reveal/astro";
---

<Reveal id="top" from={{ opacity: 0 }}>Hello</Reveal>
<Reveal from="left" when={true}>From the left</Reveal>
<Reveal from="top">Slide</Reveal>
<div style="height: 200vh"></div>
<Reveal id="below" from="bottom">Below</Reveal>
<Reveal id="manual" when={false}>Manual</Reveal>

<script>
  import { getReveal } from "@awesome-reveal/astro";

  getReveal(document.querySelector("#manual")!).when = true;
</script>
`,
    },
  },
  // Astro collects the CSS of a page from the server build, so the page imports the stylesheet for the island.
  "astro-island": {
    packages: ["core", "react"],
    deps: ["astro@7", "@astrojs/react", "react@19", "react-dom@19"],
    scaffold: false,
    build: ["astro", "build"],
    verify: browse({ paths: ["/"] }),
    files: {
      "astro.config.mjs": `import { defineConfig } from "astro/config";\nimport react from "@astrojs/react";\nexport default defineConfig({ integrations: [react()] });\n`,
      "src/components/Island.jsx": `
import { Reveal } from "@awesome-reveal/react";

export default function Island() {
  return (${reactPage});
}
`,
      "src/pages/index.astro": `
---
import "@awesome-reveal/react/reveal.css";
import Island from "../components/Island.jsx";
---

<html lang="en">
  <body>
    <Island client:load />
  </body>
</html>
`,
    },
  },
  // Webpack rejects global CSS that a module in node_modules imports, unless Next.js transpiles the package.
  // Turbopack needs no transpilePackages, so the build uses webpack.
  "next-pages": {
    packages: ["core", "react"],
    deps: ["next@16", "react@19", "react-dom@19", "@types/react@19", "@types/react-dom@19"],
    scaffold: false,
    build: ["next", "build", "--webpack"],
    verify: browse({ paths: ["/"] }),
    files: {
      "tsconfig.json": `{ "compilerOptions": { "module": "esnext", "moduleResolution": "bundler" } }\n`,
      "next.config.mjs": `export default { transpilePackages: ["@awesome-reveal/react"] };\n`,
      "pages/index.tsx": `
import { Reveal } from "@awesome-reveal/react";

export default function Page() {
  return (${reactPage});
}
`,
    },
  },
};

const config = cases[name];
if (!config) {
  console.error(
    `Usage: node scripts/smoke.mjs <${Object.keys(cases).join("|")}> [dependency@version ...]`,
  );
  process.exit(2);
}

const run = (command, args, cwd) => {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { cwd, stdio: "inherit" });
};

const work = mkdtempSync(join(tmpdir(), `awesome-reveal-smoke-${name}-`));
const tarballs = join(work, "tarballs");
const app = join(work, "app");
mkdirSync(tarballs);
mkdirSync(app);

try {
  const own = {};
  for (const dir of config.packages) {
    const destination = join(tarballs, dir);
    run("pnpm", ["pack", "--pack-destination", destination], join(root, "packages", dir));
    const { name: packageName } = JSON.parse(
      readFileSync(join(root, "packages", dir, "package.json"), "utf8"),
    );
    own[packageName] = `file:${join(destination, readdirSync(destination)[0])}`;
  }

  const deps = extra.length ? extra : config.deps;
  const toEntry = (spec) => {
    const at = spec.lastIndexOf("@");
    return at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, "latest"];
  };
  const files = {
    "package.json": JSON.stringify(
      {
        name: "smoke",
        private: true,
        type: "module",
        dependencies: { ...own, ...Object.fromEntries(deps.map(toEntry)) },
        devDependencies: {
          "@types/node": "^24.0.0",
          typescript: "^5.9.0",
          ...(config.scaffold === false ? {} : { vite: "^8.3.4" }),
        },
      },
      null,
      2,
    ),
    // The adapters depend on core by version. The override makes pnpm use the tarball and not the registry.
    "pnpm-workspace.yaml": `overrides:\n${Object.entries(own)
      .map(([key, value]) => `  "${key}": "${value}"`)
      .join("\n")}\nallowBuilds:\n  esbuild: false\n  sharp: false\n`,
    ...config.files,
  };
  if (config.typescript || config.check) {
    files["tsconfig.json"] ??= JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "Bundler",
        target: "ESNext",
        lib: ["DOM", "ESNext"],
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        types: ["node"],
      },
      include: ["src"],
    });
  }
  if (config.scaffold !== false) {
    files["index.html"] =
      `<!doctype html><div id="root"></div><script type="module" src="/src/main.${name === "react" || name === "compat" ? "tsx" : "ts"}"></script>`;
    files["vite.config.ts"] =
      `${config.plugins ?? ""}\nexport default { plugins: [${config.pluginCall ?? ""}] };\n`;
  }
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(app, file)), { recursive: true });
    writeFileSync(join(app, file), content.trimStart());
  }

  run("pnpm", ["install"], app);

  const core = readdirSync(join(app, "node_modules/.pnpm")).filter((entry) =>
    entry.startsWith("@awesome-reveal+core@"),
  );
  if (core.length !== 1 || !core[0].includes("file"))
    throw new Error(`Core does not come from the tarball: ${core}`);

  if (config.build) {
    if (config.check) run("pnpm", ["exec", ...config.check], app);
    run("pnpm", ["exec", ...config.build], app);
  } else {
    // Runs the dev server pre-bundle, which handles CSS imports differently from the build.
    run("pnpm", ["exec", "vite", "optimize", "--force"], app);
    run("pnpm", ["exec", "vite", "build"], app);
    run(
      "pnpm",
      [
        "exec",
        "vite",
        "build",
        "--ssr",
        `src/ssr.${files["src/ssr.tsx"] ? "tsx" : "ts"}`,
        "--outDir",
        "dist-ssr",
      ],
      app,
    );
    run("node", ["dist-ssr/ssr.js"], app);
  }
  await config.verify?.(app, config.build?.[0] ?? "vite");

  if (config.check && !config.build) run("pnpm", ["exec", ...config.check], app);
  if (config.typescript) {
    for (const typescript of ["5.9", "6", "7"]) {
      run("pnpm", ["add", "-D", `typescript@${typescript}`], app);
      for (const moduleResolution of ["Bundler", "NodeNext"]) {
        const module = moduleResolution === "NodeNext" ? "NodeNext" : "ESNext";
        run(
          "pnpm",
          [
            "exec",
            "tsc",
            "-p",
            "tsconfig.json",
            "--module",
            module,
            "--moduleResolution",
            moduleResolution,
          ],
          app,
        );
      }
    }
  }
  console.log(`\nSmoke test "${name}" passed.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
