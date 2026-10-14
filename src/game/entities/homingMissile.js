/**
 * Самонаводящаяся ракета.
 * Летит к цели с ограниченной скоростью поворота.
 */
export class HomingMissile {
  constructor(x, y, target, config = {}) {
    this.x = x
    this.y = y
    this.prevX = x
    this.prevY = y

    this.target = target    // ссылка на игрока (player)

    this.speed = config.speed ?? 320
    this.turnRate = config.turnRate ?? 4.0        // рад/сек — скорость поворота
    this.life = config.life ?? 6.0                // сколько живёт, сек
    this.radius = config.radius ?? 6
    this.damage = config.damage ?? 1

    // Стартуем "вниз" (в сторону игрока) — угол в радианах
    const dx = target.x - x
    const dy = target.y - y
    const a = Math.atan2(dy, dx)
    this.angle = a
    this.vx = Math.cos(a) * this.speed
    this.vy = Math.sin(a) * this.speed

    // Плавный "запуск" — первые 0.15 сек летит медленнее
    this.warmup = 0.15

    // Дымный след
    this.trail = []
    this.trailTimer = 0

    this.dead = false
  }

  update(dt) {
    this.prevX = this.x
    this.prevY = this.y

    // Разгон после запуска
    if (this.warmup > 0) {
      this.warmup -= dt
      const factor = 0.4 + (1 - this.warmup / 0.15) * 0.6
      this.x += Math.cos(this.angle) * this.speed * factor * dt
      this.y += Math.sin(this.angle) * this.speed * factor * dt
    } else {
      // Наведение
      if (this.target && !this.target.dead) {
        const dx = this.target.x - this.x
        const dy = this.target.y - this.y
        const desiredAngle = Math.atan2(dy, dx)

        // Разница углов, нормализованная в -π..π
        let diff = desiredAngle - this.angle
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2

        // Ограничение скорости поворота
        const maxTurn = this.turnRate * dt
        if (Math.abs(diff) < maxTurn) {
          this.angle = desiredAngle
        } else {
          this.angle += Math.sign(diff) * maxTurn
        }
      }

      this.vx = Math.cos(this.angle) * this.speed
      this.vy = Math.sin(this.angle) * this.speed
      this.x += this.vx * dt
      this.y += this.vy * dt
    }

    // Время жизни
    this.life -= dt
    if (this.life <= 0) this.dead = true
  }
}
