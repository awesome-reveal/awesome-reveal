---
name: releasing-packages
description: Releases the awesome-reveal packages with release-please and npm trusted publishing. Use when you merge a release PR, fix a failed publish, set a version, publish a new package for the first time, do a release-please dry run, or leave prerelease mode for a stable release.
---

# Release the packages

A push to `main` or `next` runs `.github/workflows/release.yml`. The `release-please` job opens or updates the release PR, "chore: release <branch>". When the release PR merges, the job creates the tags and the GitHub releases, and the `publish` job publishes to npm with OIDC. The `publish` job gives each released package the `latest` dist-tag. A prerelease gets `next` instead when the package already has a stable version on `latest`. So a package with no stable version gets its prereleases on `latest`, and a plain install gets them.

Do not run `npm publish`, `npm trust` or `npm dist-tag` yourself. The agent shell cannot do the npm web 2FA, so these commands fail with `EOTP`. Give the command to the user, with `--otp=<code>`, to run as `! <command>`.

## Merge a release PR

1. Read the PR diff. Check the versions in `.release-please-manifest.json` and the new `CHANGELOG.md` entries.
2. Make sure that each public package exists on npm: `npm view <package> version`. List the public packages with `pnpm -r ls --json --depth -1 | jq -r '.[] | select(.private | not) | .name'`. The `publish` job has no npm token, so a package that it released before has a trusted publisher. A package with no version or with `0.0.0-placeholder` is new. Do "Publish a new package" for it first: one missing publisher fails the job.
3. Wait for the CI checks of the PR, then squash-merge it: `gh pr checks <number> --watch --fail-fast >/dev/null && gh pr merge <number> --squash --delete-branch`. The watch prints the full table at each refresh, and its exit status is enough. CI runs on the PR when the secret `RELEASE_PLEASE_TOKEN` is set. With `GITHUB_TOKEN` alone, the PR has no CI runs.
4. Watch the run in the background: `gh run watch <run-id> --exit-status`. The `publish` job waits until npm shows each version, and this can take 20 minutes. Find the ID with `gh run list --workflow release.yml --branch <branch> --limit 1`.
5. Check the dist-tags: `npm view <package> dist-tags --prefer-online`. A green run already proves that npm shows each version.

If the `publish` job fails because of an external cause, such as the trusted publisher, the environment or an npm outage:

1. Fix the cause.
2. Run `gh run rerun <run-id> --failed` within 30 days. pnpm skips the versions that are already on npm.

Do not use "Re-run all jobs". release-please then finds no pending release PR and skips `publish`. A re-run uses the workflow file and the code of the release commit. If the fix needs a code change, merge the fix and release a new version.

## Control the version

- release-please writes the changelog from Conventional Commits. `!` alone writes the subject as the breaking-change note. A `BREAKING CHANGE:` footer writes its text instead.
- release-please adds a commit to the changelog of each package whose files it changes. It adds an empty commit to all packages.
- `linked-versions` gives core and the adapters the highest version in the group. A group member with no commits gets the same version. `react-awesome-reveal` is not in the group.
- A `Release-As: <version>` footer applies to each package that the commit changes. Put it only on a commit that changes only the packages that get that version.
- `release-as` in `release-please-config.json` sets the version of a package that has a `feat:`, `fix:` or other visible commit since its last release. It does nothing without such a commit. `linked-versions` still applies the highest version in the group. It stays active until you remove it, so remove it in the first PR after the release. Prefer a `Release-As:` footer.
- `node-workspace` bumps `react-awesome-reveal` as a dependency update when only `@awesome-reveal/react` changes. That bump ignores `release-as`, and it keeps the prerelease suffix. A visible commit on the compat package prevents it.
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

2. Ask the user to publish it: `npm publish --tag placeholder --otp=<code>` in that directory. npm refuses a prerelease without `--tag`. Use a prerelease placeholder: a stable placeholder keeps `latest`, so `pnpm add <package>` installs the empty placeholder.
3. Just before you merge the release PR, ask the user to add the trusted publisher. This needs npm 11.15 or later:

   ```sh
   npm trust github <package> --file release.yml --repo awesome-reveal/awesome-reveal \
     --env npm --allow-publish --yes --otp=<code>
   ```

4. Merge the release PR within 48 hours. A new trusted publisher expires 48 hours after you create it, unless a publish uses it first. To replace an expired one, revoke it with `npm trust revoke --id <id> <package>`, then create it again.
5. After the first release, ask the user to remove the placeholder: `npm dist-tag rm <package> placeholder --otp=<code>`, then `npm unpublish <package>@0.0.0-placeholder --otp=<code>`. After 72 hours, npm permits the unpublish only when all of these conditions are true:
   - No other package depends on the package.
   - The package had fewer than 300 downloads in the last week.
   - The package has one maintainer.

The GitHub environment `npm` allows only the `main` and `next` branches. Add a branch there before you release from it.

## Leave prerelease mode

1. Remove `versioning`, `prerelease` and `prerelease-type` from `release-please-config.json`.
2. In the same PR, set `release-as` on each package to its stable version. A `Release-As:` footer does not work here, because the commit changes no package files:

   ```json
   "packages/core": { "component": "@awesome-reveal/core", "release-as": "1.0.0" }
   ```

3. Make sure that these packages have a `feat:`, `fix:` or `Release-As:` commit since the last release:
   - `react-awesome-reveal`. Without one, `node-workspace` gives it a prerelease version (`5.0.1-next.N`), and it goes to `next`. A `fix:` commit that changes only this package and has a `Release-As: 5.0.0` footer gives 5.0.0 in the dry run.
   - core or one adapter. `linked-versions` then releases the full group.
4. Do a dry run, and check that no version has a prerelease suffix. If a version has one, fix the cause from steps 1 to 3, push, and do the dry run again. Merge only when no version has a suffix.
5. Merge the release PR. The `publish` job uses `latest`.
6. Remove `release-as` in the next PR.

## Move `main` to a stable release

Do this after the `publish` job of a stable release from `next` succeeds. A failed publish can then still be re-run from `next`.

`main` requires linear history. A merge commit is rejected, and a squash or rebase puts the release commits and tags outside the history of `main`, so release-please finds no release there. Move `main` to the SHA of `next` instead:

1. Fetch, and check whether `main` is an ancestor of `next`: `git merge-base --is-ancestor origin/main origin/next`.
2. If it is, fast-forward: `git push origin origin/next:main`. No force is necessary.
3. If it is not, `main` has commits that `next` lacks. List them with `git log origin/next..origin/main`. Continue only when you do not need them, or when you first cherry-pick them onto `next` in a PR and re-run the release. Then reset: `git push --force-with-lease=main:<old main SHA> origin origin/next:main`. If GitHub rejects the push, allow force pushes on `main` in its branch protection, push, and disable the setting again.
4. Check that the release workflow on `main` finds no release to make.

Make no direct commits to `main`. Hotfixes go to `next` first, so that `main` stays an ancestor of `next` and step 2 works.
