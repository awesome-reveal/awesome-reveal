<script setup lang="ts">
import { Cascade, Reveal, vCascade, vReveal } from "../../src";
</script>

<template>
  <div v-reveal="{ duration: 300, delay: 200, when: true }" />
  <Reveal
    as="ul"
    :keyframes="[{ opacity: 0 }, {}]"
    when
  >
    <li>one</li>
    <li>two</li>
  </Reveal>
  <Reveal
    from="left"
    :delay="200"
  />
  <Reveal :from="{ x: '-100%', rotate: -5, blur: '0.5rem' }" />
  <Cascade
    as="ul"
    :interval="120"
    :delay="200"
    from="left"
  >
    <li>one</li>
    <li>two</li>
  </Cascade>
  <ul v-cascade="{ interval: 120, delay: 200, when: true }" />
  <Reveal v-slot="{ revealed }">
    <!-- @vue-expect-error The slot prop is a boolean. -->
    {{ revealed.toUpperCase() }}
  </Reveal>
  <Cascade v-slot="{ revealed }">
    <!-- @vue-expect-error The slot prop is a boolean. -->
    {{ revealed.toUpperCase() }}
  </Cascade>
  <Reveal as="my-card" />
  <!-- @vue-expect-error The parser reads the content of a textarea as text. -->
  <Reveal as="textarea" />
  <!-- @vue-expect-error A void tag has no children. -->
  <Cascade as="img" />
</template>
