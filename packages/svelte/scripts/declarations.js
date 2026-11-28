import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

// The build needs the shim, but it would declare every CSS import of the consumer.
rmSync(join(dist, "css.d.ts"));

let rewrites = 0;
for (const name of readdirSync(dist).filter((file) => file.endsWith(".d.ts"))) {
  const path = join(dist, name);
  const source = readFileSync(path, "utf8");
  const declarations = source
    // Types need no stylesheet, and TypeScript 6 fails on a side-effect import that it cannot resolve.
    .replaceAll('import "./reveal.css";\n', "")
    // node16 resolves `./Reveal.svelte.js` to `Reveal.svelte.d.ts`, but not `./Reveal.svelte`.
    .replaceAll(/from "(\.\/[^"]+\.svelte)"/g, 'from "$1.js"');
  if (declarations !== source) {
    writeFileSync(path, declarations);
    rewrites++;
  }
}

if (rewrites === 0) throw new Error("svelte-package emitted no declarations to rewrite");
