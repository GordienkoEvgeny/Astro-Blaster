ASTRO BLASTER — README
Вертикальная аркада-стрелялка на Vue 3 + Canvas 2D. Fixed timestep 120 Гц, интерполяция рендера, модульная архитектура, готово к расширению (ассеты, уровни, боссы, сложность).

1. Быстрый старт
bash
npm install
npm run dev      # локальная разработка
npm run build    # сборка в dist/
npm run preview  # посмотреть production-сборку
Открыть в браузере → увидишь меню с 3 кораблями.

Управление:

Клавиатура: WASD / стрелки — движение, Пробел — огонь, P — пауза

Мышь: движение мыши не отслеживается, но ЛКМ удерживается — стрельба, клик по карточке в меню — выбор

Тач: левая половина экрана — джойстик, правая — кнопка огня

2. Структура проекта
text
src/
├── App.vue                       ← корневой компонент
├── main.js                       ← точка входа
├── components/
│   └── SpaceShooter.vue          ← тонкий контейнер: canvas + lifecycle
└── game/
    ├── Game.js                   ← ★ ОРКЕСТРАТОР: состояния, физика, коллизии
    ├── constants.js              ← все числа: размеры, скорости, цвета
    ├── ships.js                  ← конфиг 3 кораблей (HP, скорость, урон)
    │
    ├── core/
    │   ├── Input.js              ← клавиатура + мышь + тач → события
    │   └── audio.js              ← звук через Web Audio API
    │
    ├── entities/                 ← игровые объекты
    │   ├── Player.js
    │   ├── Bullet.js
    │   ├── Particle.js
    │   ├── Enemy.js
    │   └── Boss.js
    │
    ├── systems/                  ← логика, применяемая к группам
    │   ├── SpawnSystem.js        ← кто, где, когда спавнится
    │   └── collisionSystems.js   ← проверки пересечений
    │
    └── levels/
        └── levels.js             ← ★ КОНФИГ УРОВНЕЙ: планеты, враги, боссы
Точки входа для правок:

Хочешь поменять баланс чисел → constants.js, ships.js, levels.js

Хочешь добавить логику игры → Game.js (главный файл)

Хочешь новый тип врага/босса → entities/

Хочешь новую систему (например, дроп бафов) → systems/

Хочешь новый уровень → levels/levels.js

3. Как работает игровой цикл
В Game._loop:

text
1. Считаем dt с прошлого кадра (в секундах), ограничиваем MAX_FRAME
2. Обрабатываем накопившиеся события ввода (_processEvents)
3. Физика: while (accumulator >= FIXED_DT) step(FIXED_DT)
4. Рендер: draw(alpha, now), alpha = accumulator / FIXED_DT
5. requestAnimationFrame(_loop)
FIXED_DT = 1/120 сек — физика всегда идёт стабильными шагами, независимо от FPS монитора.

Интерполяция: каждая сущность хранит prevX/prevY (позиция на прошлом физическом шаге). При рендере позиция смешивается:

js
const x = prevX + (x - prevX) * alpha
Это даёт плавность на 120/144 Гц.

Важно: в одном рендер-кадре step() может вызваться 2-8 раз. Поэтому нельзя накапливать в step побочные эффекты, которые не должны дублироваться — фильтры массивов, например, лучше ставить в конце одного вызова step, а не в конце цикла while.

4. Состояния игры
Все состояния — в Game.STATES:

text
MENU → PLAYING → BOSS → LEVEL_COMPLETE → PLAYING (следующий) → ... → WIN
                  ↓
              GAME_OVER
                  ↓
                MENU
Переключение:

MENU → PLAYING: startGame() — создаёт игрока, обнуляет счёт

PLAYING → BOSS: spawnBoss() — по истечении level.duration

BOSS → LEVEL_COMPLETE / WIN: completeLevel() — когда босс убит

LEVEL_COMPLETE → PLAYING: через 1.5 сек автоматически

PLAYING/BOSS → GAME_OVER: gameOver() — когда HP игрока ≤ 0

