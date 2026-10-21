# react-awesome-reveal

## [5.0.0-next.12](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.11...react-awesome-reveal@5.0.0-next.12) (2026-10-21)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.12

## [5.0.0-next.11](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.10...react-awesome-reveal@5.0.0-next.11) (2026-10-18)


### Bug Fixes

* ship types for moduleResolution node and a LICENSE in each package ([#327](https://github.com/awesome-reveal/awesome-reveal/issues/327)) ([6934561](https://github.com/awesome-reveal/awesome-reveal/commit/69345612f66ca743004cdbdf2d9ddb6b417b873c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.11

## [5.0.0-next.10](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.9...react-awesome-reveal@5.0.0-next.10) (2026-10-15)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.10

## [5.0.0-next.9](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.8...react-awesome-reveal@5.0.0-next.9) (2026-10-15)


### Bug Fixes

* export reveal.css for Astro islands ([#306](https://github.com/awesome-reveal/awesome-reveal/issues/306)) ([a46cfc9](https://github.com/awesome-reveal/awesome-reveal/commit/a46cfc962c5368e3482786d2a5f81c2ae5bf6cbf))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.9

## [5.0.0-next.8](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.7...react-awesome-reveal@5.0.0-next.8) (2026-10-14)


### Bug Fixes

* add license and compatibility to the consumer skills ([#301](https://github.com/awesome-reveal/awesome-reveal/issues/301)) ([b603abd](https://github.com/awesome-reveal/awesome-reveal/commit/b603abdcbd041a6eac168e384eacd5946efb15e0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.8

## [5.0.0-next.7](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.6...react-awesome-reveal@5.0.0-next.7) (2026-10-14)


### Features

* add a delay option to core and the adapters ([#296](https://github.com/awesome-reveal/awesome-reveal/issues/296)) ([34fbb3a](https://github.com/awesome-reveal/awesome-reveal/commit/34fbb3ae842ccbd19130c6a49a494954783768d1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.7

## [5.0.0-next.6](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.5...react-awesome-reveal@5.0.0-next.6) (2026-10-14)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.6

## [5.0.0-next.5](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.4...react-awesome-reveal@5.0.0-next.5) (2026-10-14)


### ⚠ BREAKING CHANGES

* core exports only reveal, cascade and their types. The /keyframes entry, the keyframe presets, spring, defineKeyframes and the distance, delay, stagger, easing, bounce, rootMargin, reducedMotion, when and onReveal options of core are removed with no aliases. Use from or native keyframes. The once option is removed from all packages, and every entrance plays once: to play it again in an adapter, set `when` to `false`, then to `true`. React and Vue no longer export ./reveal.css. The generated entrance needs Chrome 104, Firefox 80 or Safari 16. It adds its offset, scale, rotation and blur to the element's own transforms and filter, and fades to the element's own opacity.
* import reveal.css once to hide the elements before the reveal, because the library writes no inline style. slide() takes `from` in place of `direction`, `hiddenStyle` is now `hiddenAttributes`, the core `RevealState` type is now `RevealStore`, `when: true` renders hidden on the server, and React `getProps` no longer merges `style`.

### Features

* add entrance options, onReveal and a shipped reveal.css ([#290](https://github.com/awesome-reveal/awesome-reveal/issues/290)) ([44f3f95](https://github.com/awesome-reveal/awesome-reveal/commit/44f3f95a10bf144c6929854bdbf79b93d07cc26b))
* reduce the core API to reveal and cascade ([#292](https://github.com/awesome-reveal/awesome-reveal/issues/292)) ([6a4d03f](https://github.com/awesome-reveal/awesome-reveal/commit/6a4d03f4a9061de3b5815f024abe17891ba4977c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.5

## [5.0.0-next.4](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.3...react-awesome-reveal@5.0.0-next.4) (2026-10-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.4

## [5.0.0-next.3](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.2...react-awesome-reveal@5.0.0-next.3) (2026-10-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.3

## [5.0.0-next.2](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.1...react-awesome-reveal@5.0.0-next.2) (2026-10-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.2

## [5.0.0-next.1](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@5.0.0-next.0...react-awesome-reveal@5.0.0-next.1) (2026-10-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.1

## [5.0.0-next.0](https://github.com/awesome-reveal/awesome-reveal/compare/react-awesome-reveal@4.3.1...react-awesome-reveal@5.0.0-next.0) (2026-10-11)


### ⚠ BREAKING CHANGES

* **react-awesome-reveal:** react-awesome-reveal 5 re-exports @awesome-reveal/react. It has no effect components and does not use Emotion. Read "Migrating from v4" in the README of @awesome-reveal/react.

### Features

* **react-awesome-reveal:** re-export @awesome-reveal/react ([d39d407](https://github.com/awesome-reveal/awesome-reveal/commit/d39d40720fc444f9bbc610a50f6d6f330a248fff))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @awesome-reveal/react bumped to 1.0.0-next.0

## 4.3.1

### Patch Changes

- 2de3acc: Fix "use client" directive preservation to final build

## 4.3.0

### Minor Changes

- a9a7a7d: Add RSC frameworks support

## 4.2.14

### Patch Changes

- dfa6ad0: Update repository refs

## 4.2.13

### Patch Changes

- 47924cb: Update dependencies

## 4.2.12

### Patch Changes

- 49c6106: Update dependencies

## 4.2.11

### Patch Changes

- d592d40: Update dependencies

## 4.2.10

### Patch Changes

- 010696e: Disable sourcemaps generation

## 4.2.9

### Patch Changes

- b807214: Update dependencies

## 4.2.8

### Patch Changes

- 97f7d1e: Update react-intersection-observer

## 4.2.7

### Patch Changes

- aa47f95: fix: upgrade react-intersection-observer

## 4.2.6

### Patch Changes

- 8e30cd1: Update dependencies

## 4.2.5

### Patch Changes

- Use Vite for building package

## 4.2.4

### Patch Changes

- cfb05d8: Fix Slide and Zoom flicker when the element is just entering the view and certain conditions are met. Slide flickers when direction is up. Zoom flickers when it is styled.

## 4.2.3

### Patch Changes

- 33aad77: Removed hidden styles when animated components are not in the viewport

## 4.2.2

### Patch Changes

- Fix previous release

## 4.2.1

### Patch Changes

- Prevent flashing on first render

## 4.2.0

### Minor Changes

- Disable animations if user has a reduced motion setting applied system-wide
- Removed `css` prop from the Reveal component

### Patch Changes

- Refactored code to be more functional
- Emotion's `css` prop is not used anymore by the animated components – they now all use inline styling. This should improve runtime perfs due to less Emotion work
