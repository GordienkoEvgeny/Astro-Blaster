import { BULLET_RADIUS } from '../constants.js'

export class Bullet {
  constructor(x, y, vx, vy, fromPlayer, damage = 1) {
    this.x = x; this.y = y
    this.vx = vx; this.vy = vy
    this.radius = fromPlayer ? BULLET_RADIUS : 4
    this.fromPlayer = fromPlayer
    this.damage = damage
    this.dead = false
    this.prevX = x; this.prevY = y
  }

  update(dt, W, H) {
    this.prevX = this.x; this.prevY = this.y
    this.x += this.vx * dt
    this.y += this.vy * dt
    if (this.y < -20 || this.y > H + 20 || this.x < -20 || this.x > W + 20) this.dead = true
  }
}