GAME_OVER/WIN → MENU: backToMenu() — по пробелу/тапу

Чтобы добавить новое состояние — добавь в STATES, обработай в step() (физика) и draw() (рендер), плюс переходы в _processEvents / в коллизиях.

5. Как настраивать сложность
Уровни (levels/levels.js)
Каждый уровень — объект:

js
{
  id: 1,
  name: 'Пустыня Ксилос',
  bgTop: '#1e3a8a',        // цвет неба сверху
  bgBottom: '#7c2d12',     // цвет неба снизу
  stars: 40,               // сколько звёзд на фоне
  duration: 20,            // сек. до появления босса
  enemyWeights: {          // вероятности типов врагов
    basic: 0.75,
    zigzag: 0.25,
    shooter: 0
  },
  spawnInterval: 0.9,      // пауза между спавнами (сек)
  enemySpeedMul: 1.0,      // множитель скорости врагов
  boss: {                  // конфиг босса
    name: 'Скорпион',
    hp: 40,
    color: '#dc2626',
    accent: '#fca5a5',
    attackInterval: 1.4    // сек. между атаками
  }
}
Как добавить уровень:

Открой levels/levels.js.

Скопируй последний объект, поменяй id, name, цвета, duration, boss.hp.

Добавь в конец массива LEVELS.

Игра сама подхватит — переходы уже работают.

Как усилить сложность внутри уровня:

spawnInterval — меньше → чаще враги.

enemySpeedMul — больше → быстрее летят.

enemyWeights.shooter — больше → чаще стреляют.

duration — больше → дольше до босса (значит, больше врагов пройдёт).

boss.hp, boss.attackInterval — HP и темп атак.

Динамическая сложность во время уровня
Сейчас в Game.stepGameplay есть:

js
this.waveLevel = 1 + Math.floor(this.waveTimer / 7)
Каждые 7 секунд waveLevel растёт, и SpawnSystem использует его для бонусной скорости (baseSpeed + waveLevel * 12).

Если хочешь полноценную систему сложности — создай systems/DifficultySystem.js:

js
export function getDifficulty(levelIndex, waveTimer, waveLevel) {
  return {
    enemyHpMul:       1 + waveLevel * 0.1,
    enemySpeedMul:    1 + waveLevel * 0.08,
    spawnIntervalMul: Math.max(0.4, 1 - waveLevel * 0.05),
    bulletSpeedMul:   1 + waveLevel * 0.04,
  }
}
И вызывай её в SpawnSystem.update, где сейчас считаются HP и скорость вручную. Это даст единую точку тюнинга.

6. Как добавлять врагов
Шаг 1. Добавь тип в SpawnSystem.js
Открой systems/spawnSystem.js, найди метод update(). Там:

js
const roll = Math.random()
let type = 'basic'
let acc = 0
for (const [t, w] of Object.entries(this.weights)) {
  acc += w
  if (roll <= acc) { type = t; break }
}

const radius = type === 'shooter' ? 16 : type === 'zigzag' ? 13 : 14
const x = 40 + Math.random() * (W - 80)
const hp = type === 'shooter' ? 3 : type === 'zigzag' ? 2 : 1
const speed = (this.baseSpeed + waveLevel * 12) * this.speedMul
Добавь новый тип, например tank:

js
const radius = type === 'tank' ? 20
             : type === 'shooter' ? 16
             : type === 'zigzag' ? 13 : 14
const hp = type === 'tank' ? 5
         : type === 'shooter' ? 3
         : type === 'zigzag' ? 2 : 1
const speed = ((type === 'tank' ? this.baseSpeed * 0.6 : this.baseSpeed) + waveLevel * 12) * this.speedMul
Шаг 2. Пропиши логику движения в Enemy.js
Открой entities/enemy.js, найди метод update:

js
if (this.type === 'zigzag') {
  this.x += Math.sin(this.phase + this.y * 0.02) * 140 * dt
  this.x = Math.max(this.radius, Math.min(W - this.radius, this.x))
}
Добавь свой тип:

