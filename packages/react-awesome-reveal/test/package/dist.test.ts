import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const root = new URL("../../", import.meta.url);
const dist = new URL("dist/", root);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const distFiles = readdirSync(dist, { recursive: true, encoding: "utf8" });
const { resolve } = createRequire(import.meta.url);

describe("dist", () => {
  it("ships only the React re-export, the React stylesheet and their declarations", () => {
    expect(distFiles.sort()).toEqual(["index.d.ts", "index.js", "reveal.css", "reveal.css.d.ts"]);
    expect(Object.keys(pkg.exports)).toEqual([".", "./reveal.css", "./package.json"]);
    expect(readFileSync(new URL("index.js", dist), "utf8")).toContain("@awesome-reveal/react");
  });

  it("exports the stylesheet of @awesome-reveal/react unchanged", () => {
    expect(resolve("react-awesome-reveal/reveal.css")).toBe(new URL("reveal.css", dist).pathname);
    expect(readFileSync(new URL("reveal.css", dist), "utf8")).toBe(
      readFileSync(new URL("../react/src/reveal.css", root), "utf8"),
    );
  });
});

it("ships the LICENSE of the repository", () => {
  expect(readFileSync(new URL("LICENSE", root), "utf8")).toBe(
    readFileSync(new URL("../../LICENSE", root), "utf8"),
  );
});

describe("skills", () => {
  // v4 users approve the skills of this package, not those of @awesome-reveal/react.
  it("ships the migrating-from-v4 skill of @awesome-reveal/react unchanged", () => {
    const skill = "skills/migrating-from-v4/SKILL.md";
    const react = new URL("../react/", root);

    expect(pkg.files).toContain("skills");
    expect(readFileSync(new URL(skill, root), "utf8")).toBe(
      readFileSync(new URL(skill, react), "utf8"),
    );
  });
});
