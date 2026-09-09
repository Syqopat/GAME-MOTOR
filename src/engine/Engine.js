class Engine extends EventEmitter {
  constructor() {
    super();
    this.time = new Time();
    this.input = new Input();
    this.physics = new Physics(this);
    this.assets = new AssetManager(this);
    this.prefabs = new PrefabManager(this);
    this.scripts = new ScriptEngine(this);
    
    this.activeScene = null;
    this._renderer = null;
    this._isRunning = false;
    this._isPaused = false;
    this._isPlaying = false;
    this._animationFrame = null;
    this._savedSceneData = null;

    this.stats = {
      fps: 0,
      drawCalls: 0,
      triangles: 0,
      textures: 0,
      geometries: 0,
      programs: 0
    };
  }

  init(canvas) {
    this._renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;
    this._renderer.setClearColor(0x1a1a2e);

    this.physics.init();

    this.activeScene = new Scene('Main Scene');
    this.activeScene.engine = this;

    this._isRunning = true;
    this._loop(performance.now());

    this.emit('initialized');
  }

  _loop(timestamp) {
    if (!this._isRunning) return;
    this._animationFrame = requestAnimationFrame((t) => this._loop(t));

    this.time.update(timestamp);

    if (this._isPlaying && !this._isPaused) {
      while (this.time.needsFixedUpdate()) {
        if (this.activeScene) {
          this.activeScene.fixedUpdate(this.time.fixedDeltaTime);
        }
        this.physics.fixedUpdate(this.time.fixedDeltaTime);
      }

      if (this.activeScene) {
        this.activeScene.update(this.time.deltaTime);
        this.activeScene.lateUpdate(this.time.deltaTime);
      }
    }

    if (this.activeScene) {
      for (const go of this.activeScene._gameObjects) {
        go.updateTransform();
      }
    }

    this.input.lateUpdate();

    this._updateStats();
    this.stats.fps = this.time.fps;

    this.emit('update', this.time.deltaTime);
  }

  render(camera, width, height) {
    if (!this._renderer || !this.activeScene) return;

    this._renderer.setSize(width, height, false);

    if (camera) {
      if (camera.aspect !== undefined) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      this._renderer.render(this.activeScene._threeScene, camera);
    }
  }

  play() {
    if (this._isPlaying) return;

    this._savedSceneData = this.activeScene.serialize();
    this._isPlaying = true;
    this._isPaused = false;
    this.time.reset();

    const rigidbodies = [];
    for (const go of this.activeScene._gameObjects) {
      const rb = go.getComponent('Rigidbody');
      if (rb) {
        this.physics.addBody(rb);
        rigidbodies.push(rb);
      }
    }

    this.emit('play');
  }

  pause() {
    this._isPaused = !this._isPaused;
    this.emit(this._isPaused ? 'pause' : 'resume');
  }

  stop() {
    if (!this._isPlaying) return;

    this._isPlaying = false;
    this._isPaused = false;
    this.physics.reset();

    if (this._savedSceneData) {
      this.activeScene.clear();
      this._restoreScene(this._savedSceneData);
      this._savedSceneData = null;
    }

    this.emit('stop');
  }

  _restoreScene(data) {
    this.activeScene.name = data.name;
    if (data.backgroundColor) {
      this.activeScene._threeScene.background = new THREE.Color(data.backgroundColor);
    }
    if (data.ambientColor) {
      this.activeScene._ambientLight.color.set(data.ambientColor);
    }
    if (data.ambientIntensity !== undefined) {
      this.activeScene._ambientLight.intensity = data.ambientIntensity;
    }

    if (data.gameObjects) {
      for (const goData of data.gameObjects) {
        const go = this.prefabs._deserializeGameObject(goData);
        go.id = goData.id;
        this.activeScene.addGameObject(go);
      }
    }
  }

  get isPlaying() { return this._isPlaying; }
  get isPaused() { return this._isPaused; }

  _updateStats() {
    if (this._renderer) {
      const info = this._renderer.info;
      this.stats.drawCalls = info.render.calls;
      this.stats.triangles = info.render.triangles;
      this.stats.textures = info.memory.textures;
      this.stats.geometries = info.memory.geometries;
      this.stats.programs = info.programs?.length || 0;
    }
  }

  destroy() {
    this._isRunning = false;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
    this.physics.destroy();
    this.assets.clear();
    if (this._renderer) {
      this._renderer.dispose();
    }
    this.emit('destroyed');
  }
}

window.Engine = Engine;
