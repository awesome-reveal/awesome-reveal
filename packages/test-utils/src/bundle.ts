import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { build, type Rolldown } from "vite";

interface BundleOptions {
  /** A package that resolves through its "exports" map, as consumers do. */
  resolvePackage?: string;
  external?: string[];
}

/** Bundles a fixture of `test/package/fixtures` for production, and gives the exports that the bundle keeps for each `<package>/dist/<file>`, and the minified bytes of the JavaScript and of the CSS. */
export async function bundleFixture(
  fixture: URL,
  { resolvePackage, external }: BundleOptions = {},
) {
  const alias = resolvePackage
    ? [
        {
          find: new RegExp(`^${resolvePackage}$`),
          replacement: createRequire(fixture).resolve(resolvePackage),
        },
      ]
    : [];
  const output = (await build({
    configFile: false,
    logLevel: "silent",
    root: fileURLToPath(new URL("../../../", fixture)),
    resolve: { alias },
    build: {
      write: false,
      minify: true,
      lib: { entry: fileURLToPath(fixture), formats: ["es"] },
      // Lib mode keeps whitespace and annotations in ES output, but an app bundle removes them.
      rolldownOptions: { external, output: { minify: true, comments: false } },
    },
  })) as Rolldown.RolldownOutput[];
  const chunk = output[0]!.output.find((item) => item.type === "chunk")!;
  const css = output[0]!.output
    .filter(
      (item): item is Rolldown.OutputAsset =>
        item.type === "asset" && item.fileName.endsWith(".css"),
    )
    .reduce((sum, { source }) => sum + Buffer.byteLength(source), 0);
  const keptExports = Object.fromEntries(
    Object.entries(chunk.modules)
      .filter(([id]) => id.includes("/dist/"))
      // Keeps the package folder, so that core and adapter modules stay apart.
      .map(([id, module]) => [
        id.slice(id.lastIndexOf("/", id.indexOf("/dist/") - 1) + 1),
        module.renderedExports,
      ]),
  );
  const { code } = chunk;
  return { keptExports, bytes: Buffer.byteLength(code), gzip: gzipSync(code).length, css };
}
