import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { checkOptions, describeDocs, typeErrors } from "@awesome-reveal/test-utils/docs";

import { buildSite, scripts, type Site } from "../build-site";

const root = new URL("../../", import.meta.url);
const dist = new URL("dist/", root);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const distFiles = readdirSync(dist, { recursive: true, encoding: "utf8" });
const jsFiles = distFiles.filter((file) => /\.(c|m)?js$/.test(file)).sort();
const { resolve } = createRequire(import.meta.url);
const components = ["Reveal.astro", "Cascade.astro", "Host.astro"];

function packageName(specifier: string): string {
  return specifier.split("/", specifier.startsWith("@") ? 2 : 1).join("/");
}

function source(file: string): string {
  return readFileSync(new URL(file, dist), "utf8");
}

describe("dist", () => {
  it.each([
    ["NodeNext", ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext],
    ["Bundler", ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
  ] as const)(
    "constrains the published tag types with %s resolution",
    (_, module, moduleResolution) => {
      const types = fileURLToPath(new URL("types.ts", import.meta.url));

      expect(typeErrors(root, [types], { ...checkOptions, module, moduleResolution })).toEqual([]);
    },
  );

  it("contains one JavaScript file per source module, the components, and declarations only for src", () => {
    expect(jsFiles).toEqual(["control.js", "element.js", "index.js"]);
    expect(distFiles).toEqual(expect.arrayContaining(components));
    expect(distFiles).toContain("index.d.ts");
    expect(distFiles.filter((file) => /(^|\/)test/.test(file))).toEqual([]);
  });

  it.each(components)(
    "ships %s uncompiled, as Astro compiles the components of dependencies",
    (component) => {
      expect(source(component)).toBe(readFileSync(new URL(`src/${component}`, root), "utf8"));
    },
  );

  it("imports only its dependencies and peer dependencies", () => {
    const allowed = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
    const imports = [...jsFiles, ...components].flatMap((file) =>
      [...source(file).matchAll(/^\s*(?:import|export) (?:.* from )?"([^"]+)";$/gm)]
        .map(([, id]) => id!)
        .filter((id) => !id.startsWith("."))
        .map(packageName),
    );

    expect(imports.filter((id) => !allowed.includes(id))).toEqual([]);
  });

  // Node cannot import a .astro file, so only a build with Astro loads the root entry.
  it("exports the component from the root entry, with declarations that plain TypeScript reads", () => {
    expect(source("index.js")).toContain('from "./Reveal.astro";');
    expect(source("index.js")).toContain('from "./Cascade.astro";');
    expect(source("index.d.ts")).toContain("export declare const Reveal:");
    expect(source("index.d.ts")).toContain("export declare const Cascade:");
    expect(source("index.d.ts")).not.toContain(".astro");
  });

  it("exports only the subpaths above and package.json", () => {
    expect(Object.keys(pkg.exports)).toEqual([".", "./package.json"]);
  });
});

describe("a static build of a page with the published component", () => {
  let site: Site;

  beforeAll(async () => {
    site = await buildSite(
      Object.fromEntries(
        ["@awesome-reveal/astro"].map((specifier) => [specifier, resolve(specifier)]),
      ),
    );
  }, 60_000);

  it("renders hidden content with package-owned CSS", () => {
    expect(site.html).toContain('<div data-awesome-reveal="hidden"><p>hello</p></div>');
    expect([site.html, ...Object.values(site.assets)].join("\n")).toMatch(
      /\[data-awesome-reveal=["]?hidden["]?\]\[data-awesome-reveal-attached\],\[data-awesome-reveal=["]?cascade["]?\]\[data-awesome-reveal-attached\]>\*\{opacity:0!important\}/,
    );
  });

  it("bundles a small client script", () => {
    const code = scripts(site);

    expect(code).toMatch(/customElements\.define\(["`]awesome-reveal["`]/);
    expect(code).toContain("getReveal() needs the element");
    expect(code.length).toBeLessThan(5580);
  });
});

describeDocs(root);
