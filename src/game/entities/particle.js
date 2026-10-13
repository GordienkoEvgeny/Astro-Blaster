// Particle.js
export class Particle {
  constructor(x, y, vx, vy, color, life = 0.6, radius = 3) {
    this.x = x; this.y = y
    this.vx = vx; this.vy = vy
    this.color = color
    this.life = life
    this.maxLife = life
    this.radius = radius
    this.prevX = x; this.prevY = y
  }
  update(dt) {
    this.prevX = this.x; this.prevY = this.y
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vx *= 0.94
    this.vy *= 0.94
    this.life -= dt
  }
  get dead() { return this.life <= 0 }
}