js
if (this.type === 'tank') {
  // например, слегка наводится на игрока
  const dx = playerX - this.x
  this.x += Math.sign(dx) * 30 * dt
}
Шаг 3. Пропиши рисование в Game.js → drawEnemy
Найди метод drawEnemy, там уже есть 3 типа. Добавь ветку:

js
if (enemy.type === 'tank') {
  ctx.fillStyle = color
  ctx.fillRect(-r, -r, r * 2, r * 2)
}
Шаг 4. Добавь в levels.js
js
enemyWeights: { basic: 0.5, zigzag: 0.2, shooter: 0.2, tank: 0.1 }
Сумма весов нормализуется на лету — можно ставить любые числа.

7. Как настраивать боссов
Файл entities/boss.js
Босс сейчас один. Чтобы сделать его настраиваемым:

Конструктор берёт конфиг level.boss — там name, hp, color, accent, attackInterval.

Метод attack() возвращает массив пуль. Сейчас — веер из 5:

js
attack() {
  const bullets = []
  const base = Math.PI / 2
  for (let k = -2; k <= 2; k++) {
    const a = base + k * 0.22
    bullets.push({
      x: this.x, y: this.y + this.radius * 0.6,
      vx: Math.cos(a) * 260,
      vy: Math.sin(a) * 260,
    })
  }
  return bullets
}
Как сделать разные паттерны у разных боссов
Добавь pattern в конфиг level.boss:

js
boss: {
  name: 'Скорпион',
  hp: 40,
  pattern: 'fan',   // 'fan' | 'spiral' | 'aimed'
  ...
}
И в Boss.attack():

js
attack(playerX, playerY) {
  const bullets = []
  if (this.pattern === 'fan') {
    for (let k = -2; k <= 2; k++) {
      const a = Math.PI / 2 + k * 0.22
      bullets.push({ x: this.x, y: this.y + this.radius * 0.6,
                     vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 })
    }
  } else if (this.pattern === 'spiral') {
    for (let k = 0; k < 4; k++) {
      const a = this.angle + (k / 4) * Math.PI * 2
      bullets.push({ x: this.x, y: this.y,
                     vx: Math.cos(a) * 240, vy: Math.sin(a) * 240 })
    }
    this.angle += 0.4
  } else if (this.pattern === 'aimed') {
    const dx = playerX - this.x, dy = playerY - this.y
    const d = Math.hypot(dx, dy) || 1
    for (let k = -1; k <= 1; k++) {
      const a = Math.atan2(dy, dx) + k * 0.15
      bullets.push({ x: this.x, y: this.y,
                     vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 })
    }
  }
  return bullets
}
Тогда в Game.stepGameplay вызов станет:

js
const bullets = this.boss.attack(player.x, player.y)
Фазы босса
В Boss.update добавь смену паттерна по HP:

js
if (this.hp < this.maxHp * 0.5 && !this._phase2) {
  this._phase2 = true
  this.pattern = 'spiral'   // после половины HP — новая атака
  this.attackInterval *= 0.7
}
8. Как добавить выпадающие бафы
Шаг 1. Создай сущность entities/Powerup.js
js
export class Powerup {
  constructor(x, y, type) {
    this.x = x
    this.y = y
    this.type = type             // 'weapon' | 'shield' | 'slow' | 'rocket' | 'life'
    this.radius = 11
    this.vy = 90
    this.phase = Math.random() * Math.PI * 2
    this.dead = false
    this.prevX = x; this.prevY = y
  }

  update(dt, H) {
    this.prevX = this.x; this.prevY = this.y
    this.y += this.vy * dt
    this.phase += dt * 4
    if (this.y - this.radius > H + 20) this.dead = true
  }
}
Шаг 2. Система дропа systems/PowerupSystem.js
js
import { Powerup } from '../entities/Powerup.js'

