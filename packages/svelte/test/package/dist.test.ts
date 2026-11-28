import { readdirSync, readFileSync } from "node:fs";
import * as api from "../../dist/index.js";
import { describeDocs } from "@awesome-reveal/test-utils/docs";
import { render } from "svelte/server";

const root = new URL("../../", import.meta.url);
const dist = new URL("dist/", root);
const files = readdirSync(dist, { recursive: true, encoding: "utf8" });
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

it("exposes only the framework primitives and package-owned CSS", () => {
  expect(pkg.exports["."]).toEqual({ types: "./dist/index.d.ts", svelte: "./dist/index.js" });
  expect(Object.keys(pkg.exports)).toEqual([".", "./reveal.css", "./package.json"]);
  expect(Object.keys(api).sort()).toEqual(["Cascade", "Reveal", "cascade", "reveal"]);
  expect(files.some((f) => f.includes("keyframes") || f.includes("test"))).toBe(false);
  expect(readFileSync(new URL("reveal.css", dist), "utf8")).toBe(
    readFileSync(new URL("src/reveal.css", root), "utf8"),
  );
});

it("automatically imports SSR visibility CSS through its bindings", () => {
  expect(pkg.imports).toBeUndefined();
  for (const file of ["binding.svelte.js", "attachments.svelte.js"])
    expect(readFileSync(new URL(file, dist), "utf8")).toContain('import "./reveal.css"');
});

it("ships declarations that every TypeScript module resolution can read", () => {
  expect(files).not.toContain("css.d.ts");
  for (const file of files.filter((f) => f.endsWith(".d.ts"))) {
    const declarations = readFileSync(new URL(file, dist), "utf8");
    expect(declarations).not.toContain('import "./reveal.css"');
    expect(declarations).not.toMatch(/from "[^"]+\.svelte"/);
  }
});

it("renders hidden server content without setup", () => {
  expect(render(api.Reveal).body).toContain('<div data-awesome-reveal="hidden">');
  expect(render(api.Cascade, { props: { as: "ul" } }).body).toContain(
    '<ul data-awesome-reveal="cascade">',
  );
});

describeDocs(root);
