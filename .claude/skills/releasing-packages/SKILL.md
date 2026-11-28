---
name: releasing-packages
description: Releases the awesome-reveal packages with release-please and npm trusted publishing. Use when you check an open release PR, fix a failed publish, set a version, publish a new package for the first time, do a release-please dry run, or start or leave prerelease mode.
---

# Release the packages

A push to `main` runs `.github/workflows/release.yml`. The `release-please` job opens or updates the release PR, "chore: release <branch>". When the release PR merges, the job creates the tags and the GitHub releases, and the `publish` job publishes to npm with OIDC. The `publish` job gives each released package the `latest` dist-tag. A prerelease gets `next` instead when the package already has a stable version on `latest`. So a package with no stable version gets its prereleases on `latest`, and a plain install gets them.

Do not run `pnpm publish`, `pnpm dist-tag`, `pnpm unpublish` or `npm trust` yourself. The agent shell cannot do the npm web 2FA, so these commands fail with `EOTP`. Give the command to the user, with `--otp=<code>`, to run as `! <command>`. Use pnpm for the registry commands. pnpm has no `trust` command, so the trusted publisher needs npm and a valid `npm login`. The root `package.json` sets `devEngines.packageManager` to pnpm, so npm commands fail in the repo with `EBADDEVENGINES`.

## Release from a release PR

1. Read the PR diff. Check the versions in `.release-please-manifest.json` and the new `CHANGELOG.md` entries.
2. Make sure that each public package exists on npm: `pnpm view <package> version`. List the public packages with `pnpm -r ls --json --depth -1 | jq -r '.[] | select(.private | not) | .name'`. The `publish` job has no npm token, so a package that it released before has a trusted publisher. A package with no version or with `0.0.0-placeholder` is new. Do "Publish a new package" for it first: one missing publisher fails the job.
3. Wait for the CI checks of the PR: `gh pr checks <number> --watch --fail-fast >/dev/null`. The watch prints the full table at each refresh, and its exit status is enough. Then give the PR to the user. The user merges each release PR, and you do not merge it.
4. After the user merges the PR, watch the run in the background: `gh run watch <run-id> --exit-status`. The `publish` job waits until npm shows each version, and this can take 20 minutes. Find the ID with `gh run list --workflow release.yml --branch <branch> --limit 1`.
5. Check the dist-tags: `pnpm dist-tag ls <package>`. A green run already proves that npm shows each version.

If the `publish` job fails because of an external cause, such as the trusted publisher, the environment or an npm outage:

1. Fix the cause.
2. Run `gh run rerun <run-id> --failed` within 30 days. pnpm skips the versions that are already on npm.

Do not use "Re-run all jobs". release-please then finds no pending release PR and skips `publish`. A re-run uses the workflow file and the code of the release commit. If the fix needs a code change, merge the fix and release a new version.

## Control the version

- release-please writes the changelog from Conventional Commits. `!` alone writes the subject as the breaking-change note. A `BREAKING CHANGE:` footer writes its text instead.
- release-please adds a commit to the changelog of each package whose files it changes. It adds an empty commit to all packages.
- Each package has its own version. `node-workspace` gives a patch release to each package that depends on a released package: each adapter when core releases, and `react-awesome-reveal` when `@awesome-reveal/react` releases. That bump ignores `release-as`, and it keeps the prerelease suffix. A visible commit on the dependent package prevents it.
- A `Release-As: <version>` footer applies to each package that the commit changes. Put it only on a commit that changes only the packages that get that version.
- A squash merge gives the commit a blank body, so it drops the `Release-As:` and `BREAKING CHANGE:` footers of the branch commits. release-please reads footers only from the commit body. Merge with the footer as the body, then check it with `git log -1 --format=%B`:

  ```sh
  gh pr merge <number> --squash --delete-branch --subject "<PR title> (#<number>)" --body "Release-As: 5.0.0"
  ```