export function rollPowerup(x, y, chance = 0.15) {
  if (Math.random() > chance) return null
  const roll = Math.random()
  let type
  if (roll < 0.35) type = 'weapon'
  else if (roll < 0.55) type = 'shield'
  else if (roll < 0.75) type = 'slow'
  else if (roll < 0.9) type = 'rocket'
  else type = 'life'
  return new Powerup(x, y, type)
}
Шаг 3. Подключи в Game.js
Конструктор — добавь поле:

js
this.powerups = []
backToMenu и startGame — очищай:

js
this.powerups = []
stepGameplay — обновление, до коллизий:

js
for (const p of this.powerups) p.update(dt, H)
onKill врага — добавь шанс выпадения:

js
(enemy) => {
  this.score += ...
  this.spawnParticles(...)
  const drop = rollPowerup(enemy.x, enemy.y, 0.15)
  if (drop) this.powerups.push(drop)
}
Коллизии с игроком — добавь рядом с остальными:

js
for (let i = this.powerups.length - 1; i >= 0; i--) {
  const p = this.powerups[i]
  const dx = p.x - player.x, dy = p.y - player.y
  const rr = p.radius + player.radius
  if (dx * dx + dy * dy < rr * rr) {
    this.applyPowerup(p.type)
    this.powerups.splice(i, 1)
  }
}
Новый метод в Game:

js
applyPowerup(type) {
  switch (type) {
    case 'weapon': player.ship.weaponLevel = Math.min(3, (player.ship.weaponLevel || 1) + 1); break
    case 'shield': player.shieldTimer = 8; break
    case 'slow':   this.slowMoTimer = 5; break
    case 'rocket': player.rocketTimer = 8; break
    case 'life':   player.hp = Math.min(player.maxHp + 2, player.hp + 1); break
  }
  this.spawnParticles(player.x, player.y, '#facc15', 12)
  this.audio.play('hit')
}
Фильтр в конце stepGameplay:

js
this.powerups = this.powerups.filter(p => !p.dead)
Рендер в draw:

js
for (const p of this.powerups) this.drawPowerup(p, alpha)
И метод drawPowerup — по аналогии с drawEnemy, цвет по типу.

9. Как подключать ассеты (спрайты)
Сейчас всё рисуется кодом (CSS-стиль). Когда появятся PNG/SVG — меняем только методы draw* в Game.js.

Шаг 1. Положи файлы в public/
text
public/
└── sprites/
    ├── player_heavy.png
    ├── player_medium.png
    ├── player_light.png
    ├── enemies/
    │   ├── basic.png
    │   ├── zigzag.png
    │   └── shooter.png
    ├── boss_scorpion.png
    └── boss_crab.png
Vite копирует public/ в корень dist/ без изменений. Значит, из кода путь будет /sprites/player_heavy.png.

Шаг 2. Создай game/assets/sprites.js
js
export const SPRITES = {
  player_heavy: '/sprites/player_heavy.png',
  player_medium: '/sprites/player_medium.png',
  player_light: '/sprites/player_light.png',
  enemy_basic: '/sprites/enemies/basic.png',
  enemy_zigzag: '/sprites/enemies/zigzag.png',
  enemy_shooter: '/sprites/enemies/shooter.png',
}

const cache = {}

export function loadSprite(key) {
  if (cache[key]) return cache[key]
  const img = new Image()
  img.src = SPRITES[key]
  cache[key] = img
  return img
}

export function preloadAll() {
  return Promise.all(
    Object.keys(SPRITES).map(key => new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => { cache[key] = img; resolve() }
      img.onerror = reject
      img.src = SPRITES[key]
    }))
  )
}
Шаг 3. Замени рисование
Было (CSS-стиль):

js
drawPlayer(player) {
  ctx.fillStyle = player.ship.color
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ...
  ctx.fill()
}
Стало (со спрайтом):

js
import { loadSprite } from './assets/sprites.js'

drawPlayer(player, alpha) {
  const img = loadSprite(`player_${player.ship.id}`)
  const size = player.radius * 2.5
  ctx.drawImage(img, player.x - size/2, player.y - size/2, size, size)
}
Важно: если img.complete === false (ещё грузится), drawImage нарисует пустоту. Поэтому либо используй preloadAll() перед стартом игры, либо оставь fallback:

