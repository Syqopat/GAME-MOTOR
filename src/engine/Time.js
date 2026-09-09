class Time {
  constructor() {
    this.deltaTime = 0;
    this.fixedDeltaTime = 1 / 60;
    this.time = 0;
    this.unscaledTime = 0;
    this.unscaledDeltaTime = 0;
    this.timeScale = 1;
    this.frameCount = 0;
    this.fps = 0;
    this._lastTime = 0;
    this._fpsAccumulator = 0;
    this._fpsFrames = 0;
    this._fpsUpdateInterval = 0.5;
    this._fpsLastUpdate = 0;
    this._fixedTimeAccumulator = 0;
  }

  update(timestamp) {
    if (this._lastTime === 0) {
      this._lastTime = timestamp;
    }

    this.unscaledDeltaTime = (timestamp - this._lastTime) / 1000;
    this.deltaTime = this.unscaledDeltaTime * this.timeScale;
    this.time += this.deltaTime;
    this.unscaledTime += this.unscaledDeltaTime;
    this.frameCount++;
    this._lastTime = timestamp;

    this._fpsFrames++;
    this._fpsAccumulator += this.unscaledDeltaTime;
    if (this._fpsAccumulator >= this._fpsUpdateInterval) {
      this.fps = Math.round(this._fpsFrames / this._fpsAccumulator);
      this._fpsFrames = 0;
      this._fpsAccumulator = 0;
    }

    this._fixedTimeAccumulator += this.deltaTime;
  }

  needsFixedUpdate() {
    if (this._fixedTimeAccumulator >= this.fixedDeltaTime) {
      this._fixedTimeAccumulator -= this.fixedDeltaTime;
      return true;
    }
    return false;
  }

  reset() {
    this.deltaTime = 0;
    this.time = 0;
    this.unscaledTime = 0;
    this.frameCount = 0;
    this._lastTime = 0;
    this._fixedTimeAccumulator = 0;
  }
}

window.Time = Time;
