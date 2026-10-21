import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { AstroInlineConfig } from "astro";

// The Vite config of Astro maps "astro" to its types, so the build API is imported by path.
const { build }: typeof import("astro") = await import(
  /* @vite-ignore */ pathToFileURL(createRequire(import.meta.url).resolve("astro")).href
);

export interface Site {
  html: string;
  assets: Record<string, string>;
}

export async function buildSite(
  aliases: Record<string, string>,
  config: AstroInlineConfig = {},
): Promise<Site> {
  const outDir = await mkdtemp(join(tmpdir(), "awesome-reveal-astro-"));
  try {
    await build({
      root: fileURLToPath(new URL("fixtures/site/", import.meta.url)),
      outDir,
      logLevel: "error",
      security: { csp: true },
      ...config,
      vite: {
        resolve: {
          alias: Object.entries(aliases).map(([specifier, file]) => ({
            find: new RegExp(`^${specifier.replaceAll(".", "\\.")}$`),
            replacement: file,
          })),
        },
      },
    });
    const assetsDir = join(outDir, "_astro");
    const assets = await readdir(assetsDir).catch(() => []);
    return {
      html: await readFile(join(outDir, "index.html"), "utf8"),
      assets: Object.fromEntries(
        await Promise.all(
          assets.map(async (asset) => [asset, await readFile(join(assetsDir, asset), "utf8")]),
        ),
      ),
    };
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

export function scripts({ html, assets }: Site): string[] {
  const inline = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map(
    ([, code]) => code!,
  );
  const files = Object.entries(assets).filter(([name]) => name.endsWith(".js"));
  return [...inline, ...files.map(([, code]) => code)];
}
