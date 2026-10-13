/**
 * Реестр спрайтов.
 * Пока пути закомментированы — если файла нет, preloadAll просто пропустит его,
 * а draw* в Game.js отрисует CSS-фолбэк.
 *
 * Когда появятся PNG — положи их в public/sprites/ и раскомментируй.
 */
export const SPRITES = {
  // player_heavy:  '/sprites/player_heavy.png',
  // player_medium: '/sprites/player_medium.png',
  // player_light:  '/sprites/player_light.png',
  // enemy_basic:   '/sprites/enemies/basic.png',
  // enemy_zigzag:  '/sprites/enemies/zigzag.png',
  // enemy_shooter: '/sprites/enemies/shooter.png',
  // boss_scorpion: '/sprites/bosses/scorpion.png',
  // boss_crab:     '/sprites/bosses/crab.png',
}

const cache = {}

/**
 * Загрузить один спрайт. Кэшируется по ключу.
 */
export function loadSprite(key) {
  if (key in cache) return cache[key]
  const path = SPRITES[key]
  if (!path) {
    cache[key] = null
    return null
  }
  const img = new Image()
  img.src = path
  cache[key] = img
  return img
}

/**
 * Загрузить все спрайты из SPRITES.
 */
export function preloadAll(onProgress) {
  const keys = Object.keys(SPRITES)

  if (keys.length === 0) {
    if (onProgress) onProgress(1, 1)
    return Promise.resolve()
  }

  let loaded = 0
  const total = keys.length

  return Promise.all(
    keys.map(key => new Promise((resolve) => {
      const img = new Image()
      const finish = () => {
        loaded++
        if (onProgress) onProgress(loaded, total)
        resolve()
      }
      img.onload = () => { cache[key] = img; finish() }
      img.onerror = () => { cache[key] = null; finish() }
      img.src = SPRITES[key]
    }))
  )
}

/**
 * Проверка: спрайт реально доступен и загружен.
 */
export function isSpriteReady(img) {
  return img && img.complete && img.naturalWidth > 0
}

// ============================================================
// ФОНЫ ПЛАНЕТ
// ============================================================

/**
 * Загружает изображение по URL.
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error('Не удалось загрузить: ' + src))
    img.src = src
  })
}

/**
 * Создаёт бесшовный по горизонтали тайл: [ оригинал ][ зеркало ].
 */
export function makeHorizontalMirrorTile(img) {
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height

  const canvas = document.createElement('canvas')
  canvas.width = w * 2
  canvas.height = h
  const ctx = canvas.getContext('2d')

  // Левая половина — оригинал
  ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h)

  // Правая половина — зеркало
  ctx.save()
  ctx.translate(w * 2, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h)
  ctx.restore()

  return canvas
}

/**
 * Делает картинку бесшовной по вертикали через кроссфейд.
 * Верхние blendH пикселей смешиваются с нижними blendH.
 * Возвращает canvas высотой h - blendH.
 */
export function makeSeamlessVerticalTile(img, blendRatio = 0.15) {
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (w === 0 || h === 0) return null

  const blendH = Math.max(1, Math.floor(h * blendRatio))
  // Результат: середина + хвост (2 части), высота = h - blendH
  const resultH = h - blendH

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = resultH
  const ctx = canvas.getContext('2d')

  // Шаг 1: нижние (h - blendH) строк оригинала рисуем как основу,
  //        сдвинув вверх на blendH. Верхние blendH строк оригинала уходят за кадр.
  //        Итог: canvas = img[blendH .. h]
  ctx.drawImage(img, 0, -blendH)

  // Шаг 2: ВЕРХНИЕ blendH строк canvas смешиваем с нижними blendH строками img
  //        через градиент. Получается плавный переход "хвост → середина".
  const overlay = document.createElement('canvas')
  overlay.width = w
  overlay.height = blendH
  const octx = overlay.getContext('2d')

  // Нижние blendH строк оригинала
  octx.drawImage(img, 0, h - blendH, w, blendH, 0, 0, w, blendH)

  // Градиент: вверху чистая нижняя часть (непрозрачно), ниже плавно переходит
  // в основной слой (прозрачно).
  octx.globalCompositeOperation = 'destination-in'
  const grad = octx.createLinearGradient(0, 0, 0, blendH)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  octx.fillStyle = grad
  octx.fillRect(0, 0, w, blendH)
  octx.globalCompositeOperation = 'source-over'

  // Накладываем на верх результата
  ctx.drawImage(overlay, 0, 0)

  return canvas
}

/**
 * Кэш препроцессированных фонов.
 */
const bgTileCache = new Map()

/**
 * Возвращает готовый тайл фона: бесшовный по вертикали + зеркало по X.
 */
export async function getBackgroundTile(url, blendRatio = 0.15) {
  const cacheKey = `${url}::${blendRatio}`
  if (bgTileCache.has(cacheKey)) return bgTileCache.get(cacheKey)

  const img = await loadImage(url)

  // Шаг 1: вертикальный кроссфейд
  const seamless = makeSeamlessVerticalTile(img, blendRatio)
  const base = seamless || img

  // Шаг 2: зеркалим по X
  const tile = makeHorizontalMirrorTile(base)

  bgTileCache.set(cacheKey, tile)
  return tile
}

/**
 * Очистить кэш фонов.
 */
export function clearBackgroundCache() {
  bgTileCache.clear()
}
