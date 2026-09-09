class Transform extends Component {
  constructor() {
    super('Transform');
    this._position = new THREE.Vector3(0, 0, 0);
    this._rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this._quaternion = new THREE.Quaternion();
    this._scale = new THREE.Vector3(1, 1, 1);
    this._localMatrix = new THREE.Matrix4();
    this._worldMatrix = new THREE.Matrix4();
    this._dirty = true;

    this._rotation._onChange(() => {
      this._quaternion.setFromEuler(this._rotation, false);
      this._markDirty();
    });
    this._quaternion._onChange(() => {
      this._rotation.setFromQuaternion(this._quaternion, undefined, false);
      this._markDirty();
    });
  }

  get position() { return this._position; }
  set position(v) {
    this._position.copy(v);
    this._markDirty();
  }

  get rotation() { return this._rotation; }
  set rotation(v) {
    this._rotation.copy(v);
    this._markDirty();
  }

  get quaternion() { return this._quaternion; }
  set quaternion(v) {
    this._quaternion.copy(v);
    this._markDirty();
  }

  get scale() { return this._scale; }
  set scale(v) {
    this._scale.copy(v);
    this._markDirty();
  }

  get eulerAngles() {
    return new THREE.Vector3(
      THREE.MathUtils.radToDeg(this._rotation.x),
      THREE.MathUtils.radToDeg(this._rotation.y),
      THREE.MathUtils.radToDeg(this._rotation.z)
    );
  }

  set eulerAngles(v) {
    this._rotation.set(
      THREE.MathUtils.degToRad(v.x),
      THREE.MathUtils.degToRad(v.y),
      THREE.MathUtils.degToRad(v.z)
    );
    this._markDirty();
  }

  get forward() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this._quaternion);
    return forward.normalize();
  }

  get right() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this._quaternion);
    return right.normalize();
  }

  get up() {
    const up = new THREE.Vector3(0, 1, 0);
    up.applyQuaternion(this._quaternion);
    return up.normalize();
  }

  get worldPosition() {
    const pos = new THREE.Vector3();
    if (this.gameObject && this.gameObject._threeObject) {
      this.gameObject._threeObject.getWorldPosition(pos);
    } else {
      pos.copy(this._position);
    }
    return pos;
  }

  get worldQuaternion() {
    const quat = new THREE.Quaternion();
    if (this.gameObject && this.gameObject._threeObject) {
      this.gameObject._threeObject.getWorldQuaternion(quat);
    } else {
      quat.copy(this._quaternion);
    }
    return quat;
  }

  get worldScale() {
    const scale = new THREE.Vector3();
    if (this.gameObject && this.gameObject._threeObject) {
      this.gameObject._threeObject.getWorldScale(scale);
    } else {
      scale.copy(this._scale);
    }
    return scale;
  }

  lookAt(target) {
    const m = new THREE.Matrix4();
    if (target instanceof THREE.Vector3) {
      m.lookAt(this._position, target, new THREE.Vector3(0, 1, 0));
    } else if (target.transform) {
      m.lookAt(this._position, target.transform.position, new THREE.Vector3(0, 1, 0));
    }
    this._quaternion.setFromRotationMatrix(m);
    this._markDirty();
  }

  translate(x, y, z) {
    const v = new THREE.Vector3(x, y, z);
    v.applyQuaternion(this._quaternion);
    this._position.add(v);
    this._markDirty();
  }

  rotate(x, y, z) {
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z)
    ));
    this._quaternion.multiply(q);
    this._markDirty();
  }

  _markDirty() {
    this._dirty = true;
    this.emit('changed');
  }

  updateMatrix() {
    if (this.gameObject && this.gameObject._threeObject) {
      const obj = this.gameObject._threeObject;
      obj.position.copy(this._position);
      obj.quaternion.copy(this._quaternion);
      obj.scale.copy(this._scale);
    }
    this._dirty = false;
  }

  syncFromThreeObject() {
    if (this.gameObject && this.gameObject._threeObject) {
      const obj = this.gameObject._threeObject;
      this._position.copy(obj.position);
      this._quaternion.copy(obj.quaternion);
      this._rotation.setFromQuaternion(obj.quaternion, undefined, false);
      this._scale.copy(obj.scale);
      this._dirty = false;
    }
  }

  getSerializableProperties() {
    return {
      position: { x: this._position.x, y: this._position.y, z: this._position.z },
      rotation: { x: this.eulerAngles.x, y: this.eulerAngles.y, z: this.eulerAngles.z },
      scale: { x: this._scale.x, y: this._scale.y, z: this._scale.z }
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    if (props.position) {
      this._position.set(props.position.x || 0, props.position.y || 0, props.position.z || 0);
    }
    if (props.rotation) {
      this.eulerAngles = new THREE.Vector3(props.rotation.x || 0, props.rotation.y || 0, props.rotation.z || 0);
    }
    if (props.scale) {
      this._scale.set(props.scale.x || 1, props.scale.y || 1, props.scale.z || 1);
    }
    this._markDirty();
  }
}

window.Transform = Transform;
