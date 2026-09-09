class PrefabManager extends EventEmitter {
  constructor(engine) {
    super();
    this.engine = engine;
    this._prefabs = new Map();
  }

  createPrefab(gameObject, name) {
    const prefabName = name || gameObject.name;
    const prefabData = gameObject.serialize();
    prefabData.isPrefab = true;
    this._prefabs.set(prefabName, prefabData);
    this.emit('prefabCreated', prefabName);
    return prefabData;
  }

  instantiate(name, position, rotation) {
    const prefabData = this._prefabs.get(name);
    if (!prefabData) return null;

    const go = this._deserializeGameObject(prefabData);
    if (position) {
      go.transform._position.set(position.x || 0, position.y || 0, position.z || 0);
    }
    if (rotation) {
      go.transform.eulerAngles = new THREE.Vector3(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }
    go.transform._markDirty();

    if (this.engine.activeScene) {
      this.engine.activeScene.addGameObject(go);
    }

    return go;
  }

  _deserializeGameObject(data) {
    const go = new GameObject(data.name + ' (Instance)');
    go.tag = data.tag || 'Untagged';
    go.layer = data.layer || 0;
    go.isStatic = data.isStatic || false;
    go.activeSelf = data.activeSelf !== undefined ? data.activeSelf : true;

    if (data.components) {
      for (const compData of data.components) {
        if (compData.type === 'Transform') {
          go.transform.deserialize(compData);
          continue;
        }

        let comp = null;
        switch (compData.type) {
          case 'MeshFilter': comp = new MeshFilter(); break;
          case 'MeshRenderer': comp = new MeshRenderer(); break;
          case 'Camera': comp = new CameraComponent(); break;
          case 'Light': comp = new LightComponent(); break;
          case 'Rigidbody': comp = new Rigidbody(); break;
          case 'Collider': comp = new Collider(); break;
          case 'AudioSource': comp = new AudioSource(); break;
          case 'AudioListener': comp = new AudioListener(); break;
          case 'ParticleSystem': comp = new ParticleSystemComponent(); break;
          case 'Animator': comp = new Animator(); break;
        }

        if (comp) {
          comp.deserialize(compData);
          go.addComponent(comp);
          if (comp.type === 'MeshRenderer') comp._createMesh();
          if (comp.type === 'Light') comp._createLight();
          if (comp.type === 'Camera') comp._createCamera();
        }
      }
    }

    if (data.children) {
      for (const childData of data.children) {
        const child = this._deserializeGameObject(childData);
        child.setParent(go, false);
      }
    }

    return go;
  }

  getPrefabNames() {
    return Array.from(this._prefabs.keys());
  }

  removePrefab(name) {
    this._prefabs.delete(name);
    this.emit('prefabRemoved', name);
  }

  serialize() {
    const data = {};
    for (const [name, prefab] of this._prefabs) {
      data[name] = prefab;
    }
    return data;
  }

  deserialize(data) {
    for (const [name, prefab] of Object.entries(data)) {
      this._prefabs.set(name, prefab);
    }
  }
}

window.PrefabManager = PrefabManager;
