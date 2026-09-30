class AssetManager extends EventEmitter {
  constructor(engine) {
    super();
    this.engine = engine;
    this._assets = new Map();
    this._loaders = {
      texture: new THREE.TextureLoader(),
      gltf: null,
      fbx: null,
      obj: null
    };
  }

  async loadTexture(path, name) {
    return new Promise((resolve, reject) => {
      this._loaders.texture.load(path, (texture) => {
        const asset = { type: 'texture', name: name || path, path, data: texture };
        this._assets.set(name || path, asset);
        this.emit('assetLoaded', asset);
        resolve(texture);
      }, undefined, reject);
    });
  }

  async loadAudio(path, name) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(path);
      audio.addEventListener('canplaythrough', () => {
        const asset = { type: 'audio', name: name || path, path, data: audio };
        this._assets.set(name || path, asset);
        this.emit('assetLoaded', asset);
        resolve(audio);
      });
      audio.addEventListener('error', reject);
    });
  }

  getAsset(name) {
    return this._assets.get(name) || null;
  }

  removeAsset(name) {
    const asset = this._assets.get(name);
    if (asset) {
      if (asset.data?.dispose) asset.data.dispose();
      this._assets.delete(name);
      this.emit('assetRemoved', name);
    }
  }

  getAssetsByType(type) {
    const results = [];
    for (const [name, asset] of this._assets) {
      if (asset.type === type) results.push(asset);
    }
    return results;
  }

  clear() {
    for (const [name, asset] of this._assets) {
      if (asset.data?.dispose) asset.data.dispose();
    }
    this._assets.clear();
  }
}

window.AssetManager = AssetManager;
