export class Boss {
  constructor(config, W) {
    this.name = config.name
    this.W = W
    this.x = W / 2
    this.y = -80
    this.targetY = 130
    this.radius = 50
    this.hp = config.hp
    this.maxHp = config.hp
    this.color = config.color
    this.accent = config.accent
    this.attackInterval = config.attackInterval
    this.attackTimer = config.attackInterval
    this.phase = 0
    this.angle = 0
    this.vx = 100
    this.hitFlash = 0
    this.dead = false
    this.shouldAttack = false
    this.prevX = this.x; this.prevY = this.y
    this.entering = true
  }

  update(dt, playerX, playerY) {
    this.prevX = this.x; this.prevY = this.y

    if (this.entering) {
      this.y += 60 * dt
      if (this.y >= this.targetY) this.entering = false
      return
    }

    // Движение в стороны
    this.x += this.vx * dt
    if (this.x < this.radius + 10) { this.x = this.radius + 10; this.vx *= -1 }
    if (this.x > this.W - this.radius - 10) { this.x = this.W - this.radius - 10; this.vx *= -1 }

    // Атака
    this.attackTimer -= dt
    if (this.attackTimer <= 0) {
      this.attackTimer = this.attackInterval
      this.shouldAttack = true
    }

    this.angle += 0.6
    if (this.hitFlash > 0) this.hitFlash -= dt
  }

  takeDamage(dmg) {
    this.hp -= dmg
    this.hitFlash = 0.1
    if (this.hp <= 0) { this.hp = 0; this.dead = true; return true }
    return false
  }

  // Отдаёт массив пуль (веер из 5)
  attack() {
    const bullets = []
    const base = Math.PI / 2
    for (let k = -2; k <= 2; k++) {
      const a = base + k * 0.22
      bullets.push({
        x: this.x,
        y: this.y + this.radius * 0.6,
        vx: Math.cos(a) * 260,
        vy: Math.sin(a) * 260,
      })
    }
    return bullets
  }
}
