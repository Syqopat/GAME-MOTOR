class AudioSource extends Component {
  constructor() {
    super('AudioSource');
    this._audio = null;
    this._positionalAudio = null;
    this.clip = null;
    this.volume = 1;
    this.pitch = 1;
    this.loop = false;
    this.playOnAwake = false;
    this.spatialBlend = 0;
    this.minDistance = 1;
    this.maxDistance = 500;
    this.rolloffFactor = 1;
    this.mute = false;
    this._isPlaying = false;
  }

  get isPlaying() { return this._isPlaying; }

  play() {
    if (this._audio) {
      this._audio.currentTime = 0;
      this._audio.volume = this.mute ? 0 : this.volume;
      this._audio.loop = this.loop;
      this._audio.playbackRate = this.pitch;
      this._audio.play().catch(() => {});
      this._isPlaying = true;
    }
  }

  pause() {
    if (this._audio) {
      this._audio.pause();
      this._isPlaying = false;
    }
  }

  stop() {
    if (this._audio) {
      this._audio.pause();
      this._audio.currentTime = 0;
      this._isPlaying = false;
    }
  }

  setClip(url) {
    this.clip = url;
    this._audio = new Audio(url);
    this._audio.volume = this.volume;
    this._audio.loop = this.loop;
    this._audio.addEventListener('ended', () => {
      if (!this.loop) this._isPlaying = false;
    });
  }

  awake() {
    if (this.clip && this.playOnAwake) {
      this.play();
    }
  }

  update(dt) {
    if (this._audio) {
      this._audio.volume = this.mute ? 0 : this.volume;
      this._audio.playbackRate = this.pitch;
    }
  }

  getSerializableProperties() {
    return {
      ...super.getSerializableProperties(),
      clip: this.clip,
      volume: this.volume,
      pitch: this.pitch,
      loop: this.loop,
      playOnAwake: this.playOnAwake,
      spatialBlend: this.spatialBlend,
      minDistance: this.minDistance,
      maxDistance: this.maxDistance,
      mute: this.mute
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    this.volume = props.volume ?? 1;
    this.pitch = props.pitch ?? 1;
    this.loop = props.loop ?? false;
    this.playOnAwake = props.playOnAwake ?? false;
    this.spatialBlend = props.spatialBlend ?? 0;
    this.minDistance = props.minDistance ?? 1;
    this.maxDistance = props.maxDistance ?? 500;
    this.mute = props.mute ?? false;
    if (props.clip) this.setClip(props.clip);
  }

  onDestroy() {
    this.stop();
    this._audio = null;
  }
}

window.AudioSource = AudioSource;


class AudioListener extends Component {
  constructor() {
    super('AudioListener');
    this._listener = null;
  }

  awake() {
    this._listener = new THREE.AudioListener();
    if (this.gameObject._threeObject) {
      this.gameObject._threeObject.add(this._listener);
    }
  }

  onDestroy() {
    if (this._listener && this.gameObject._threeObject) {
      this.gameObject._threeObject.remove(this._listener);
    }
  }

  getSerializableProperties() {
    return super.getSerializableProperties();
  }
}

window.AudioListener = AudioListener;
