import { FIXED_DT, MAX_FRAME, COLORS, BASE_W, BASE_H } from './constants.js'
import { loadSprite, isSpriteReady, getBackgroundTile } from './assets/sprites.js'
import { SHIPS } from './ships.js'
import { LEVELS } from './levels/levels.js'
import { Input } from './core/Input.js'
import { Audio } from './core/audio.js'
import { Player } from './entities/player.js'
import { Bullet } from './entities/bullet.js'
import { Particle } from './entities/particle.js'
import { Boss } from './entities/boss.js'
import { SpawnSystem } from './systems/spawnSystem.js'
import { getDifficulty } from './systems/difficultySystem.js'
import {
  checkBulletsVsEnemies, checkBulletsVsBoss,
  checkBulletsVsPlayer, checkEnemiesVsPlayer,
} from './systems/collisionSystems.js'

export const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  BOSS: 'boss',
  LEVEL_COMPLETE: 'levelComplete',
  GAME_OVER: 'gameOver',
  WIN: 'win',
}

export class Game {
  constructor(canvas, w, h) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.input = new Input(canvas)
    this.audio = new Audio()
    this.spawn = new SpawnSystem()

    this.W = w || BASE_W
    this.H = h || BASE_H

    this.bgOffsetY = 0
    this.bgTile = null
    this.bgTileUrl = null

    this.stars = []

    this.state = STATES.MENU
    this.selectedShip = 0
    this.levelIndex = 0

    this.player = null
    this.bullets = []
    this.enemies = []
    this.particles = []
    this.enemyBullets = []
    this.boss = null

    this.score = 0
    this.best = Number(localStorage.getItem('ss-best') || 0)

    this.waveTimer = 0
    this.waveLevel = 1
    this.stateTimer = 0

    this.cameraShake = 0
    this.flashAlpha = 0
    this.hitstop = 0

    this.accumulator = 0
    this.lastTime = 0
    this.started = false

    // Текущая сложность (для отладки / HUD)
    this.difficulty = null

