<script lang="ts">
  import { Cascade, Reveal, cascade, reveal } from "@awesome-reveal/svelte";

  import PageSection from "./components/PageSection.svelte";

  const sides = ["top", "right", "bottom", "left"] as const;
  let open = $state(false);
  let reveals = $state(0);
</script>

<PageSection>
  <Reveal><h1>The default entrance</h1></Reveal>
</PageSection>
<PageSection><Reveal from={{ opacity: 0 }}>Pure fade</Reveal></PageSection>
{#each sides as side (side)}
  <PageSection>
    <Reveal from={side}>From the {side}</Reveal>
  </PageSection>
{/each}
<PageSection><Reveal from={{ scale: 0.9 }}>Scale only</Reveal></PageSection>
<PageSection>
  <Reveal from="left" style="rotate: -3deg">Keeps its own rotation</Reveal>
</PageSection>
<PageSection>
  <Reveal
    keyframes={[
      { opacity: 0, transform: "rotate(-10deg) scale(.8)", easing: "ease-out" },
      { opacity: 1, transform: "rotate(0deg) scale(1)" },
    ]}
  >
    Native keyframes
  </Reveal>
</PageSection>
<PageSection>
  <Cascade as="ul" from={{ opacity: 0, y: 16 }}>
    <li>Fast</li>
    <li>Small</li>
    <li>Accessible</li>
  </Cascade>
</PageSection>
<PageSection>
  <Reveal as="h2" from="left">A header</Reveal>
  <Reveal from={{ opacity: 0 }} delay={250}>Its content starts 250 ms later</Reveal>
</PageSection>
<PageSection>
  <ul {@attach cascade(() => ({ from: "left", interval: 120 }))}>
    <li>An attachment</li>
    <li>on your own</li>
    <li>list</li>
  </ul>
</PageSection>
<PageSection>
  <h2 {@attach reveal(() => ({ from: { opacity: 0, blur: 8 } }))}>
    An attachment on your own element
  </h2>
</PageSection>
<PageSection>
  <Reveal onReveal={() => reveals++}>
    {#snippet children({ revealed })}
      {revealed ? `Revealed ${reveals} time(s)` : "Waiting"}
    {/snippet}
  </Reveal>
</PageSection>
<PageSection>
  <button aria-expanded={open} onclick={() => (open = !open)}>Toggle</button>
  <Reveal when={open} hidden={!open} from={{ opacity: 0 }}>Manual entrance</Reveal>
  <p {@attach reveal(() => ({ when: open, from: "right" }))}>Manual attachment</p>
</PageSection>
