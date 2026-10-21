# Changelog

## [1.0.0-next.12](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.11...@awesome-reveal/astro@1.0.0-next.12) (2026-10-21)


### ⚠ BREAKING CHANGES

* **astro:** add getReveal and make the host element internal ([#332](https://github.com/awesome-reveal/awesome-reveal/issues/332))

### Features

* **astro:** add getReveal and make the host element internal ([#332](https://github.com/awesome-reveal/awesome-reveal/issues/332)) ([e582aad](https://github.com/awesome-reveal/awesome-reveal/commit/e582aad6e50c0640341c886d660b0b40d57f0fe0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.12

## [1.0.0-next.11](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.10...@awesome-reveal/astro@1.0.0-next.11) (2026-10-18)


### Bug Fixes

* ship types for moduleResolution node and a LICENSE in each package ([#327](https://github.com/awesome-reveal/awesome-reveal/issues/327)) ([6934561](https://github.com/awesome-reveal/awesome-reveal/commit/69345612f66ca743004cdbdf2d9ddb6b417b873c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.11

## [1.0.0-next.10](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.9...@awesome-reveal/astro@1.0.0-next.10) (2026-10-15)


### ⚠ BREAKING CHANGES

* the generated entrance replaces the element's own values of the properties that the start state sets (translate, scale, rotate, filter, opacity) while the element waits and during the entrance, and ends at their neutral values, so a fade now ends at opacity 1. The element's own transform still applies. To keep one of these values during the entrance, put it on an inner element or use native keyframes.

### Performance Improvements

* run the generated entrance on the compositor ([#316](https://github.com/awesome-reveal/awesome-reveal/issues/316)) ([2264119](https://github.com/awesome-reveal/awesome-reveal/commit/22641197ccb4effd93605af172dc54b3090df962))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.10

## [1.0.0-next.9](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.8...@awesome-reveal/astro@1.0.0-next.9) (2026-10-15)


### ⚠ BREAKING CHANGES

* The Astro `RevealTag` type accepts HTML tags and `svg`, without document tags, table parts and SVG-only tags. Reveal the containing table, or content inside a table cell, instead.

### Bug Fixes

* attach late React refs and report moved Astro tags ([#314](https://github.com/awesome-reveal/awesome-reveal/issues/314)) ([3160bcc](https://github.com/awesome-reveal/awesome-reveal/commit/3160bcc17740630109ef834294a57d77030f0e87))
* **core:** release finished reveals without dispose ([#305](https://github.com/awesome-reveal/awesome-reveal/issues/305)) ([7d78397](https://github.com/awesome-reveal/awesome-reveal/commit/7d78397fd3af2f5ead9c67f5ea4a229c6303ccec))
* remove the hidden attribute before the reveal callback ([#312](https://github.com/awesome-reveal/awesome-reveal/issues/312)) ([12ca319](https://github.com/awesome-reveal/awesome-reveal/commit/12ca319821ef516b3a6336988b3b5791f25c5d71))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.9

## [1.0.0-next.8](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.7...@awesome-reveal/astro@1.0.0-next.8) (2026-10-14)


### ⚠ BREAKING CHANGES

* the data-reveal attributes are now data-awesome-reveal, and the html ready and failed markers and the recovery script are removed. reveal.css now shows unattached server markup after 5 seconds.

### Features

* harden server markup, focus and threshold handling ([#298](https://github.com/awesome-reveal/awesome-reveal/issues/298)) ([7cb5443](https://github.com/awesome-reveal/awesome-reveal/commit/7cb5443432d404215c02e6ffb218e1c63dacd970))


### Bug Fixes

* add license and compatibility to the consumer skills ([#301](https://github.com/awesome-reveal/awesome-reveal/issues/301)) ([b603abd](https://github.com/awesome-reveal/awesome-reveal/commit/b603abdcbd041a6eac168e384eacd5946efb15e0))
* rename the attach marker to data-awesome-reveal-attached ([#300](https://github.com/awesome-reveal/awesome-reveal/issues/300)) ([6f8eabe](https://github.com/awesome-reveal/awesome-reveal/commit/6f8eabed10a1b73eb7cfc583377851a2fa10917f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.8

## [1.0.0-next.7](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.6...@awesome-reveal/astro@1.0.0-next.7) (2026-10-14)


### Features

* add a delay option to core and the adapters ([#296](https://github.com/awesome-reveal/awesome-reveal/issues/296)) ([34fbb3a](https://github.com/awesome-reveal/awesome-reveal/commit/34fbb3ae842ccbd19130c6a49a494954783768d1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.7

## [1.0.0-next.6](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.5...@awesome-reveal/astro@1.0.0-next.6) (2026-10-14)


### Miscellaneous Chores

* **@awesome-reveal/astro:** Synchronize awesome-reveal versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.6

## [1.0.0-next.5](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.4...@awesome-reveal/astro@1.0.0-next.5) (2026-10-14)


### ⚠ BREAKING CHANGES

* core exports only reveal, cascade and their types. The /keyframes entry, the keyframe presets, spring, defineKeyframes and the distance, delay, stagger, easing, bounce, rootMargin, reducedMotion, when and onReveal options of core are removed with no aliases. Use from or native keyframes. The once option is removed from all packages, and every entrance plays once: to play it again in an adapter, set `when` to `false`, then to `true`. React and Vue no longer export ./reveal.css. The generated entrance needs Chrome 104, Firefox 80 or Safari 16. It adds its offset, scale, rotation and blur to the element's own transforms and filter, and fades to the element's own opacity.
* import reveal.css once to hide the elements before the reveal, because the library writes no inline style. slide() takes `from` in place of `direction`, `hiddenStyle` is now `hiddenAttributes`, the core `RevealState` type is now `RevealStore`, `when: true` renders hidden on the server, and React `getProps` no longer merges `style`.
* **core:** `RevealController.update` is now `setOptions`, `blur({ amount })` is now `blur({ from })`, and `defineKeyframes` no longer passes `u` or accepts an `easing` function. `destroy()` restores the element, and the reveal restores the inline opacity of the user.

### Features

* add entrance options, onReveal and a shipped reveal.css ([#290](https://github.com/awesome-reveal/awesome-reveal/issues/290)) ([44f3f95](https://github.com/awesome-reveal/awesome-reveal/commit/44f3f95a10bf144c6929854bdbf79b93d07cc26b))
* **core:** add createReveal, report browser errors and rename update to setOptions ([#276](https://github.com/awesome-reveal/awesome-reveal/issues/276)) ([109c576](https://github.com/awesome-reveal/awesome-reveal/commit/109c576bb9f51f93fa1f9fc67f0684318ed0ee90))
* reduce the core API to reveal and cascade ([#292](https://github.com/awesome-reveal/awesome-reveal/issues/292)) ([6a4d03f](https://github.com/awesome-reveal/awesome-reveal/commit/6a4d03f4a9061de3b5815f024abe17891ba4977c))


### Bug Fixes

* **astro:** give the hidden rule no specificity so a print rule can override it ([#281](https://github.com/awesome-reveal/awesome-reveal/issues/281)) ([fa2942e](https://github.com/awesome-reveal/awesome-reveal/commit/fa2942e58e232c8d777c29243dab7f6f75ac065d))
* **astro:** hide the element over an inline opacity and report an invalid options attribute ([#280](https://github.com/awesome-reveal/awesome-reveal/issues/280)) ([0fae3fc](https://github.com/awesome-reveal/awesome-reveal/commit/0fae3fc721351b70ee036db300e056176ba6a705))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.5

## [1.0.0-next.4](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.3...@awesome-reveal/astro@1.0.0-next.4) (2026-10-11)


### Bug Fixes

* **astro:** keep the class prop with the where and class scoped style strategies ([#272](https://github.com/awesome-reveal/awesome-reveal/issues/272)) ([e86b62d](https://github.com/awesome-reveal/awesome-reveal/commit/e86b62d115d9f1c45669c9fd56e3bbfb4173bb23))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.4

## [1.0.0-next.3](https://github.com/awesome-reveal/awesome-reveal/compare/@awesome-reveal/astro@1.0.0-next.2...@awesome-reveal/astro@1.0.0-next.3) (2026-10-11)


### Features

* **astro:** add the Astro adapter ([#269](https://github.com/awesome-reveal/awesome-reveal/issues/269)) ([2722b84](https://github.com/awesome-reveal/awesome-reveal/commit/2722b841931c2a88deed549eb471ce4a5a715066))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/core bumped to 1.0.0-next.3
