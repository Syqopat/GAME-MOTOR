class Component extends EventEmitter {
  constructor(type) {
    super();
    this.id = UUID.generate();
    this.type = type || 'Component';
    this.gameObject = null;
    this.enabled = true;
    this._started = false;
  }

  get transform() {
    return this.gameObject ? this.gameObject.transform : null;
  }

  get scene() {
    return this.gameObject ? this.gameObject.scene : null;
  }

  get engine() {
    return this.scene ? this.scene.engine : null;
  }

  awake() {}
  start() {}
  update(dt) {}
  fixedUpdate(dt) {}
  lateUpdate(dt) {}
  onEnable() {}
  onDisable() {}
  onDestroy() {}

  setEnabled(enabled) {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      if (enabled) {
        this.onEnable();
      } else {
        this.onDisable();
      }
      this.emit('enabledChanged', this.enabled);
    }
  }

  getSerializableProperties() {
    return { enabled: this.enabled };
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      enabled: this.enabled,
      properties: this.getSerializableProperties()
    };
  }

  deserialize(data) {
    this.id = data.id || this.id;
    this.enabled = data.enabled !== undefined ? data.enabled : true;
  }

  clone() {
    const cloned = new this.constructor();
    const data = this.serialize();
    data.id = UUID.generate();
    cloned.deserialize(data);
    return cloned;
  }
}

window.Component = Component;
