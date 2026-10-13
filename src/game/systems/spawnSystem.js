import { Enemy } from '../entities/Enemy.js'

export class SpawnSystem {
  constructor() {
    this.timer = 0
    this.spawnInterval = 1.0
    this.weights = { basic: 1, zigzag: 0, shooter: 0 }
    this.speedMul = 1
    this.baseSpeed = 80
  }

  configure(level) {
    this.spawnInterval = level.spawnInterval
    this.weights = level.enemyWeights
    this.speedMul = level.enemySpeedMul
  }

  update(dt, W, waveLevel, difficulty) {
    this.timer -= dt
    if (this.timer > 0) return null

    // Интервал между спавнами сокращается с ростом сложности
    this.timer = this.spawnInterval * (difficulty?.spawnIntervalMul ?? 1)

    // Выбор типа врага по весам
    const roll = Math.random()
    let type = 'basic'
    let acc = 0
    for (const [t, w] of Object.entries(this.weights)) {
      acc += w
      if (roll <= acc) { type = t; break }
    }

    const radius = type === 'shooter' ? 16 : type === 'zigzag' ? 13 : 14
    const x = 40 + Math.random() * (W - 80)

    const baseHp = type === 'shooter' ? 3 : type === 'zigzag' ? 2 : 1
    const hp = baseHp + (difficulty?.enemyHpBonus ?? 0)

    const speed = (this.baseSpeed + waveLevel * 12)
      * this.speedMul
      * (difficulty?.enemySpeedMul ?? 1)

    return new Enemy(type, x, -30, hp, speed)
  }
}
