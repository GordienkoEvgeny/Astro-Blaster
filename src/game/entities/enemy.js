export class Enemy {
  constructor(type, x, y, hp, speed) {
    this.type = type
    this.x = x
    this.y = y
    this.radius = type === 'shooter' ? 16
                : type === 'zigzag' ? 13
                : type === 'fighter' ? 16
                : type === 'asteroid' ? 18
                : 14

    this.hp = hp
    this.maxHp = hp
    this.speed = speed
    this.phase = Math.random() * Math.PI * 2
    this.shootTimer = type === 'shooter' ? 1 + Math.random() : 0
    this.hitFlash = 0
    this.dead = false
    this.prevX = x
    this.prevY = y
    this.shouldShoot = false

    // Спрайт по типу
    if (type === 'asteroid') {
      this.spriteKey = `asteroid_${1 + Math.floor(Math.random() * 4)}`
    } else if (type === 'fighter') {
      this.spriteKey = 'enemy_fighter'
    } else if (type === 'zigzag') {
      this.spriteKey = 'enemy_zigzag'
    } else if (type === 'shooter') {
      this.spriteKey = 'enemy_shooter'
    } else {
      this.spriteKey = 'enemy_basic'
    }

    // Вращение — ТОЛЬКО астероиды
    this.rotation = 0
    this.rotationSpeed = 0
    if (type === 'asteroid') {
      this.rotation = Math.random() * Math.PI * 2
      this.rotationSpeed = (Math.random() - 0.5) * 2
    }

    // Ракеты — ТОЛЬКО fighter
    this.missileTimer = type === 'fighter' ? 1.0 + Math.random() * 1.0 : 0
    this.missileCooldown = 3.0
    this.shouldLaunchMissile = false
  }

  update(dt, W, H, playerX, playerY, enemyBulletSpeed) {
    this.prevX = this.x
    this.prevY = this.y
    this.y += this.speed * dt

    // Вращение — только астероиды
    if (this.type === 'asteroid') {
      this.rotation += this.rotationSpeed * dt
    }

    // Истребитель — пускает ракеты
    if (this.type === 'fighter') {
      this.missileTimer -= dt
      if (this.missileTimer <= 0 && this.y > 20 && this.y < H * 0.75) {
        this.missileTimer = this.missileCooldown
        this.shouldLaunchMissile = true
      }
    }

    // Зигзаг
    if (this.type === 'zigzag') {
      this.x += Math.sin(this.phase + this.y * 0.02) * 140 * dt
      this.x = Math.max(this.radius, Math.min(W - this.radius, this.x))
    }

    // Стрелок
    if (this.type === 'shooter') {
      this.shootTimer -= dt
      if (this.shootTimer <= 0 && this.y > 0) {
        this.shootTimer = 1.4
        this.shouldShoot = true
      }
    }

    // Астероид — лёгкое покачивание
    if (this.type === 'asteroid') {
      this.x += Math.sin(this.phase + this.y * 0.01) * 30 * dt
      this.x = Math.max(this.radius, Math.min(W - this.radius, this.x))
    }

    if (this.hitFlash > 0) this.hitFlash -= dt
    if (this.y - this.radius > H + 20) this.dead = true
  }

  takeDamage(dmg) {
    this.hp -= dmg
    this.hitFlash = 0.1
    if (this.hp <= 0) {
      this.hp = 0
      this.dead = true
      return true
    }
    return false
  }
}
