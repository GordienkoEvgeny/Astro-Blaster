<template>
  <div class="stage">
    <div v-if="loading" class="loader">
      <div class="loader-title">SPACE SHOOTER</div>
      <div class="loader-bar">
        <div class="loader-fill" :style="{ width: progress * 100 + '%' }"></div>
      </div>
      <div class="loader-hint">{{ Math.round(progress * 100) }}%</div>
    </div>

    <canvas
      v-show="!loading"
      ref="canvasRef"
      class="game-canvas"
      @contextmenu.prevent
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Game } from '../game/Game.js'
import { preloadAll } from '../game/assets/sprites.js'

const canvasRef = ref(null)
const loading = ref(true)
const progress = ref(0)

let game = null
let lastW = 0
let lastH = 0

/**
 * canvas — на весь вьюпорт. Логические размеры игры = CSS-пиксели окна.
 * DPR учитывается для резкости на retina.
 */
function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  const cssW = window.innerWidth
  const cssH = window.innerHeight

  // Не дёргаем без изменений (iOS Safari дёргает resize при скролле адресной строки)
  if (cssW === lastW && cssH === lastH) return
  lastW = cssW
  lastH = cssH

  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = cssW + 'px'
  canvas.style.height = cssH + 'px'

  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // Сообщаем игре новые логические размеры
  if (game) game.setViewport(cssW, cssH)
}

function onResize() {
  resizeCanvas()
}

async function requestFullscreenOnce() {
  const el = document.documentElement
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
  } catch {
    // Fullscreen может быть недоступен — молча игнорируем
  }
}

let fullscreenRequested = false
function onFirstUserGesture() {
  if (fullscreenRequested) return
  fullscreenRequested = true
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    requestFullscreenOnce()
  }
}

onMounted(async () => {
  resizeCanvas()

  try {
    await preloadAll((loaded, total) => {
      progress.value = total > 0 ? loaded / total : 1
    })
  } catch (err) {
    console.warn('[SpaceShooter] Не удалось загрузить часть ассетов:', err)
  }
  progress.value = 1

  setTimeout(() => {
    loading.value = false
    resizeCanvas()
    game = new Game(canvasRef.value, lastW, lastH)
    game.start()
  }, 150)

  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  window.addEventListener('pointerdown', onFirstUserGesture)

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize)
    window.visualViewport.addEventListener('scroll', onResize)
  }

  document.addEventListener('contextmenu', preventDefault)
  document.addEventListener('gesturestart', preventDefault)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('orientationchange', onResize)
  window.removeEventListener('pointerdown', onFirstUserGesture)
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', onResize)
    window.visualViewport.removeEventListener('scroll', onResize)
  }
  document.removeEventListener('contextmenu', preventDefault)
  document.removeEventListener('gesturestart', preventDefault)

  if (game) game.destroy()
})

function preventDefault(e) { e.preventDefault() }
</script>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.game-canvas {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.loader {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  color: #fff;
  font-family: Arial, sans-serif;
  background: radial-gradient(circle at center, #0b1026 0%, #000 100%);
  z-index: 10;
}

.loader-title {
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 4px;
  color: #38bdf8;
  text-shadow: 0 0 20px rgba(56, 189, 248, 0.8);
}

.loader-bar {
  width: 240px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.loader-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #7dd3fc);
  border-radius: 3px;
  transition: width 0.15s ease-out;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.8);
}

.loader-hint {
  font-size: 12px;
  color: #94a3b8;
  letter-spacing: 2px;
}
</style>