    this._loop = this._loop.bind(this)
  }

  setViewport(w, h) {
    this.W = w
    this.H = h
    if (this.player) {
      this.player.x = Math.min(this.player.x, w - this.player.radius)
      this.player.y = Math.min(this.player.y, h - this.player.radius)
    }
    this.generateStars()
  }

  start() {
    this.started = true
    this.lastTime = 0
    this._raf = requestAnimationFrame(this._loop)
  }

  stop() {
    this.started = false
    if (this._raf) cancelAnimationFrame(this._raf)
  }

  destroy() {
    this.stop()
    this.input.destroy()
    this.audio.destroy()
    if (this.best) localStorage.setItem('ss-best', this.best)
  }

  // ============================================================
  // ЗВЁЗДЫ
  // ============================================================
  generateStars() {
    const W = this.W
    const H = this.H
    const level = LEVELS[Math.min(this.levelIndex, LEVELS.length - 1)]
    const count = level.stars || 60

    const palette = ['#ffffff', '#cfe8ff', '#ffe4c9', '#ffd6e0', '#e0d4ff']

    this.stars = []
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 20 + Math.random() * 60,
        size: Math.random() < 0.15 ? 2 : 1.5,
        alpha: 0.35 + Math.random() * 0.55,
        color: palette[Math.floor(Math.random() * palette.length)],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 2,
      })
    }
  }

  updateStars(dt) {
    const W = this.W
    const H = this.H
    for (const s of this.stars) {
      s.y += s.speed * dt
      s.twinklePhase += s.twinkleSpeed * dt
      if (s.y > H + 2) {
        s.y = -2
        s.x = Math.random() * W
      }
    }
  }

  // ============================================================
  // СОСТОЯНИЯ
  // ============================================================
  startGame() {
    const ship = SHIPS[this.selectedShip]
    this.player = new Player(ship)
    this.player.reset(this.W / 2, this.H - 80)
    this.levelIndex = 0
    this.score = 0
    this.bullets = []
    this.enemies = []
    this.particles = []
    this.enemyBullets = []
    this.boss = null
    this.enterLevel()
  }

  enterLevel() {
    const level = LEVELS[this.levelIndex]
    this.spawn.configure(level)
    this.waveTimer = 0
    this.waveLevel = 1
    this.state = STATES.PLAYING
    this.stateTimer = 0
    this.player.reset(this.player.x, this.H - 80)

    this.bgOffsetY = 0
    this.bgTile = null
    this.bgTileUrl = null

    this.generateStars()
  }

  spawnBoss() {
    const level = LEVELS[this.levelIndex]
    const diff = getDifficulty(this.levelIndex, this.waveTimer, level.duration)

    this.boss = new Boss(level.boss, this.W)
    // Усиливаем босса по кривой сложности
    this.boss.maxHp = Math.round(this.boss.maxHp * diff.bossHpMul)
    this.boss.hp = this.boss.maxHp
    this.boss.attackInterval = this.boss.attackInterval / diff.bossAttackRateMul

    this.state = STATES.BOSS
    this.stateTimer = 0
    this.audio.play('bossSpawn')
    this.cameraShake = 12
  }

  completeLevel() {
    this.boss = null
    this.enemies = []
    this.enemyBullets = []
    this.levelIndex++
    if (this.levelIndex >= LEVELS.length) {
      this.state = STATES.WIN
      this.audio.play('win')
      if (this.score > this.best) this.best = this.score
    } else {
      this.state = STATES.LEVEL_COMPLETE
      this.stateTimer = 0
      if (this.score > this.best) this.best = this.score
    }
  }

  gameOver() {
    this.state = STATES.GAME_OVER
    this.audio.play('gameOver')
    if (this.score > this.best) this.best = this.score
  }

  backToMenu() {
    this.state = STATES.MENU
    this.boss = null
    this.player = null
    this.enemies = []
    this.bullets = []
    this.enemyBullets = []
    this.particles = []
  }

  // ============================================================
  // ФИЗИКА
  // ============================================================
  step(dt) {
    if (this.hitstop > 0) { this.hitstop -= dt; return }

    if (this.state === STATES.PLAYING || this.state === STATES.BOSS) {
      this.stepGameplay(dt)
    } else if (this.state === STATES.LEVEL_COMPLETE) {
      this.stateTimer += dt
      if (this.stateTimer > 1.5) this.enterLevel()
    }
  }

  updateBackground(dt) {
    if (this.state !== STATES.PLAYING && this.state !== STATES.BOSS) return
    const level = LEVELS[Math.min(this.levelIndex, LEVELS.length - 1)]
    if (!level.bgImage) return

    if (!this.bgTile && this.bgTileUrl !== level.bgImage) {
      this.bgTileUrl = level.bgImage
      const url = level.bgImage
      const blend = level.bgBlend ?? 0.15
      getBackgroundTile(url, blend).then(tile => {
        if (this.bgTileUrl === url) this.bgTile = tile
      }).catch(err => {
        console.warn('[bg] Не удалось загрузить фон:', err)
        this.bgTileUrl = null
      })
    }

    if (!this.bgTile) return

    const speed = level.bgScrollSpeed || 30
    this.bgOffsetY += speed * dt
    const tileH = this.bgTile.height
    if (tileH > 0 && this.bgOffsetY >= tileH) this.bgOffsetY -= tileH
  }

  stepGameplay(dt) {
    const player = this.player
    const W = this.W
    const H = this.H

    this.updateBackground(dt)
    this.updateStars(dt)

    // Игрок
    player.update(dt, this.input, W, H)

    // Огонь
    if (this.input.getFire() && player.canFire()) {
      const newBullets = player.fire()
      for (const b of newBullets) {
        this.bullets.push(new Bullet(b.x, b.y, b.vx, b.vy, true, player.ship.damage))
      }
      this.audio.play('shoot')
    }

    // Частицы
    for (const p of this.particles) p.update(dt)
    this.particles = this.particles.filter(p => !p.dead)

    // Считаем текущую сложность — используется во всех системах
    const level = LEVELS[Math.min(this.levelIndex, LEVELS.length - 1)]
    const diff = getDifficulty(this.levelIndex, this.waveTimer, level.duration)
    this.difficulty = diff

    // Спавн
    if (this.state === STATES.PLAYING) {
      this.waveTimer += dt
      if (this.waveTimer >= level.duration) {
        this.spawnBoss()
      } else {
        // Спавним, только если есть место
        if (this.enemies.length < diff.maxEnemies) {
          const enemy = this.spawn.update(dt, W, this.waveLevel, diff)
          if (enemy) this.enemies.push(enemy)
        }
        // waveLevel растёт каждые 5 сек
        this.waveLevel = 1 + Math.floor(this.waveTimer / 5)
      }
    }

    // Враги — темп стрельбы ускоряется вместе со сложностью
    const fireRateMul = diff.enemyFireRateMul || 1
    for (const e of this.enemies) {
      // Умножаем dt для внутреннего таймера стрельбы → стреляет чаще
      e.update(dt * fireRateMul, W, H, player.x, player.y, 280)
      if (e.shouldShoot) {
        e.shouldShoot = false
        const dx = player.x - e.x, dy = player.y - e.y
        const d = Math.hypot(dx, dy) || 1
        const bulletSpeed = 280 * (diff.enemyBulletSpeedMul || 1)
        this.enemyBullets.push(new Bullet(
          e.x, e.y + e.radius,
          (dx / d) * bulletSpeed,
          (dy / d) * bulletSpeed,
          false
        ))
      }
    }

    // Пули
    for (const b of this.bullets) b.update(dt, W, H)
    for (const b of this.enemyBullets) b.update(dt, W, H)

    // Босс — атакует чаще в зависимости от сложности
    if (this.boss) {
      const bossDt = dt * (diff.bossAttackRateMul || 1)
      this.boss.update(bossDt, player.x, player.y)
      if (this.boss.shouldAttack) {
        this.boss.shouldAttack = false
        const bullets = this.boss.attack()
        for (const b of bullets) {
          this.enemyBullets.push(new Bullet(b.x, b.y, b.vx, b.vy, false))
        }
      }

      checkBulletsVsBoss(this.bullets, this.boss, (x, y) => {
        this.spawnParticles(x, y, '#fff', 4)
        this.audio.play('hit')
      })

      if (this.boss.dead) {
        this.score += 500 * (1 + this.levelIndex)
        this.spawnParticles(this.boss.x, this.boss.y, this.boss.color, 60, 400)
        this.spawnParticles(this.boss.x, this.boss.y, this.boss.accent, 30, 300)
        this.audio.play('explode')
        this.cameraShake = 24
        this.flashAlpha = 0.9
        this.hitstop = 0.08
        this.completeLevel()
        return
      }
    }

    // Коллизии
    checkBulletsVsEnemies(this.bullets, this.enemies,
      (x, y) => {
        this.spawnParticles(x, y, '#fff', 4)
        this.audio.play('hit')
      },
      (enemy) => {
        this.score += enemy.type === 'shooter' ? 30
                  : enemy.type === 'zigzag' ? 20
                  : 10
        const color = enemy.type === 'shooter' ? COLORS.enemyShooter
                    : enemy.type === 'zigzag' ? COLORS.enemyZigzag
                    : COLORS.enemyBasic
        this.spawnParticles(enemy.x, enemy.y, color, 14)
        this.audio.play('explode')
        this.cameraShake = Math.max(this.cameraShake, 4)
      }
    )

    checkBulletsVsPlayer(this.enemyBullets, player, () => this.damagePlayer())
    checkEnemiesVsPlayer(this.enemies, player, () => this.damagePlayer())

    // Фильтры
    this.bullets = this.bullets.filter(b => !b.dead)
    this.enemyBullets = this.enemyBullets.filter(b => !b.dead)
    this.enemies = this.enemies.filter(e => !e.dead)

    // Камера
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - 40 * dt)
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - 3 * dt)
  }

  damagePlayer() {
    if (!this.player.takeDamage()) return
    this.spawnParticles(this.player.x, this.player.y, '#facc15', 16)
    this.audio.play('playerHit')
    this.cameraShake = 16
    this.flashAlpha = 0.5
    if (this.player.hp <= 0) this.gameOver()
  }

  spawnParticles(x, y, color, count = 12, speed = 180) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const s = speed * (0.4 + Math.random() * 0.8)
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, 0.4 + Math.random() * 0.4))
    }
  }

  // ============================================================
  // ОТРИСОВКА
  // ============================================================
  draw(alpha, now) {
    const ctx = this.ctx
    const W = this.W
    const H = this.H

    if (this.state === STATES.MENU) { this.drawMenu(now); return }

    const level = LEVELS[Math.min(this.levelIndex, LEVELS.length - 1)]

    // Фон
    if (this.bgTile) {
      this.drawScrollingBackground(ctx, level)
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, level.bgTop)
      grad.addColorStop(1, level.bgBottom)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
    }

    // Звёзды
    for (const s of this.stars) {
      const tw = 0.8 + Math.sin(s.twinklePhase) * 0.2
      ctx.globalAlpha = s.alpha * tw
      ctx.fillStyle = s.color
      ctx.fillRect(s.x, s.y, s.size, s.size)
    }
    ctx.globalAlpha = 1

    // Тряска
    const shakeX = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake : 0
    const shakeY = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake : 0
    ctx.save()
    ctx.translate(shakeX, shakeY)

    for (const p of this.particles) {
      const x = p.prevX + (p.x - p.prevX) * alpha
      const y = p.prevY + (p.y - p.prevY) * alpha
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(x, y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (const e of this.enemies) this.drawEnemy(e, alpha)
    if (this.boss) this.drawBoss(this.boss, alpha)
    for (const b of this.bullets) this.drawBullet(b, alpha, true)
    for (const b of this.enemyBullets) this.drawBullet(b, alpha, false)
    if (this.player) this.drawPlayer(this.player, alpha, now)
    if (this.input.joyVisual.active) this.drawJoystick()

    ctx.restore()

    this.drawHUD()
    this.drawOverlay(now)

    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`
      ctx.fillRect(0, 0, W, H)
    }
  }

  drawScrollingBackground(ctx, level) {
    const W = this.W
    const H = this.H
    const tile = this.bgTile

    if (!tile || tile.width === 0 || tile.height === 0) return

    const tileW = tile.width
    const tileH = tile.height
    const scale = Math.max(H / tileH, 1)
    const drawW = tileW * scale
    const drawH = tileH * scale
    const offsetX = (W - drawW) / 2

    const y1 = -this.bgOffsetY * scale
    const y2 = y1 + drawH

    ctx.drawImage(tile, offsetX, y1, drawW, drawH)
    ctx.drawImage(tile, offsetX, y2, drawW, drawH)

    if (y2 + drawH < H) {
      ctx.drawImage(tile, offsetX, y2 + drawH, drawW, drawH)
    }
  }

  drawMenu(now) {
    const ctx = this.ctx
    const W = this.W
    const H = this.H

    ctx.fillStyle = '#0b1026'
    ctx.fillRect(0, 0, W, H)

    // Звёзды
    for (const s of this.stars) {
      const tw = 0.8 + Math.sin(s.twinklePhase) * 0.2
      ctx.globalAlpha = s.alpha * tw
      ctx.fillStyle = s.color
      ctx.fillRect(s.x, s.y, s.size, s.size)
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 42px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('SPACE', W / 2, 60)
    ctx.fillStyle = '#38bdf8'
    ctx.fillText('SHOOTER', W / 2, 105)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '14px Arial'
    ctx.fillText('Выбери корабль', W / 2, 180)

    const layout = this._getMenuLayout()

    for (let i = 0; i < SHIPS.length; i++) {
      const ship = SHIPS[i]
      const c = layout.cards[i]
      const selected = i === this.selectedShip
      const cx = c.x + c.w / 2
      const cy = c.y + c.h / 2

      const pulse = selected ? 1 + Math.sin(now / 300) * 0.03 : 1
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(pulse, pulse)
      ctx.translate(-cx, -cy)

      ctx.fillStyle = selected ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)'
      ctx.strokeStyle = selected ? '#38bdf8' : 'rgba(255,255,255,0.15)'
      ctx.lineWidth = selected ? 3 : 1
      roundRect(ctx, c.x, c.y, c.w, c.h, 10)
      ctx.fill()
      ctx.stroke()

      this.drawShipIcon(ctx, cx, c.y + 80, ship, 1.6)

      ctx.fillStyle = selected ? '#38bdf8' : '#fff'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(ship.name, cx, c.y + 150)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px Arial'
      ctx.fillText(`HP: ${ship.maxHp}`, cx, c.y + 178)
      ctx.fillText(`Скорость: ${ship.speed}`, cx, c.y + 195)
      ctx.fillText(`Урон: ${ship.damage}`, cx, c.y + 212)
      ctx.fillText(`Пули: ${ship.bulletCount}`, cx, c.y + 229)

      ctx.restore()
    }

    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('← → / клик по карточке · ПРОБЕЛ / тап — старт', W / 2, H - 60)
  }

  drawShipIcon(ctx, x, y, ship, scale = 1) {
    const s = ship.size * scale
    ctx.save()
    ctx.translate(x, y)

    ctx.shadowColor = ship.color
    ctx.shadowBlur = 20
    ctx.fillStyle = ship.color
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.8, s * 0.7)
    ctx.lineTo(0, s * 0.4)
    ctx.lineTo(-s * 0.8, s * 0.7)
    ctx.closePath()
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle = ship.accent
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  drawPlayer(player, alpha, now) {
    const ctx = this.ctx
    const x = player.x
    const y = player.y
    const s = player.radius

    const blink = player.invulnTimer > 0 && Math.floor(now / 80) % 2 === 0
    if (blink) return

    const img = loadSprite(`player_${player.ship.id}`)
    if (isSpriteReady(img)) {
      const size = s * 2.8
      ctx.save()
      ctx.translate(x, y)
      const tilt = player.vx / player.ship.speed * 0.2
      ctx.rotate(tilt)
      ctx.drawImage(img, -size / 2, -size / 2, size, size)
      ctx.restore()
      return
    }

    ctx.save()
    ctx.translate(x, y)

    ctx.shadowColor = player.ship.color
    ctx.shadowBlur = 16
    ctx.fillStyle = player.ship.color
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.8, s * 0.7)
    ctx.lineTo(0, s * 0.4)
    ctx.lineTo(-s * 0.8, s * 0.7)
    ctx.closePath()
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle = player.ship.accent
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2)
    ctx.fill()

    const flame = s * 0.4 + Math.random() * s * 0.3
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.moveTo(-s * 0.3, s * 0.4)
    ctx.lineTo(0, s * 0.4 + flame)
    ctx.lineTo(s * 0.3, s * 0.4)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }

  drawEnemy(enemy, alpha) {
    const ctx = this.ctx
    const x = enemy.prevX + (enemy.x - enemy.prevX) * alpha
    const y = enemy.prevY + (enemy.y - enemy.prevY) * alpha
    const r = enemy.radius

    const img = loadSprite(`enemy_${enemy.type}`)
    if (isSpriteReady(img)) {
      const size = r * 2.5
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
      return
    }

    let color = COLORS.enemyBasic
    if (enemy.type === 'zigzag') color = COLORS.enemyZigzag
    if (enemy.type === 'shooter') color = COLORS.enemyShooter
    if (enemy.hitFlash > 0) color = '#fff'

    ctx.save()
    ctx.translate(x, y)
    ctx.shadowColor = color
    ctx.shadowBlur = 10
    ctx.fillStyle = color

    if (enemy.type === 'zigzag') {
      ctx.beginPath()
      ctx.moveTo(0, -r)
      ctx.lineTo(r, 0)
      ctx.lineTo(0, r)
      ctx.lineTo(-r, 0)
      ctx.closePath()
      ctx.fill()
    } else if (enemy.type === 'shooter') {
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 - Math.PI / 2
        const px = Math.cos(a) * r, py = Math.sin(a) * r
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.shadowBlur = 0
    ctx.fillStyle = '#0b1026'
    ctx.beginPath()
    ctx.arc(0, 2, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawBoss(boss, alpha) {
    const ctx = this.ctx
    const x = boss.prevX + (boss.x - boss.prevX) * alpha
    const y = boss.prevY + (boss.y - boss.prevY) * alpha

    const img = loadSprite(boss.spriteKey)
    if (isSpriteReady(img)) {
      const size = boss.radius * 2.4
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
      return
    }

    ctx.save()
    ctx.translate(x, y)
    ctx.shadowColor = boss.color
    ctx.shadowBlur = 30
    ctx.fillStyle = boss.hitFlash > 0 ? '#fff' : boss.color

    ctx.beginPath()
    ctx.ellipse(0, 0, boss.radius, boss.radius * 0.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    if (this.player) {
      const dx = this.player.x - boss.x, dy = this.player.y - boss.y
      const d = Math.hypot(dx, dy) || 1
      ctx.fillStyle = '#0b1026'
      ctx.beginPath()
      ctx.arc((dx / d) * 15, (dy / d) * 10, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = boss.accent
      ctx.beginPath()
      ctx.arc((dx / d) * 15, (dy / d) * 10, 6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  drawBullet(b, alpha, fromPlayer) {
    const ctx = this.ctx
    const x = b.prevX + (b.x - b.prevX) * alpha
    const y = b.prevY + (b.y - b.prevY) * alpha
    ctx.fillStyle = fromPlayer ? COLORS.bulletPlayer : COLORS.bulletEnemy
    ctx.shadowColor = ctx.fillStyle
    ctx.shadowBlur = 10
    if (fromPlayer) {
      ctx.fillRect(x - 1.5, y - 6, 3, 12)
    } else {
      ctx.beginPath()
      ctx.arc(x, y, b.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
  }

  drawJoystick() {
    const ctx = this.ctx
    const j = this.input.joyVisual
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(j.originX, j.originY, 50, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(56,189,248,0.6)'
    ctx.beginPath()
    ctx.arc(j.currentX, j.currentY, 22, 0, Math.PI * 2)
    ctx.fill()
  }

  drawHUD() {
    const ctx = this.ctx
    const W = this.W
    const H = this.H
    const player = this.player
    if (!player) return

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('Очки: ' + this.score, 14, 12)

    ctx.textAlign = 'right'
    ctx.fillText('Рекорд: ' + this.best, W - 14, 12)

    ctx.textAlign = 'left'
    for (let i = 0; i < player.hp; i++) {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(20 + i * 22, 48, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(player.ship.name, 14, 70)
    const lvl = LEVELS[this.levelIndex]
    if (lvl) {
      ctx.fillText(`${lvl.name} (ур. ${this.levelIndex + 1}/${LEVELS.length})`, 14, 88)
    }

    // Индикатор сложности
    if (this.difficulty && (this.state === STATES.PLAYING || this.state === STATES.BOSS)) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = 'bold 11px Arial'
      const diffPct = Math.round((this.difficulty.enemySpeedMul - 1) * 100)
      ctx.fillText(`Сложность: +${diffPct}%`, 14, 106)
    }

    if (this.boss) {
      const barW = W - 80
      const barX = 40
      const barY = H - 30
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(barX - 2, barY - 2, barW + 4, 16)
      ctx.fillStyle = '#7f1d1d'
      ctx.fillRect(barX, barY, barW, 12)
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(barX, barY, barW * (this.boss.hp / this.boss.maxHp), 12)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.strokeRect(barX, barY, barW, 12)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(this.boss.name, W / 2, barY - 14)
    }
  }

  drawOverlay(now) {
    const ctx = this.ctx
    const W = this.W
    const H = this.H

    if (this.state === STATES.LEVEL_COMPLETE) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#4ade80'
      ctx.font = 'bold 40px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('УРОВЕНЬ ПРОЙДЕН', W / 2, H / 2)
    }
    if (this.state === STATES.GAME_OVER) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 44px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('ИГРА ОКОНЧЕНА', W / 2, H / 2 - 40)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 22px Arial'
      ctx.fillText('Очки: ' + this.score, W / 2, H / 2 + 20)
      ctx.fillText('Рекорд: ' + this.best, W / 2, H / 2 + 55)
      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 16px Arial'
      ctx.fillText('Тап / пробел — в меню', W / 2, H / 2 + 120)
    }
    if (this.state === STATES.WIN) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 44px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('ПОБЕДА!', W / 2, H / 2 - 40)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 22px Arial'
      ctx.fillText('Очки: ' + this.score, W / 2, H / 2 + 20)
      ctx.fillText('Рекорд: ' + this.best, W / 2, H / 2 + 55)
      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 16px Arial'
      ctx.fillText('Тап / пробел — в меню', W / 2, H / 2 + 120)
    }
  }

  // ============================================================
  // ГЛАВНЫЙ ЦИКЛ
  // ============================================================
  _loop(now) {
    if (!this.started) return

    try {
      if (!this.lastTime) this.lastTime = now
      let dt = (now - this.lastTime) / 1000
      this.lastTime = now
      if (dt > MAX_FRAME) dt = MAX_FRAME

      this.accumulator += dt

      this._processEvents(this.input.consumeEvents())

      let iter = 0
      while (this.accumulator >= FIXED_DT && iter < 10) {
        this.step(FIXED_DT)
        this.accumulator -= FIXED_DT
        iter++
      }
      if (iter >= 10) this.accumulator = 0

      const alpha = this.accumulator / FIXED_DT
      this.draw(alpha, now)
    } catch (err) {
      console.error('[Game] Ошибка:', err)
    }

    this._raf = requestAnimationFrame(this._loop)
  }

  _processEvents(events) {
    for (const evt of events) {
      if (this.state === STATES.MENU) {
        if (evt.type === 'left') {
          this.selectedShip = Math.max(0, this.selectedShip - 1)
        } else if (evt.type === 'right') {
          this.selectedShip = Math.min(SHIPS.length - 1, this.selectedShip + 1)
        } else if (evt.type === 'fire') {
          this.audio.init()
          this.startGame()
        } else if (evt.type === 'tap') {
          if (this._trySelectByTap(evt.x, evt.y)) continue
          this.audio.init()
          this.startGame()
        }
      }
      else if (this.state === STATES.GAME_OVER || this.state === STATES.WIN) {
        if (evt.type === 'fire' || evt.type === 'tap') {
          this.backToMenu()
        }
      }
    }
  }

  _trySelectByTap(x, y) {
    const layout = this._getMenuLayout()
    for (let i = 0; i < layout.cards.length; i++) {
      const c = layout.cards[i]
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this.selectedShip = i
        return true
      }
    }
    return false
  }

  _getMenuLayout() {
    const W = this.W
    const cardW = 130
    const cardH = 260
    const gap = 12
    const totalW = cardW * 3 + gap * 2
    const startX = (W - totalW) / 2
    const y = 220
    const cards = []
    for (let i = 0; i < SHIPS.length; i++) {
      cards.push({ x: startX + i * (cardW + gap), y, w: cardW, h: cardH })
    }
    return { cards }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