- `release-as` in `release-please-config.json` sets the version of a package that has a `feat:`, `fix:` or other visible commit since its last release. It does nothing without such a commit. It stays active until you remove it, so remove it in the first PR after the release. Prefer a `Release-As:` footer.
- Keep `last-release-sha`. It limits the commit walk for a package with no release yet, such as a new adapter.

## Do a dry run

Push the branch first. The dry run reads the config and the commits from GitHub, not from the local checkout.

```sh
pnpm dlx release-please@17 release-pr --dry-run --token "$(gh auth token)" \
  --repo-url awesome-reveal/awesome-reveal --target-branch <branch>
```

Check the versions, the changelog entries, and that the `workspace:` ranges stay unchanged. The action can bundle an older 17.x release than `@17`, so the result can differ a little.

## Publish a new package

npm can add a trusted publisher only to a package that exists.

1. Make a placeholder in the scratchpad: this `package.json`, and a short README.

   ```json
   {
     "name": "@awesome-reveal/<framework>",
     "version": "0.0.0-placeholder",
     "license": "MIT",
     "repository": {
       "type": "git",
       "url": "git+https://github.com/awesome-reveal/awesome-reveal.git",
       "directory": "packages/<framework>"
     },
     "publishConfig": { "access": "public" }
   }
   ```

2. Ask the user to publish it: `pnpm publish --tag placeholder --no-git-checks --otp=<code>` in that directory. The directory is not a git repo, so the publish needs `--no-git-checks`. Use a prerelease placeholder: a stable placeholder keeps `latest`, so `pnpm add <package>` installs the empty placeholder.
3. Just before the user merges the release PR, ask the user to add the trusted publisher. This needs npm 11.15 or later:

   ```sh
   npm trust github <package> --file release.yml --repo awesome-reveal/awesome-reveal \
     --env npm --allow-publish --yes --otp=<code>
   ```

4. Ask the user to merge the release PR within 48 hours. A new trusted publisher expires 48 hours after you create it, unless a publish uses it first. To replace an expired one, revoke it with `npm trust revoke --id <id> <package>`, then create it again.
5. After the first release, ask the user to remove the placeholder: `pnpm dist-tag rm <package> placeholder --otp=<code>`, then `pnpm unpublish <package>@0.0.0-placeholder --otp=<code>`. After 72 hours, npm permits the unpublish only when all of these conditions are true:
   - No other package depends on the package.
   - The package had fewer than 300 downloads in the last week.
   - The package has one maintainer.

The GitHub environment `npm` allows only the `main` branch. Add a branch there before you release from it.

## Start prerelease mode

Set these options on the package in `release-please-config.json`:

```json
"packages/<framework>": {
  "component": "@awesome-reveal/<framework>",
  "prerelease": true,
  "versioning": "prerelease",
  "prerelease-type": "rc",
  "release-as": "1.0.0-rc.0"
}
```

Each later release increments the number: `1.0.0-rc.1`, then `1.0.0-rc.2`, for each commit type. Without `release-as`, the first version has no number, such as `1.1.0-rc`. The `publish` job puts the prereleases of a package with no stable version on `latest`.

## Leave prerelease mode

1. Remove `versioning`, `prerelease` and `prerelease-type` from the package in `release-please-config.json`.
2. In the same PR, set `release-as` on the package to its stable version. A `Release-As:` footer does not work here, because the commit changes no package files:

   ```json
   "packages/<framework>": { "component": "@awesome-reveal/<framework>", "release-as": "1.0.0" }
   ```

3. Make sure that the package has a `feat:` or `fix:` commit since its last release. Also make sure that each package that depends on it has one. Without one, `node-workspace` gives the dependent a prerelease version, and it goes to `next`.
4. Do a dry run, and check that no version has a prerelease suffix. If a version has one, fix the cause from steps 1 to 3, push, and do the dry run again. Give the PR to the user only when no version has a suffix.
5. Ask the user to merge the release PR. The `publish` job uses `latest`.
6. Remove `release-as` in the first PR after the release.