js
const img = loadSprite(`player_${player.ship.id}`)
if (img.complete && img.naturalWidth > 0) {
  ctx.drawImage(img, ...)
} else {
  // CSS-фолбэк (как раньше)
  ctx.fillStyle = player.ship.color
  ...
}
Шаг 4. Прелоадер (опционально)
В SpaceShooter.vue:

js
import { preloadAll } from '../game/assets/sprites.js'

onMounted(async () => {
  await preloadAll()
  game = new Game(canvasRef.value)
  game.start()
})
Пока грузится — покажи спиннер или текст «Загрузка…».

Как привязать спрайт к уровню/кораблю
Для игрока — в ships.js добавь sprite: 'player_heavy' и в drawPlayer бери player.ship.sprite.

Для врагов — в Enemy есть this.type. Ключ спрайта: enemy_${type}.

Для босса — в level.boss.sprite = 'boss_scorpion', в drawBoss — loadSprite(boss.sprite).

Для фонов планет — в levels/levels.js добавь bgImage: '/backgrounds/planet_desert.jpg'. В draw:

js
if (level.bgImage) {
  const img = loadSprite(level.bgImage)
  if (img.complete) ctx.drawImage(img, 0, 0, W, H)
  else {
    // fallback на градиент
  }
}
10. Как подключать звуки (файлы вместо синтеза)
Шаг 1. Положи файлы в public/sounds/
text
public/sounds/
├── shoot.wav
├── hit.wav
├── explode.wav
├── playerHit.wav
├── bossSpawn.wav
├── gameOver.wav
└── win.wav
Шаг 2. Замени core/audio.js на семплер
js
export class Audio {
  constructor() {
    this.ctx = null
    this.buffers = {}
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()

    if (Object.keys(this.buffers).length === 0) {
      await this._loadAll()
    }
  }

  async _loadAll() {
    const names = ['shoot', 'hit', 'explode', 'playerHit', 'bossSpawn', 'gameOver', 'win']
    await Promise.all(names.map(async (name) => {
      const res = await fetch(`/sounds/${name}.wav`)
      const arr = await res.arrayBuffer()
      this.buffers[name] = await this.ctx.decodeAudioData(arr)
    }))
  }

  play(name) {
    if (!this.ctx || !this.buffers[name]) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.buffers[name]
    src.connect(this.ctx.destination)
    src.start()
  }

  destroy() {
    if (this.ctx) this.ctx.close()
  }
}
API не меняется — audio.play('shoot') работает как раньше. Просто теперь звучат реальные сэмплы.

Форматы: .wav — универсально, .ogg и .mp3 — компактнее. Для веба лучше .ogg + fallback на .mp3. Для мобилок iOS Safari требует разблокировки через первый жест — init() вызывается по тапу/пробелу, это уже сделано.

Где взять звуки:

freesound.org — CC-лицензии, много 8-bit

opengameart.org — специально для игр

jsfxr — генератор 8-bit звуков онлайн, скачиваешь WAV

11. Как менять параметры кораблей
Файл ships.js. Каждый корабль:

js
{
  id: 'heavy',              // уникальный ID, пригодится для спрайтов
  name: 'Титан',            // отображается в меню
  maxHp: 6,                 // жизней
  speed: 200,               // px/сек
  fireCooldown: 0.28,       // пауза между выстрелами (сек)
  damage: 1,                // урон одной пули
  bulletCount: 1,           // сколько пуль за выстрел (1, 2 или 3)
  size: 22,                 // радиус коллизии
  color: '#3b82f6',         // основной цвет
  accent: '#93c5fd',        // цвет деталей
}
Хочешь 4-й корабль:

Добавь объект в SHIPS.

Меню само расширится — _getMenuLayout строит карточки по SHIPS.length.

Если карточки перестанут влезать в W = 480 — уменьши cardW в Game._getMenuLayout.

