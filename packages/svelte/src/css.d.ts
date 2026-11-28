// TypeScript 6 checks side-effect imports, and it does not read `reveal.css.d.ts` for `./reveal.css`.
declare module "*.css" {}
