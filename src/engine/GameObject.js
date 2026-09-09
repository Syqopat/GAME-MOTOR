class GameObject extends EventEmitter {
  constructor(name = 'GameObject') {
    super();
    this.id = UUID.generate();
    this.name = name;
    this.tag = 'Untagged';
    this.layer = 0;
    this.isStatic = false;
    this.activeSelf = true;
    this._components = [];
    this._children = [];
    this._parent = null;
    this.scene = null;
    this.transform = new Transform();
    this.transform.gameObject = this;
    this._components.push(this.transform);

    this._threeObject = new THREE.Object3D();
    this._threeObject.name = name;
    this._threeObject.userData.gameObject = this;
  }

  get parent() { return this._parent; }
  get children() { return [...this._children]; }
  get components() { return [...this._components]; }

  get activeInHierarchy() {
    if (!this.activeSelf) return false;
    if (this._parent) return this._parent.activeInHierarchy;
    return true;
  }

  setActive(active) {
    this.activeSelf = active;
    this._threeObject.visible = active;
    this.emit('activeChanged', active);
  }

  setParent(parent, worldPositionStays = true) {
    if (this._parent === parent) return;

    const worldPos = this.transform.worldPosition.clone();
    const worldQuat = this.transform.worldQuaternion.clone();
    const worldScale = this.transform.worldScale.clone();

    if (this._parent) {
      const idx = this._parent._children.indexOf(this);
      if (idx >= 0) this._parent._children.splice(idx, 1);
      this._parent._threeObject.remove(this._threeObject);
      this._parent.emit('childRemoved', this);
    }

    this._parent = parent;

    if (parent) {
      parent._children.push(this);
      parent._threeObject.add(this._threeObject);
      parent.emit('childAdded', this);

      if (worldPositionStays) {
        parent._threeObject.worldToLocal(worldPos);
        this.transform._position.copy(worldPos);
      }
    } else if (this.scene) {
      this.scene._threeScene.add(this._threeObject);

      if (worldPositionStays) {
        this.transform._position.copy(worldPos);
      }
    }

    this.transform._markDirty();
    this.emit('parentChanged', parent);
    if (this.scene) this.scene.emit('hierarchyChanged');
  }

  addComponent(component) {
    if (component.type === 'Transform') return this.transform;

    component.gameObject = this;
    this._components.push(component);
    component.awake();
    this.emit('componentAdded', component);
    if (this.scene) this.scene.emit('hierarchyChanged');
    return component;
  }

  removeComponent(component) {
    if (component.type === 'Transform') return;
    const idx = this._components.indexOf(component);
    if (idx >= 0) {
      component.onDestroy();
      this._components.splice(idx, 1);
      component.gameObject = null;
      this.emit('componentRemoved', component);
      if (this.scene) this.scene.emit('hierarchyChanged');
    }
  }

  getComponent(type) {
    return this._components.find(c => c.type === type) || null;
  }

  getComponents(type) {
    if (type) return this._components.filter(c => c.type === type);
    return [...this._components];
  }

  getComponentInChildren(type) {
    const comp = this.getComponent(type);
    if (comp) return comp;
    for (const child of this._children) {
      const found = child.getComponentInChildren(type);
      if (found) return found;
    }
    return null;
  }

  getComponentsInChildren(type) {
    let results = this.getComponents(type);
    for (const child of this._children) {
      results = results.concat(child.getComponentsInChildren(type));
    }
    return results;
  }

  getComponentInParent(type) {
    const comp = this.getComponent(type);
    if (comp) return comp;
    if (this._parent) return this._parent.getComponentInParent(type);
    return null;
  }

  find(name) {
    for (const child of this._children) {
      if (child.name === name) return child;
      const found = child.find(name);
      if (found) return found;
    }
    return null;
  }

  getChildCount() {
    return this._children.length;
  }

  getChild(index) {
    return this._children[index] || null;
  }

  getSiblingIndex() {
    if (!this._parent) return 0;
    return this._parent._children.indexOf(this);
  }

  setSiblingIndex(index) {
    if (!this._parent) return;
    const siblings = this._parent._children;
    const currentIndex = siblings.indexOf(this);
    if (currentIndex >= 0) {
      siblings.splice(currentIndex, 1);
      siblings.splice(Math.min(index, siblings.length), 0, this);
    }
  }

  destroy() {
    for (const child of [...this._children]) {
      child.destroy();
    }

    for (const comp of [...this._components]) {
      if (comp.type !== 'Transform') {
        comp.onDestroy();
      }
    }

    if (this._parent) {
      const idx = this._parent._children.indexOf(this);
      if (idx >= 0) this._parent._children.splice(idx, 1);
      this._parent._threeObject.remove(this._threeObject);
    } else if (this.scene) {
      this.scene._threeScene.remove(this._threeObject);
    }

    if (this.scene) {
      this.scene._removeGameObject(this);
    }

    this.emit('destroyed');
    this.removeAllListeners();
  }

  clone(newName) {
    const cloned = new GameObject(newName || this.name + ' (Clone)');
    
    const transformData = this.transform.serialize();
    transformData.id = UUID.generate();
    cloned.transform.deserialize(transformData);

    for (const comp of this._components) {
      if (comp.type === 'Transform') continue;
      const clonedComp = comp.clone();
      cloned.addComponent(clonedComp);
    }

    for (const child of this._children) {
      const clonedChild = child.clone();
      clonedChild.setParent(cloned, false);
    }

    cloned.tag = this.tag;
    cloned.layer = this.layer;
    cloned.isStatic = this.isStatic;

    return cloned;
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      tag: this.tag,
      layer: this.layer,
      isStatic: this.isStatic,
      activeSelf: this.activeSelf,
      components: this._components.map(c => c.serialize()),
      children: this._children.map(c => c.serialize())
    };
  }

  updateTransform() {
    if (this.transform._dirty) {
      this.transform.updateMatrix();
    }
  }

  update(dt) {
    if (!this.activeInHierarchy) return;

    for (const comp of this._components) {
      if (comp.enabled && comp.type !== 'Transform') {
        if (!comp._started) {
          comp.start();
          comp._started = true;
        }
        comp.update(dt);
      }
    }
  }

  fixedUpdate(dt) {
    if (!this.activeInHierarchy) return;
    for (const comp of this._components) {
      if (comp.enabled && comp.type !== 'Transform') {
        comp.fixedUpdate(dt);
      }
    }
  }

  lateUpdate(dt) {
    if (!this.activeInHierarchy) return;
    for (const comp of this._components) {
      if (comp.enabled && comp.type !== 'Transform') {
        comp.lateUpdate(dt);
      }
    }
  }
}

window.GameObject = GameObject;
