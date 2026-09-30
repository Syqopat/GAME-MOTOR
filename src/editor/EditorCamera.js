class EditorCamera {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 10000);
    this.camera.position.set(8, 6, 8);
    this.camera.lookAt(0, 0, 0);

    this._target = new THREE.Vector3(0, 0, 0);
    this._distance = 14;
    this._phi = Math.PI / 4;
    this._theta = Math.PI / 4;
    this._minDistance = 0.5;
    this._maxDistance = 500;
    this._panSpeed = 0.01;
    this._rotateSpeed = 0.005;
    this._zoomSpeed = 0.1;
    this._smoothing = 0.1;
    this._isDragging = false;
    this._isPanning = false;
    this._lastMouse = { x: 0, y: 0 };

    this._targetPosition = this.camera.position.clone();
    this._targetLookAt = this._target.clone();

    this.mode = 'orbit';
    this.flySpeed = 10;

    this._updatePosition();
  }

  _updatePosition() {
    const x = this._target.x + this._distance * Math.sin(this._phi) * Math.cos(this._theta);
    const y = this._target.y + this._distance * Math.cos(this._phi);
    const z = this._target.z + this._distance * Math.sin(this._phi) * Math.sin(this._theta);

    this._targetPosition.set(x, y, z);
  }

  handleMouseDown(e, canvas) {
    if (e.target !== canvas) return;
    this._lastMouse = { x: e.clientX, y: e.clientY };
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this._isDragging = true;
    } else if (e.button === 2 || (e.button === 0 && e.altKey && e.ctrlKey)) {
      this._isPanning = true;
    }
  }

  handleMouseMove(e) {
    const dx = e.clientX - this._lastMouse.x;
    const dy = e.clientY - this._lastMouse.y;
    this._lastMouse = { x: e.clientX, y: e.clientY };

    if (this._isDragging) {
      this._theta -= dx * this._rotateSpeed;
      this._phi -= dy * this._rotateSpeed;
      this._phi = Math.max(0.01, Math.min(Math.PI - 0.01, this._phi));
      this._updatePosition();
    }

    if (this._isPanning) {
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.getWorldDirection(new THREE.Vector3());
      right.setFromMatrixColumn(this.camera.matrixWorld, 0);
      up.setFromMatrixColumn(this.camera.matrixWorld, 1);

      const panX = -dx * this._panSpeed * this._distance * 0.05;
      const panY = dy * this._panSpeed * this._distance * 0.05;

      this._target.add(right.multiplyScalar(panX));
      this._target.add(up.multiplyScalar(panY));
      this._updatePosition();
    }
  }

  handleMouseUp(e) {
    this._isDragging = false;
    this._isPanning = false;
  }

  handleWheel(e) {
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    this._distance = MathUtils.clamp(this._distance * delta, this._minDistance, this._maxDistance);
    this._updatePosition();
  }

  handleKeyboard(input, dt) {
    if (this.mode === 'fly' && input.getMouseButton(2)) {
      const speed = this.flySpeed * dt;
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const right = new THREE.Vector3();
      right.crossVectors(forward, this.camera.up).normalize();

      if (input.getKey('KeyW')) {
        this._target.add(forward.clone().multiplyScalar(speed));
        this._targetPosition.add(forward.clone().multiplyScalar(speed));
      }
      if (input.getKey('KeyS')) {
        this._target.sub(forward.clone().multiplyScalar(speed));
        this._targetPosition.sub(forward.clone().multiplyScalar(speed));
      }
      if (input.getKey('KeyA')) {
        this._target.sub(right.clone().multiplyScalar(speed));
        this._targetPosition.sub(right.clone().multiplyScalar(speed));
      }
      if (input.getKey('KeyD')) {
        this._target.add(right.clone().multiplyScalar(speed));
        this._targetPosition.add(right.clone().multiplyScalar(speed));
      }
      if (input.getKey('KeyE') || input.getKey('Space')) {
        this._target.y += speed;
        this._targetPosition.y += speed;
      }
      if (input.getKey('KeyQ') || input.getKey('ShiftLeft')) {
        this._target.y -= speed;
        this._targetPosition.y -= speed;
      }
    }
  }

  update(dt) {
    this.camera.position.lerp(this._targetPosition, this._smoothing + 0.4);
    this.camera.lookAt(this._target);
  }

  focusOn(target, distance) {
    this._target.copy(target);
    this._distance = distance || 5;
    this._updatePosition();
  }

  reset() {
    this._target.set(0, 0, 0);
    this._distance = 14;
    this._phi = Math.PI / 4;
    this._theta = Math.PI / 4;
    this._updatePosition();
  }

  setView(view) {
    switch (view) {
      case 'top':
        this._phi = 0.01;
        this._theta = 0;
        break;
      case 'bottom':
        this._phi = Math.PI - 0.01;
        this._theta = 0;
        break;
      case 'front':
        this._phi = Math.PI / 2;
        this._theta = 0;
        break;
      case 'back':
        this._phi = Math.PI / 2;
        this._theta = Math.PI;
        break;
      case 'left':
        this._phi = Math.PI / 2;
        this._theta = -Math.PI / 2;
        break;
      case 'right':
        this._phi = Math.PI / 2;
        this._theta = Math.PI / 2;
        break;
      case 'perspective':
        this._phi = Math.PI / 4;
        this._theta = Math.PI / 4;
        break;
    }
    this._updatePosition();
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}

window.EditorCamera = EditorCamera;
