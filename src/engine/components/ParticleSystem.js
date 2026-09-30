class ParticleSystemComponent extends Component {
  constructor() {
    super('ParticleSystem');
    this._particles = null;
    this._geometry = null;
    this._material = null;
    this._positions = [];
    this._velocities = [];
    this._lifetimes = [];
    this._ages = [];
    this._colors = [];
    this._sizes = [];
    this._emitTimer = 0;

    this.maxParticles = 1000;
    this.duration = 5;
    this.looping = true;
    this.startLifetime = 2;
    this.startLifetimeVariation = 0.5;
    this.startSpeed = 5;
    this.startSpeedVariation = 2;
    this.startSize = 0.2;
    this.startSizeVariation = 0.1;
    this.startColor = '#ff6600';
    this.endColor = '#ff000000';
    this.gravityModifier = 0;
    this.emissionRate = 50;
    this.shape = 'cone';
    this.shapeAngle = 25;
    this.shapeRadius = 0.5;
    this.playOnAwake = true;
    this._isPlaying = false;
    this._time = 0;
    this._activeCount = 0;
  }

  _init() {
    this._positions = new Float32Array(this.maxParticles * 3);
    this._velocities = new Array(this.maxParticles).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
    this._lifetimes = new Float32Array(this.maxParticles).fill(0);
    this._ages = new Float32Array(this.maxParticles).fill(0);
    this._sizes = new Float32Array(this.maxParticles).fill(0);
    this._activeCount = 0;

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
    this._geometry.setAttribute('size', new THREE.BufferAttribute(this._sizes, 1));

    this._material = new THREE.PointsMaterial({
      color: this.startColor,
      size: this.startSize,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this._particles = new THREE.Points(this._geometry, this._material);
    this._particles.frustumCulled = false;
    this.gameObject._threeObject.add(this._particles);
  }

  awake() {
    this._init();
    if (this.playOnAwake) this.play();
  }

  play() { this._isPlaying = true; this._time = 0; }
  pause() { this._isPlaying = false; }
  stop() {
    this._isPlaying = false;
    this._time = 0;
    this._activeCount = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      this._lifetimes[i] = 0;
    }
  }

  _emitParticle() {
    for (let i = 0; i < this.maxParticles; i++) {
      if (this._lifetimes[i] <= 0) {
        const lifetime = this.startLifetime + (Math.random() - 0.5) * 2 * this.startLifetimeVariation;
        this._lifetimes[i] = lifetime;
        this._ages[i] = 0;
        this._sizes[i] = this.startSize + (Math.random() - 0.5) * 2 * this.startSizeVariation;

        this._positions[i * 3] = 0;
        this._positions[i * 3 + 1] = 0;
        this._positions[i * 3 + 2] = 0;

        const speed = this.startSpeed + (Math.random() - 0.5) * 2 * this.startSpeedVariation;
        let dir;
        switch (this.shape) {
          case 'cone':
            const angle = THREE.MathUtils.degToRad(this.shapeAngle);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * angle;
            dir = {
              x: Math.sin(phi) * Math.cos(theta),
              y: Math.cos(phi),
              z: Math.sin(phi) * Math.sin(theta)
            };
            break;
          case 'sphere':
            const u = Math.random() * Math.PI * 2;
            const v = Math.acos(2 * Math.random() - 1);
            dir = {
              x: Math.sin(v) * Math.cos(u),
              y: Math.sin(v) * Math.sin(u),
              z: Math.cos(v)
            };
            break;
          case 'box':
            dir = {
              x: (Math.random() - 0.5) * 2,
              y: 1,
              z: (Math.random() - 0.5) * 2
            };
            break;
          default:
            dir = { x: 0, y: 1, z: 0 };
        }

        this._velocities[i] = {
          x: dir.x * speed,
          y: dir.y * speed,
          z: dir.z * speed
        };

        this._activeCount = Math.max(this._activeCount, i + 1);
        return;
      }
    }
  }

  update(dt) {
    if (!this._isPlaying || !this._particles) return;

    this._time += dt;
    if (!this.looping && this._time > this.duration) {
      this._isPlaying = false;
      return;
    }

    this._emitTimer += dt;
    const emitInterval = 1 / this.emissionRate;
    while (this._emitTimer >= emitInterval) {
      this._emitParticle();
      this._emitTimer -= emitInterval;
    }

    const gravity = this.gravityModifier * -9.81;

    for (let i = 0; i < this._activeCount; i++) {
      if (this._lifetimes[i] <= 0) continue;

      this._ages[i] += dt;
      if (this._ages[i] >= this._lifetimes[i]) {
        this._lifetimes[i] = 0;
        this._positions[i * 3 + 1] = -9999;
        continue;
      }

      this._velocities[i].y += gravity * dt;

      this._positions[i * 3] += this._velocities[i].x * dt;
      this._positions[i * 3 + 1] += this._velocities[i].y * dt;
      this._positions[i * 3 + 2] += this._velocities[i].z * dt;

      const lifeRatio = this._ages[i] / this._lifetimes[i];
      this._sizes[i] = this.startSize * (1 - lifeRatio * 0.5);
    }

    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.size.needsUpdate = true;
    this._geometry.setDrawRange(0, this._activeCount);
  }

  getSerializableProperties() {
    return {
      ...super.getSerializableProperties(),
      maxParticles: this.maxParticles,
      duration: this.duration,
      looping: this.looping,
      startLifetime: this.startLifetime,
      startLifetimeVariation: this.startLifetimeVariation,
      startSpeed: this.startSpeed,
      startSpeedVariation: this.startSpeedVariation,
      startSize: this.startSize,
      startSizeVariation: this.startSizeVariation,
      startColor: this.startColor,
      endColor: this.endColor,
      gravityModifier: this.gravityModifier,
      emissionRate: this.emissionRate,
      shape: this.shape,
      shapeAngle: this.shapeAngle,
      shapeRadius: this.shapeRadius,
      playOnAwake: this.playOnAwake
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    Object.keys(this.getSerializableProperties()).forEach(key => {
      if (key !== 'enabled' && props[key] !== undefined) this[key] = props[key];
    });
  }

  onDestroy() {
    if (this._particles) {
      this.gameObject._threeObject.remove(this._particles);
      this._geometry?.dispose();
      this._material?.dispose();
    }
  }
}

window.ParticleSystemComponent = ParticleSystemComponent;
