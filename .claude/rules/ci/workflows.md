---
paths:
  - ".github/workflows/**"
---

# GitHub workflows

- Pin each action to a full commit SHA, with the version in a comment.
- Set `permissions: {}` for the workflow, and give each job only the permissions that it uses.
- Check out with `persist-credentials: false`.
- Run `actionlint` after each change.
- The `lint` job runs `astro check` in the Astro example, because `tsc` cannot read `.astro` files.
- The `test` job uses the catalog version of each framework. The `framework` job tests the older majors in the peer ranges. It runs the unit, SSR and browser projects of its package in Chromium only, in the Playwright container. It sets `shell: bash`, because its steps split the matrix values with `read -r -a`. The Astro example needs the current Astro major.
- Run the browser tests in the `mcr.microsoft.com/playwright` container, with `--user 1001` as the Playwright CI guide shows. The image has the browsers and their system packages. A `playwright install --with-deps` step takes about 70 s on `ubuntu-latest`, and the image pull takes about 30 s.
- Keep the image tag equal to the `playwright` version in `pnpm-lock.yaml`. If the versions differ, the tests fail with "Executable doesn't exist". Update the tag in the PR that upgrades Playwright.
- In the container, `run` steps use `sh` unless the job sets `shell: bash`. `jq` is not available.
- Do not cache the Playwright browsers. The Playwright docs say that a cache restore takes about as long as the download.
- `actions/upload-artifact` skips hidden files by default. An upload of `.vitest/` needs `include-hidden-files: true`.
- The `smoke` job runs `scripts/smoke.mjs`. It packs the packages, installs the tarballs into a clean project outside the workspace, and builds, type-checks and server-renders it. Most cases also serve the build and check in Chromium that `reveal.css` hides an element below the fold until it reveals. The SSR cases also load each page with its scripts blocked, to check that the server HTML loads `reveal.css`. A pnpm override makes the adapters use the core tarball and not the registry. Its matrix covers the exact minimum and the newest framework version of each peer range. All cases except `core` and `compat` have a browser check. For them, the job installs Chromium on the runner, outside the Playwright container, for about 70 s more. Change a peer range and this matrix together.
- The `release-please` job uses an installation token of a GitHub App, from the variable `RELEASE_APP_CLIENT_ID` and the secret `RELEASE_APP_PRIVATE_KEY`. The App needs read and write access to contents, issues and pull requests. Do not replace it with one of these tokens:
  - `GITHUB_TOKEN`: a PR that it opens starts no workflows, so the required checks never run.
  - A personal token: release-please makes its commits with the REST API, and GitHub signs them only for an App. The branch protection of `main` requires signed commits, and unsigned commits on the release branch block the squash merge.
- The `publish` job runs `pnpm test:package` and nothing else from CI, so the checks of the release PR are the gate for the rest.
- The repository ruleset "Require CI" (on `main`) lists each CI job and each `smoke` matrix entry by its name. Rename a job or a matrix entry, and update the ruleset in the same change. Repository admins can bypass it.
