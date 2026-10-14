/**
 * Единая кривая сложности.
 * Все системы (спавн, враги, боссы) спрашивают её — и получают множители.
 *
 * @param {number} levelIndex — индекс уровня (0-based)
 * @param {number} elapsed   — секунд прошло с начала уровня
 * @param {number} levelDuration — длительность уровня в секундах
 */
export function getDifficulty(levelIndex, elapsed, levelDuration) {
  // Прогресс внутри уровня: 0 → 1
  const t = Math.min(1, elapsed / Math.max(1, levelDuration))

  // Прогрессия между уровнями: 1.0, 1.3, 1.6, 1.9 ...
  const levelMul = 1 + levelIndex * 0.3

  // Внутри уровня: от 1.0 к 1.8 к концу
  const ramp = 1 + t * 0.8

  const combined = levelMul * ramp

  return {
    // Скорость движения врагов
    enemySpeedMul: combined,

    // Интервал между спавнами: чем меньше, тем чаще
    spawnIntervalMul: 1 / combined,

    // HP-бонус: +1 каждые 2 уровня
    enemyHpBonus: Math.floor(levelIndex / 2),

    // Темп стрельбы врагов
    enemyFireRateMul: combined,

    // Максимум врагов одновременно на экране
    maxEnemies: Math.min(80, 10 + levelIndex * 3 + Math.floor(t * 8)),

    // Скорость пуль врага
    enemyBulletSpeedMul: 1 + levelIndex * 0.1 + t * 0.3,

    // Урон босса (используется в Boss)
    bossAttackRateMul: combined,

    // HP босса умножается (используется при создании босса)
    bossHpMul: 1 + levelIndex * 0.4,
  }
}
