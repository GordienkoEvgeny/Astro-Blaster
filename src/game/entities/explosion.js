/**
 * Взрыв — последовательность кадров.
 * frameDuration — сколько секунд показывается один кадр.
 */
export class Explosion {
  constructor(x, y, size, frames = ['explosion_1', 'explosion_2', 'explosion_3', 'explosion_4'], frameDuration = 0.08) {
    this.x = x
    this.y = y
    this.size = size
    this.frames = frames
    this.frameDuration = frameDuration
    this.t = 0
    this.total = frames.length * frameDuration
    this.dead = false
    this.prevX = x
    this.prevY = y
    this.rotation = Math.random() * Math.PI * 2
  }

  update(dt) {
    this.t += dt
    if (this.t >= this.total) this.dead = true
  }

  get currentFrameKey() {
    const idx = Math.min(this.frames.length - 1, Math.floor(this.t / this.frameDuration))
    return this.frames[idx]
  }

  get progress() {
    return Math.min(1, this.t / this.total)
  }
}
