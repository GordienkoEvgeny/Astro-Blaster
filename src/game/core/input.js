 export class Input {
  constructor(canvas) {
    this.canvas = canvas
    this.keys = { left: false, right: false, up: false, down: false, fire: false }
    this.touch = { active: false, dx: 0, dy: 0, fire: false }
    this._joyPointerId = null
    this._firePointerId = null
    this._joyOrigin = { x: 0, y: 0 }
    this.joyVisual = { originX: 0, originY: 0, currentX: 0, currentY: 0, active: false }

    this.events = []
    this._mouseFireActive = false

    this._bind()
  }

  _pushEvent(evt) {
    this.events.push(evt)
    if (this.events.length > 20) this.events.splice(0, this.events.length - 20)
  }

  consumeEvents() {
    const copy = this.events
    this.events = []
    return copy
  }

  _bind() {
    window.addEventListener('keydown', this._onKeyDown = (e) => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA':
          if (!this.keys.left) this._pushEvent({ type: 'left' })
          this.keys.left = true
          e.preventDefault()
          break
        case 'ArrowRight': case 'KeyD':
          if (!this.keys.right) this._pushEvent({ type: 'right' })
          this.keys.right = true
          e.preventDefault()
          break
        case 'ArrowUp': case 'KeyW':
          if (!this.keys.up) this._pushEvent({ type: 'up' })
          this.keys.up = true
          break
        case 'ArrowDown': case 'KeyS':
          if (!this.keys.down) this._pushEvent({ type: 'down' })
          this.keys.down = true
          break
        case 'Space':
          e.preventDefault()
          if (!this.keys.fire) this._pushEvent({ type: 'fire' })
          this.keys.fire = true
          break
      }
    })

    window.addEventListener('keyup', this._onKeyUp = (e) => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': this.keys.left = false; break
        case 'ArrowRight': case 'KeyD': this.keys.right = false; break
        case 'ArrowUp': case 'KeyW': this.keys.up = false; break
        case 'ArrowDown': case 'KeyS': this.keys.down = false; break
        case 'Space': this.keys.fire = false; break
      }
    })

    // Логические координаты = CSS-пиксели окна.
    // Canvas CSS-ом растянут на весь вьюпорт, top-left = (0,0),
    // поэтому e.clientX/Y уже совпадают с логическими координатами игры.
    const getLocal = (e) => {
      return {
        x: e.clientX,
        y: e.clientY,
      }
    }

    this.canvas.addEventListener('pointerdown', this._onPointerDown = (e) => {
      e.preventDefault()
      const { x, y } = getLocal(e)
      this._pushEvent({ type: 'tap', x, y })

      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        if (x > window.innerWidth / 2) {
          this._firePointerId = e.pointerId
          this.touch.fire = true
          this.touch.active = true
        } else if (this._joyPointerId === null) {
          this._joyPointerId = e.pointerId
          this._joyOrigin.x = x
          this._joyOrigin.y = y
          this.joyVisual.originX = x
          this.joyVisual.originY = y
          this.joyVisual.currentX = x
          this.joyVisual.currentY = y
          this.joyVisual.active = true
          this.touch.active = true
        }
      } else {
        this.keys.fire = true
        this._mouseFireActive = true
      }
    })

    this.canvas.addEventListener('pointermove', this._onPointerMove = (e) => {
      if (e.pointerId !== this._joyPointerId) return
      const { x, y } = getLocal(e)
      let dx = x - this._joyOrigin.x
      let dy = y - this._joyOrigin.y
      const max = 50
      const dist = Math.hypot(dx, dy)
      if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max }
      this.joyVisual.currentX = this._joyOrigin.x + dx
      this.joyVisual.currentY = this._joyOrigin.y + dy
      this.touch.dx = dx / max
      this.touch.dy = dy / max
    })

    const up = (e) => {
      if (e.pointerId === this._joyPointerId) {
        this._joyPointerId = null
        this.touch.dx = 0
        this.touch.dy = 0
        this.joyVisual.active = false
      }
      if (e.pointerId === this._firePointerId) {
        this._firePointerId = null
        this.touch.fire = false
      }
      if (!this._joyPointerId && !this._firePointerId) this.touch.active = false
      if (e.pointerType === 'mouse') {
        this.keys.fire = false
        this._mouseFireActive = false
      }
    }
    this.canvas.addEventListener('pointerup', up)
    this.canvas.addEventListener('pointercancel', up)
  }

  getMove() {
    let dx = 0, dy = 0
    if (this.keys.left) dx -= 1
    if (this.keys.right) dx += 1
    if (this.keys.up) dy -= 1
    if (this.keys.down) dy += 1
    dx += this.touch.dx
    dy += this.touch.dy
    const len = Math.hypot(dx, dy)
    if (len > 1) { dx /= len; dy /= len }
    return { dx, dy }
  }

  getFire() {
    return this.keys.fire || this.touch.fire
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    this.canvas.removeEventListener('pointermove', this._onPointerMove)
  }
}
