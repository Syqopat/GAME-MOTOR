class Animator extends Component {
  constructor() {
    super('Animator');
    this._animations = {};
    this._currentAnimation = null;
    this._isPlaying = false;
    this._time = 0;
    this._speed = 1;
    this.playOnAwake = true;
    this.defaultAnimation = '';
  }

  addAnimation(name, keyframes) {
    this._animations[name] = {
      name,
      keyframes: keyframes.sort((a, b) => a.time - b.time),
      duration: keyframes.length > 0 ? keyframes[keyframes.length - 1].time : 0,
      loop: true,
      speed: 1
    };
  }

  play(name) {
    if (this._animations[name]) {
      this._currentAnimation = this._animations[name];
      this._time = 0;
      this._isPlaying = true;
    }
  }

  stop() {
    this._isPlaying = false;
    this._time = 0;
  }

  pause() {
    this._isPlaying = false;
  }

  resume() {
    this._isPlaying = true;
  }

  awake() {
    if (this.playOnAwake && this.defaultAnimation) {
      this.play(this.defaultAnimation);
    }
  }

  update(dt) {
    if (!this._isPlaying || !this._currentAnimation) return;
    const anim = this._currentAnimation;
    this._time += dt * this._speed * anim.speed;

    if (this._time >= anim.duration) {
      if (anim.loop) {
        this._time %= anim.duration;
      } else {
        this._time = anim.duration;
        this._isPlaying = false;
      }
    }

    this._applyKeyframes(anim);
  }

  _applyKeyframes(anim) {
    const { keyframes } = anim;
    if (keyframes.length < 2) return;

    let prevFrame = keyframes[0];
    let nextFrame = keyframes[1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (this._time >= keyframes[i].time && this._time <= keyframes[i + 1].time) {
        prevFrame = keyframes[i];
        nextFrame = keyframes[i + 1];
        break;
      }
    }

    const t = (this._time - prevFrame.time) / (nextFrame.time - prevFrame.time);
    const smoothT = t * t * (3 - 2 * t);

    if (prevFrame.position && nextFrame.position) {
      this.transform._position.set(
        MathUtils.lerp(prevFrame.position.x, nextFrame.position.x, smoothT),
        MathUtils.lerp(prevFrame.position.y, nextFrame.position.y, smoothT),
        MathUtils.lerp(prevFrame.position.z, nextFrame.position.z, smoothT)
      );
      this.transform._markDirty();
    }

    if (prevFrame.rotation && nextFrame.rotation) {
      const euler = {
        x: MathUtils.lerp(prevFrame.rotation.x, nextFrame.rotation.x, smoothT),
        y: MathUtils.lerp(prevFrame.rotation.y, nextFrame.rotation.y, smoothT),
        z: MathUtils.lerp(prevFrame.rotation.z, nextFrame.rotation.z, smoothT)
      };
      this.transform.eulerAngles = new THREE.Vector3(euler.x, euler.y, euler.z);
    }

    if (prevFrame.scale && nextFrame.scale) {
      this.transform._scale.set(
        MathUtils.lerp(prevFrame.scale.x, nextFrame.scale.x, smoothT),
        MathUtils.lerp(prevFrame.scale.y, nextFrame.scale.y, smoothT),
        MathUtils.lerp(prevFrame.scale.z, nextFrame.scale.z, smoothT)
      );
      this.transform._markDirty();
    }

    if (prevFrame.properties && nextFrame.properties) {
      for (const key of Object.keys(prevFrame.properties)) {
        if (nextFrame.properties[key] !== undefined) {
          const val = MathUtils.lerp(prevFrame.properties[key], nextFrame.properties[key], smoothT);
          this.emit('propertyAnimated', key, val);
        }
      }
    }
  }

  getSerializableProperties() {
    const anims = {};
    for (const [name, anim] of Object.entries(this._animations)) {
      anims[name] = {
        keyframes: anim.keyframes,
        duration: anim.duration,
        loop: anim.loop,
        speed: anim.speed
      };
    }
    return {
      ...super.getSerializableProperties(),
      animations: anims,
      defaultAnimation: this.defaultAnimation,
      playOnAwake: this.playOnAwake,
      speed: this._speed
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    this.defaultAnimation = props.defaultAnimation || '';
    this.playOnAwake = props.playOnAwake ?? true;
    this._speed = props.speed ?? 1;
    if (props.animations) {
      for (const [name, anim] of Object.entries(props.animations)) {
        this._animations[name] = {
          name,
          keyframes: anim.keyframes || [],
          duration: anim.duration || 0,
          loop: anim.loop ?? true,
          speed: anim.speed ?? 1
        };
      }
    }
  }
}

window.Animator = Animator;