12. Как добавить полноценные системы
Сейчас системы — это функции или небольшие классы, которые Game вызывает в нужный момент. Порядок вызовов в stepGameplay — это и есть порядок работы систем.

Правило: система не хранит ссылок на Game. Она получает массив сущностей и что-то с ними делает. Пример — checkBulletsVsEnemies(bullets, enemies, onHit, onKill).

Если хочешь добавить систему:

Создай файл в systems/.

Экспортируй функцию/класс.

Импортируй в Game.js.

Вызови в stepGameplay в правильном месте (после обновления, до фильтров).

Например, система комбо:

js
// systems/ComboSystem.js
export class ComboSystem {
  constructor() { this.timer = 0; this.multiplier = 1 }
  registerKill() {
    this.multiplier = Math.min(5, this.multiplier + 1)
    this.timer = 3
  }
  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt
      if (this.timer <= 0) this.multiplier = 1
    }
  }
}
В Game: this.combo = new ComboSystem(), this.combo.update(dt) в stepGameplay, this.combo.registerKill() в onKill, а в счёте — this.score += base * this.combo.multiplier.

13. Как адаптировать под новые экраны
Сейчас W = 480, H = 720 — логические размеры. Canvas физически растягивается до DPR × W, но CSS-ом вписывается в aspect-ratio: 480/720.

Если менять пропорции:

Поменяй W, H в constants.js.

Поменяй aspect-ratio в SpaceShooter.vue.

Проверь, что UI (HUD, меню) влезает — там координаты абсолютные.

Если делать горизонтальный формат:

W = 960, H = 540 (16:9).

В drawMenu переставь карточки кораблей горизонтально в ряд (сейчас они уже в ряд — оставь).

HUD переработай: счёт слева сверху, HP справа сверху, босс-бар — сверху по центру.

Ресайз canvas уже работает через SpaceShooter.vue. При смене ориентации resize вызывается автоматически.

14. Как деплоить
Vite → статика
bash
npm run build
Получишь папку dist/ — это готовая игра.

Хостинг
Netlify / Vercel: закинь репозиторий на GitHub → подключи → build command npm run build, publish directory dist.

GitHub Pages: в vite.config.js добавь base: '/имя-репозитория/', потом через Actions или вручную ветку gh-pages.

Обычный хостинг: закинь содержимое dist/ по FTP.

Никаких Node-серверов не нужно — всё статично.

15. Где что искать (быстрая шпаргалка)
Хочу…	Открыть файл
Поменять скорость игрока/врагов	game/constants.js, game/ships.js
Поменять цвета	game/constants.js (COLORS)
Добавить уровень	game/levels/levels.js
Добавить тип врага	game/systems/spawnSystem.js + entities/enemy.js + drawEnemy в Game.js
Настроить босса	entities/boss.js + levels/levels.js (поле boss)
Добавить баф	entities/Powerup.js (новый) + systems/PowerupSystem.js (новый) + правки в Game.js
Подключить PNG-спрайт	public/sprites/… + game/assets/sprites.js (новый) + замена drawPlayer/drawEnemy/drawBoss
Подключить звук из файла	public/sounds/… + замена core/audio.js
Изменить управление	core/Input.js
Поменять игровой цикл	Game._loop
Поменять порядок систем	Game.stepGameplay
Фуллскрин / адаптив	components/SpaceShooter.vue (CSS)
16. Правила, которых стоит держаться
Все числа — в constants.js или в конфигах (ships.js, levels.js). Не разбрасывай магические числа по логике.

Сущности не знают о Game. Они просто имеют update(dt, …) и draw(ctx, …). Всё связывает Game.

Порядок в stepGameplay: обновить → коллизии → фильтры. Никогда не фильтруй массив в середине шага.

prevX / prevY обновляй в начале update. Иначе интерполяция сломается.

Никакой реактивности Vue внутри game/. Только чистый JS — иначе потеряешь FPS на 60 вызовах ref.value в секунду.

Один источник истины для конфига уровня — levels.js. Хочешь другой баланс — не правь код, правь конфиг.