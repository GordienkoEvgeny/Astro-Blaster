export class Audio {
  constructor() {
    this.ctx = null
  }

  init() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {}
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  }

  beep(freq, duration = 0.06, type = 'square', volume = 0.05, sweepTo = null) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, this.ctx.currentTime + duration)
    gain.gain.setValueAtTime(volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    osc.connect(gain); gain.connect(this.ctx.destination)
    osc.start(); osc.stop(this.ctx.currentTime + duration)
  }

  play(name) {
    switch (name) {
      case 'shoot': this.beep(880, 0.06, 'square', 0.03, 500); break
      case 'hit': this.beep(220, 0.05, 'square', 0.04); break
      case 'explode': this.beep(180, 0.2, 'sawtooth', 0.08, 60); break
      case 'playerHit': this.beep(160, 0.3, 'sawtooth', 0.12, 60); break
      case 'bossSpawn': this.beep(80, 0.8, 'sawtooth', 0.15, 200); break
      case 'gameOver': this.beep(440, 1.2, 'sine', 0.12, 80); break
      case 'win': this.beep(660, 0.15, 'sine', 0.1, 1320); break
      case 'rocket': this.beep(220, 0.2, 'sawtooth', 0.08, 500); break
    }
  }

  destroy() {
    if (this.ctx) this.ctx.close()
  }
}
