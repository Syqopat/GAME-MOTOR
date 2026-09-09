class Scene extends EventEmitter {
  constructor(name = 'Untitled Scene') {
    super();
    this.id = UUID.generate();
    this.name = name;
    this.engine = null;
    this._gameObjects = [];
    this._rootGameObjects = [];
    this._threeScene = new THREE.Scene();
    this._threeScene.background = new THREE.Color(0x1a1a2e);
    this._threeScene.fog = null;

    this._ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    this._threeScene.add(this._ambientLight);

    this._tags = ['Untagged', 'MainCamera', 'Player', 'Enemy', 'UI', 'Ground', 'Respawn', 'Finish'];
    this._layers = Array.from({ length: 32 }, (_, i) => `Layer ${i}`);
    this._layers[0] = 'Default';
    this._layers[1] = 'TransparentFX';
    this._layers[2] = 'Ignore Raycast';
    this._layers[4] = 'Water';
    this._layers[5] = 'UI';

    this.gravity = new THREE.Vector3(0, -9.81, 0);
    this._dirty = false;
  }

  get gameObjects() { return [...this._gameObjects]; }
  get rootGameObjects() { return [...this._rootGameObjects]; }

  addGameObject(gameObject) {
    gameObject.scene = this;
    this._gameObjects.push(gameObject);

    if (!gameObject.parent) {
      this._rootGameObjects.push(gameObject);
      this._threeScene.add(gameObject._threeObject);
    }

    for (const child of gameObject._children) {
      this._registerChild(child);
    }

    gameObject.updateTransform();
    this._dirty = true;
    this.emit('gameObjectAdded', gameObject);
    this.emit('hierarchyChanged');
    return gameObject;
  }

  _registerChild(gameObject) {
    gameObject.scene = this;
    if (!this._gameObjects.includes(gameObject)) {
      this._gameObjects.push(gameObject);
    }
    for (const child of gameObject._children) {
      this._registerChild(child);
    }
  }

  _removeGameObject(gameObject) {
    const idx = this._gameObjects.indexOf(gameObject);
    if (idx >= 0) this._gameObjects.splice(idx, 1);

    const rootIdx = this._rootGameObjects.indexOf(gameObject);
    if (rootIdx >= 0) this._rootGameObjects.splice(rootIdx, 1);

    gameObject.scene = null;
    this._dirty = true;
    this.emit('gameObjectRemoved', gameObject);
    this.emit('hierarchyChanged');
  }

  createGameObject(name) {
    const go = new GameObject(name);
    return this.addGameObject(go);
  }

  createPrimitive(type, name) {
    const go = new GameObject(name || type);
    
    let geometry;
    switch (type.toLowerCase()) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case 'capsule':
        geometry = new THREE.CapsuleGeometry(0.25, 0.5, 16, 32);
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(10, 10);
        go.transform._rotation.set(-Math.PI / 2, 0, 0);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.4, 0.15, 16, 48);
        break;
      case 'torusknot':
        geometry = new THREE.TorusKnotGeometry(0.4, 0.12, 100, 16);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const meshFilter = new MeshFilter();
    meshFilter.geometry = geometry;
    meshFilter.meshType = type.toLowerCase();
    go.addComponent(meshFilter);

    const meshRenderer = new MeshRenderer();
    go.addComponent(meshRenderer);
    meshRenderer._createMesh();

    return this.addGameObject(go);
  }

  createLight(type, name) {
    const go = new GameObject(name || `${type} Light`);
    const lightComp = new LightComponent();
    lightComp.lightType = type.toLowerCase();
    go.addComponent(lightComp);
    lightComp._createLight();
    return this.addGameObject(go);
  }

  createCamera(name) {
    const go = new GameObject(name || 'Camera');
    const camComp = new CameraComponent();
    go.addComponent(camComp);
    camComp._createCamera();
    go.tag = 'MainCamera';
    return this.addGameObject(go);
  }

  createEmpty(name) {
    return this.createGameObject(name || 'Empty GameObject');
  }

  findByName(name) {
    return this._gameObjects.find(go => go.name === name) || null;
  }

  findById(id) {
    return this._gameObjects.find(go => go.id === id) || null;
  }

  findByTag(tag) {
    return this._gameObjects.filter(go => go.tag === tag);
  }

  findByLayer(layer) {
    return this._gameObjects.filter(go => go.layer === layer);
  }

  update(dt) {
    for (const go of this._gameObjects) {
      go.updateTransform();
    }
    for (const go of this._gameObjects) {
      go.update(dt);
    }
  }

  fixedUpdate(dt) {
    for (const go of this._gameObjects) {
      go.fixedUpdate(dt);
    }
  }

  lateUpdate(dt) {
    for (const go of this._gameObjects) {
      go.lateUpdate(dt);
    }
  }

  clear() {
    for (const go of [...this._rootGameObjects]) {
      go.destroy();
    }
    this._gameObjects = [];
    this._rootGameObjects = [];

    while (this._threeScene.children.length > 0) {
      this._threeScene.remove(this._threeScene.children[0]);
    }
    this._threeScene.add(this._ambientLight);
    this.emit('hierarchyChanged');
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      gravity: { x: this.gravity.x, y: this.gravity.y, z: this.gravity.z },
      ambientColor: '#' + this._ambientLight.color.getHexString(),
      ambientIntensity: this._ambientLight.intensity,
      backgroundColor: '#' + this._threeScene.background.getHexString(),
      gameObjects: this._rootGameObjects.map(go => go.serialize())
    };
  }
}

window.Scene = Scene;
