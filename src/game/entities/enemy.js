export class Enemy {
  constructor(type, x, y, hp, speed) {
    this.type = type
    this.x = x
    this.y = y
    this.radius = type === 'shooter' ? 16 : type === 'zigzag' ? 13 : 14
    this.hp = hp
    this.maxHp = hp
    this.speed = speed
    this.phase = Math.random() * Math.PI * 2
    this.shootTimer = type === 'shooter' ? 1 + Math.random() : 0
    this.hitFlash = 0
    this.dead = false
    this.prevX = x; this.prevY = y
    this.shouldShoot = false   // флаг для системы оружия врага
  }

  update(dt, W, H, playerX, playerY, enemyBulletSpeed) {
    this.prevX = this.x; this.prevY = this.y
    this.y += this.speed * dt

    if (this.type === 'zigzag') {
      this.x += Math.sin(this.phase + this.y * 0.02) * 140 * dt
      this.x = Math.max(this.radius, Math.min(W - this.radius, this.x))
    }

    if (this.type === 'shooter') {
      this.shootTimer -= dt
      if (this.shootTimer <= 0 && this.y > 0) {
        this.shootTimer = 1.4
        this.shouldShoot = true
      }
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
