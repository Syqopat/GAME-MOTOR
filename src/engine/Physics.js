class Physics extends EventEmitter {
  constructor(engine) {
    super();
    this.engine = engine;
    this._world = null;
    this._bodies = new Map();
    this._contactMaterials = [];
    this.enabled = true;
    this._initialized = false;
  }

  init() {
    if (typeof CANNON === 'undefined') {
      console.warn('Cannon-es not loaded, physics disabled');
      this.enabled = false;
      return;
    }

    this._world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.81, 0)
    });
    this._world.broadphase = new CANNON.SAPBroadphase(this._world);
    this._world.solver.iterations = 10;
    this._world.allowSleep = true;
    this._world.defaultContactMaterial.friction = 0.5;
    this._world.defaultContactMaterial.restitution = 0.3;

    this._world.addEventListener('beginContact', (e) => {
      this.emit('collision', {
        type: 'enter',
        bodyA: e.bodyA.userData?.gameObject,
        bodyB: e.bodyB.userData?.gameObject
      });
    });

    this._world.addEventListener('endContact', (e) => {
      this.emit('collision', {
        type: 'exit',
        bodyA: e.bodyA.userData?.gameObject,
        bodyB: e.bodyB.userData?.gameObject
      });
    });

    this._initialized = true;
  }

  setGravity(x, y, z) {
    if (this._world) {
      this._world.gravity.set(x, y, z);
    }
  }

  addBody(rigidbody) {
    if (!this._world || !rigidbody.gameObject) return;

    const go = rigidbody.gameObject;
    const collider = go.getComponent('Collider');
    
    let shape;
    if (collider) {
      shape = collider.createShape();
    } else {
      shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    }

    const body = new CANNON.Body({
      mass: rigidbody.isKinematic ? 0 : rigidbody.mass,
      position: new CANNON.Vec3(
        go.transform.position.x,
        go.transform.position.y,
        go.transform.position.z
      ),
      quaternion: new CANNON.Quaternion(
        go.transform.quaternion.x,
        go.transform.quaternion.y,
        go.transform.quaternion.z,
        go.transform.quaternion.w
      ),
      linearDamping: rigidbody.drag,
      angularDamping: rigidbody.angularDrag,
      fixedRotation: false,
      shape: shape
    });

    body.userData = { gameObject: go };

    if (!rigidbody.useGravity) {
      body.gravity = new CANNON.Vec3(0, 0, 0);
    }

    this._world.addBody(body);
    this._bodies.set(rigidbody.id, body);
    rigidbody._body = body;
  }

  removeBody(rigidbody) {
    const body = this._bodies.get(rigidbody.id);
    if (body && this._world) {
      this._world.removeBody(body);
      this._bodies.delete(rigidbody.id);
      rigidbody._body = null;
    }
  }

  fixedUpdate(dt) {
    if (!this._world || !this.enabled) return;

    this._world.step(dt);

    for (const [id, body] of this._bodies) {
      const go = body.userData?.gameObject;
      if (!go) continue;
      const rb = go.getComponent('Rigidbody');
      if (rb && !rb.isKinematic) {
        rb.syncFromPhysics();
      }
    }
  }

  raycast(origin, direction, maxDistance = Infinity) {
    if (!this._world) return null;

    const from = new CANNON.Vec3(origin.x, origin.y, origin.z);
    const to = new CANNON.Vec3(
      origin.x + direction.x * maxDistance,
      origin.y + direction.y * maxDistance,
      origin.z + direction.z * maxDistance
    );

    const result = new CANNON.RaycastResult();
    const ray = new CANNON.Ray(from, to);
    ray.intersectWorld(this._world, { result, skipBackfaces: true });

    if (result.hasHit) {
      return {
        point: { x: result.hitPointWorld.x, y: result.hitPointWorld.y, z: result.hitPointWorld.z },
        normal: { x: result.hitNormalWorld.x, y: result.hitNormalWorld.y, z: result.hitNormalWorld.z },
        distance: result.distance,
        gameObject: result.body?.userData?.gameObject || null
      };
    }

    return null;
  }

  reset() {
    if (this._world) {
      for (const [id, body] of this._bodies) {
        this._world.removeBody(body);
      }
      this._bodies.clear();
    }
  }

  destroy() {
    this.reset();
    this._world = null;
    this._initialized = false;
  }
}

window.Physics = Physics;
