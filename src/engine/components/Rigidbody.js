class Rigidbody extends Component {
  constructor() {
    super('Rigidbody');
    this.mass = 1;
    this.drag = 0;
    this.angularDrag = 0.05;
    this.useGravity = true;
    this.isKinematic = false;
    this.freezePositionX = false;
    this.freezePositionY = false;
    this.freezePositionZ = false;
    this.freezeRotationX = false;
    this.freezeRotationY = false;
    this.freezeRotationZ = false;
    this.interpolation = 'none';
    this.collisionDetection = 'discrete';
    this._body = null;
    this._velocity = { x: 0, y: 0, z: 0 };
    this._angularVelocity = { x: 0, y: 0, z: 0 };
  }

  get velocity() { return { ...this._velocity }; }
  set velocity(v) {
    this._velocity = { ...v };
    if (this._body) {
      this._body.velocity.set(v.x, v.y, v.z);
    }
  }

  get angularVelocity() { return { ...this._angularVelocity }; }
  set angularVelocity(v) {
    this._angularVelocity = { ...v };
    if (this._body) {
      this._body.angularVelocity.set(v.x, v.y, v.z);
    }
  }

  addForce(x, y, z, mode = 'force') {
    if (!this._body) return;
    const force = new CANNON.Vec3(x, y, z);
    switch (mode) {
      case 'force':
        this._body.applyForce(force);
        break;
      case 'impulse':
        this._body.applyImpulse(force);
        break;
      case 'acceleration':
        this._body.applyForce(force.scale(this._body.mass));
        break;
    }
  }

  addTorque(x, y, z) {
    if (!this._body) return;
    this._body.applyTorque(new CANNON.Vec3(x, y, z));
  }

  addForceAtPosition(force, position) {
    if (!this._body) return;
    this._body.applyForce(
      new CANNON.Vec3(force.x, force.y, force.z),
      new CANNON.Vec3(position.x, position.y, position.z)
    );
  }

  movePosition(position) {
    if (!this._body) return;
    this._body.position.set(position.x, position.y, position.z);
  }

  sleep() {
    if (this._body) this._body.sleep();
  }

  wakeUp() {
    if (this._body) this._body.wakeUp();
  }

  get isSleeping() {
    return this._body ? this._body.sleepState === CANNON.Body.SLEEPING : false;
  }

  syncToPhysics() {
    if (!this._body || this.isKinematic) return;
    const t = this.transform;
    this._body.position.set(t.position.x, t.position.y, t.position.z);
    this._body.quaternion.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
  }

  syncFromPhysics() {
    if (!this._body || this.isKinematic) return;
    const t = this.transform;
    t._position.set(this._body.position.x, this._body.position.y, this._body.position.z);
    t._quaternion.set(this._body.quaternion.x, this._body.quaternion.y, this._body.quaternion.z, this._body.quaternion.w);
    t._rotation.setFromQuaternion(t._quaternion, undefined, false);
    this._velocity = { x: this._body.velocity.x, y: this._body.velocity.y, z: this._body.velocity.z };
    this._angularVelocity = { x: this._body.angularVelocity.x, y: this._body.angularVelocity.y, z: this._body.angularVelocity.z };
    t._markDirty();
  }

  getSerializableProperties() {
    return {
      ...super.getSerializableProperties(),
      mass: this.mass,
      drag: this.drag,
      angularDrag: this.angularDrag,
      useGravity: this.useGravity,
      isKinematic: this.isKinematic,
      freezePositionX: this.freezePositionX,
      freezePositionY: this.freezePositionY,
      freezePositionZ: this.freezePositionZ,
      freezeRotationX: this.freezeRotationX,
      freezeRotationY: this.freezeRotationY,
      freezeRotationZ: this.freezeRotationZ,
      interpolation: this.interpolation,
      collisionDetection: this.collisionDetection
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    this.mass = props.mass ?? 1;
    this.drag = props.drag ?? 0;
    this.angularDrag = props.angularDrag ?? 0.05;
    this.useGravity = props.useGravity ?? true;
    this.isKinematic = props.isKinematic ?? false;
    this.freezePositionX = props.freezePositionX ?? false;
    this.freezePositionY = props.freezePositionY ?? false;
    this.freezePositionZ = props.freezePositionZ ?? false;
    this.freezeRotationX = props.freezeRotationX ?? false;
    this.freezeRotationY = props.freezeRotationY ?? false;
    this.freezeRotationZ = props.freezeRotationZ ?? false;
  }

  onDestroy() {
    if (this._body && this.engine && this.engine.physics) {
      this.engine.physics.removeBody(this);
    }
  }
}

window.Rigidbody = Rigidbody;


class Collider extends Component {
  constructor() {
    super('Collider');
    this.shapeType = 'box';
    this.isTrigger = false;
    this.center = { x: 0, y: 0, z: 0 };
    this.size = { x: 1, y: 1, z: 1 };
    this.radius = 0.5;
    this.height = 1;
    this.physicMaterial = {
      friction: 0.5,
      restitution: 0.3,
      frictionCombine: 'average',
      bounceCombine: 'average'
    };
    this._shape = null;
  }

  createShape() {
    switch (this.shapeType) {
      case 'box':
        this._shape = new CANNON.Box(new CANNON.Vec3(
          this.size.x / 2, this.size.y / 2, this.size.z / 2
        ));
        break;
      case 'sphere':
        this._shape = new CANNON.Sphere(this.radius);
        break;
      case 'cylinder':
        this._shape = new CANNON.Cylinder(this.radius, this.radius, this.height, 16);
        break;
      case 'plane':
        this._shape = new CANNON.Plane();
        break;
    }
    return this._shape;
  }

  getSerializableProperties() {
    return {
      ...super.getSerializableProperties(),
      shapeType: this.shapeType,
      isTrigger: this.isTrigger,
      center: this.center,
      size: this.size,
      radius: this.radius,
      height: this.height,
      physicMaterial: this.physicMaterial
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    this.shapeType = props.shapeType || 'box';
    this.isTrigger = props.isTrigger ?? false;
    if (props.center) this.center = props.center;
    if (props.size) this.size = props.size;
    this.radius = props.radius ?? 0.5;
    this.height = props.height ?? 1;
    if (props.physicMaterial) this.physicMaterial = props.physicMaterial;
  }
}

window.Collider = Collider;
