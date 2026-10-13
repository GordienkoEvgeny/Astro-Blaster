import { PLAYER_INVULN_TIME } from '../constants.js'

export class Player {
  constructor(ship) {
    this.ship = ship
    this.x = 0
    this.y = 0
    this.vx = 0
    this.vy = 0
    this.radius = ship.size
    this.hp = ship.maxHp
    this.maxHp = ship.maxHp
    this.invulnTimer = 0
    this.fireTimer = 0
  }

  reset(x, y) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.hp = this.maxHp
    this.invulnTimer = 0
    this.fireTimer = 0
  }

  update(dt, input, W, H) {
    const { dx, dy } = input.getMove()
    this.vx = dx * this.ship.speed
    this.vy = dy * this.ship.speed
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.x = Math.max(this.radius, Math.min(W - this.radius, this.x))
    this.y = Math.max(this.radius, Math.min(H - this.radius, this.y))

    if (this.invulnTimer > 0) this.invulnTimer -= dt
    if (this.fireTimer > 0) this.fireTimer -= dt
  }

  canFire() {
    return this.fireTimer <= 0
  }

  fire() {
    this.fireTimer = this.ship.fireCooldown
    const bullets = []
    const count = this.ship.bulletCount
    const y = this.y - this.radius

    if (count === 1) {
      bullets.push({ x: this.x, y, vx: 0, vy: -620 })
    } else if (count === 2) {
      bullets.push({ x: this.x - 7, y, vx: 0, vy: -620 })
      bullets.push({ x: this.x + 7, y, vx: 0, vy: -620 })
    } else {
      bullets.push({ x: this.x, y, vx: 0, vy: -620 })
      bullets.push({ x: this.x - 10, y, vx: -80, vy: -620 })
      bullets.push({ x: this.x + 10, y, vx: 80, vy: -620 })
    }
    return bullets
  }

  takeDamage() {
    if (this.invulnTimer > 0) return false
    this.hp--
    this.invulnTimer = PLAYER_INVULN_TIME
    return true
  }
}
