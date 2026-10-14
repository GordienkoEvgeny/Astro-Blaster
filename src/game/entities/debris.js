export class Debris {
  constructor(x, y, vx, vy, size, color, life = 2.0) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.size = size
    this.color = color
    this.life = life
    this.maxLife = life

    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 8

    this.vertices = 5 + Math.floor(Math.random() * 3)
    this.shapeSeed = Math.random() * 100

    this.dead = false
    this.prevX = x
    this.prevY = y
  }

  update(dt) {
    this.prevX = this.x
    this.prevY = this.y
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.rotation += this.rotationSpeed * dt
    this.life -= dt
    if (this.life <= 0) this.dead = true
  }
}
