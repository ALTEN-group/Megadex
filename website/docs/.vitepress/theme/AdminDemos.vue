<template>
  <section class="admin-demos">
    <header class="admin-demos__header">
      <span class="admin-demos__eyebrow">Bundled Angular Admin UI</span>
      <h2 class="admin-demos__title">See it in action</h2>
      <p class="admin-demos__lead">
        Megadex ships with a full administration interface for managing user profiles,
        roles, social network catalogs, and audit logs.
      </p>
    </header>

    <div class="admin-demos__tabs" role="tablist" aria-label="Admin UI demos">
      <button
        v-for="(demo, i) in demos"
        :key="demo.id"
        type="button"
        role="tab"
        class="admin-demos__tab"
        :class="{ 'is-active': i === active }"
        :aria-selected="i === active"
        @click="select(i)"
      >
        <span class="admin-demos__tab-num">0{{ i + 1 }}</span>
        <span class="admin-demos__tab-text">
          <span class="admin-demos__tab-title">{{ demo.title }}</span>
          <span class="admin-demos__tab-caption">{{ demo.caption }}</span>
        </span>
      </button>
    </div>

    <div class="admin-demos__stage">
      <div class="admin-demos__frame">
        <div class="admin-demos__chrome" aria-hidden="true">
          <span class="dot dot--r"></span>
          <span class="dot dot--y"></span>
          <span class="dot dot--g"></span>
          <span class="admin-demos__url">{{ demos[active].url }}</span>
        </div>
        <video
          ref="videoEl"
          :key="demos[active].id"
          class="admin-demos__video"
          :src="withBase(demos[active].src)"
          :poster="withBase(demos[active].poster)"
          autoplay
          muted
          playsinline
          preload="metadata"
          @ended="advance"
        ></video>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { withBase } from 'vitepress'

const demos = [
  {
    id: 'login',
    title: 'Sign in & users table',
    caption: 'Authenticate via the BFF and land on the users grid with roles and status columns.',
    url: 'localhost:8100/megadex/users',
    src: '/videos/admin-login.mp4',
    poster: '/videos/admin-login.jpg',
  },
  {
    id: 'edit-form',
    title: 'Social catalog editing & history',
    caption: 'Open any row to update fields in a validated drawer and inspect the per-field audit trail.',
    url: 'localhost:8100/megadex/socials',
    src: '/videos/admin-edit-form.mp4',
    poster: '/videos/admin-edit-form.jpg',
  },
  {
    id: 'table-preferences',
    title: 'Saved table views',
    caption: 'Filter, sort, and persist custom column layouts per operator account.',
    url: 'localhost:8100/megadex/socials',
    src: '/videos/admin-table-preferences.mp4',
    poster: '/videos/admin-table-preferences.jpg',
  },
]

const active = ref(0)
const videoEl = ref(null)

function select(i) {
  active.value = i
}

function advance() {
  active.value = (active.value + 1) % demos.length
}
</script>

<style scoped>
.admin-demos {
  max-width: 1152px;
  margin: 4rem auto 2rem;
  padding: 0 24px;
}

@media (min-width: 640px) {
  .admin-demos {
    padding: 0 48px;
  }
}

@media (min-width: 960px) {
  .admin-demos {
    padding: 0 64px;
  }
}

.admin-demos__header {
  text-align: center;
  max-width: 680px;
  margin: 0 auto 2rem;
}

.admin-demos__eyebrow {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
  margin-bottom: 0.5rem;
}

.admin-demos__title {
  margin: 0 0 0.75rem;
  border: 0;
  padding: 0;
  font-size: 2rem;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.admin-demos__lead {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.admin-demos__tabs {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

@media (min-width: 768px) {
  .admin-demos__tabs {
    grid-template-columns: repeat(3, 1fr);
  }
}

.admin-demos__tab {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  text-align: left;
  padding: 1rem 1.15rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;
}

.admin-demos__tab:hover {
  border-color: var(--vp-c-brand-1);
}

.admin-demos__tab.is-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 6px 24px -12px rgba(0, 0, 0, 0.25);
}

.admin-demos__tab-num {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  padding-top: 0.15rem;
}

.admin-demos__tab-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-demos__tab-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.admin-demos__tab-caption {
  font-size: 0.83rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}

.admin-demos__frame {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  background: #0f1419;
  box-shadow: 0 22px 50px -22px rgba(0, 0, 0, 0.45);
}

.admin-demos__chrome {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.9rem;
  background: #1a2129;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}
.dot--r { background: #ff5f56; }
.dot--y { background: #ffbd2e; }
.dot--g { background: #27c93f; }

.admin-demos__url {
  margin-left: 0.6rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.6);
}

.admin-demos__video {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  background: #0f1419;
}
</style>
