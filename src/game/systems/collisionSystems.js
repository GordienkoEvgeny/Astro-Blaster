export function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by
  const rr = ar + br
  return dx * dx + dy * dy < rr * rr
}

export function checkBulletsVsEnemies(bullets, enemies, onHit, onKill) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    if (b.dead) continue
    if (!b.fromPlayer) continue
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j]
      if (e.dead) continue
      if (circleHit(b.x, b.y, b.radius, e.x, e.y, e.radius)) {
        onHit(b.x, b.y)
        const killed = e.takeDamage(b.damage)
        b.dead = true
        if (killed) onKill(e, j)
        break
      }
    }
  }
}

export function checkBulletsVsBoss(bullets, boss, onHit) {
  if (!boss || boss.entering || boss.dead) return
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    if (b.dead) continue
    if (!b.fromPlayer) continue
    if (circleHit(b.x, b.y, b.radius, boss.x, boss.y, boss.radius)) {
      onHit(b.x, b.y)
      boss.takeDamage(b.damage)
      b.dead = true
    }
  }
}

export function checkBulletsVsPlayer(bullets, player, onHit) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    if (b.dead) continue
    if (b.fromPlayer) continue
    if (circleHit(b.x, b.y, b.radius, player.x, player.y, player.radius)) {
      b.dead = true
      onHit()
    }
  }
}

export function checkEnemiesVsPlayer(enemies, player, onHit) {
  for (let j = enemies.length - 1; j >= 0; j--) {
    const e = enemies[j]
    if (e.dead) continue
    if (circleHit(e.x, e.y, e.radius, player.x, player.y, player.radius)) {
      e.dead = true
      onHit()
    }
  }
}
