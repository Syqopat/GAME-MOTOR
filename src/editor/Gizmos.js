class Gizmos extends EventEmitter {
  constructor(editor) {
    super();
    this.editor = editor;
    this.mode = 'translate';
    this.space = 'world';
    this._gizmoGroup = new THREE.Group();
    this._gizmoGroup.name = '__gizmos__';
    this._activeAxis = null;
    this._isDragging = false;
    this._startPoint = new THREE.Vector3();
    this._startObjectPos = new THREE.Vector3();
    this._startObjectRot = new THREE.Euler();
    this._startObjectScale = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._plane = new THREE.Plane();
    this._intersection = new THREE.Vector3();
    this._arrowSize = 1.5;
    this._visible = false;

    this._axes = {
      x: { color: 0xff4444, dir: new THREE.Vector3(1, 0, 0) },
      y: { color: 0x44ff44, dir: new THREE.Vector3(0, 1, 0) },
      z: { color: 0x4488ff, dir: new THREE.Vector3(0, 0, 1) }
    };

    this._createGizmos();
  }

  _createGizmos() {
    this._translateGroup = this._createTranslateGizmo();
    this._rotateGroup = this._createRotateGizmo();
    this._scaleGroup = this._createScaleGizmo();

    this._translateGroup.visible = true;
    this._rotateGroup.visible = false;
    this._scaleGroup.visible = false;

    this._gizmoGroup.add(this._translateGroup);
    this._gizmoGroup.add(this._rotateGroup);
    this._gizmoGroup.add(this._scaleGroup);
  }

  _createTranslateGizmo() {
    const group = new THREE.Group();
    group.name = 'translate_gizmo';

    for (const [axis, data] of Object.entries(this._axes)) {
      const arrowMat = new THREE.MeshBasicMaterial({
        color: data.color,
        depthTest: false,
        transparent: true,
        opacity: 0.9
      });

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, this._arrowSize, 8),
        arrowMat
      );

      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.25, 12),
        arrowMat
      );
      head.position.y = this._arrowSize / 2 + 0.125;

      const arrowGroup = new THREE.Group();
      arrowGroup.add(shaft);
      arrowGroup.add(head);
      arrowGroup.name = `translate_${axis}`;
      arrowGroup.userData.axis = axis;
      arrowGroup.userData.gizmoType = 'translate';

      if (axis === 'x') {
        arrowGroup.rotation.z = -Math.PI / 2;
      } else if (axis === 'z') {
        arrowGroup.rotation.x = Math.PI / 2;
      }

      arrowGroup.renderOrder = 999;
      shaft.renderOrder = 999;
      head.renderOrder = 999;

      group.add(arrowGroup);
    }

    const centerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      transparent: true,
      opacity: 0.5
    });
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), centerMat);
    center.renderOrder = 999;
    center.name = 'translate_center';
    group.add(center);

    return group;
  }

  _createRotateGizmo() {
    const group = new THREE.Group();
    group.name = 'rotate_gizmo';

    for (const [axis, data] of Object.entries(this._axes)) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: data.color,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(this._arrowSize * 0.8, 0.02, 8, 64),
        ringMat
      );
      ring.name = `rotate_${axis}`;
      ring.userData.axis = axis;
      ring.userData.gizmoType = 'rotate';
      ring.renderOrder = 999;

      if (axis === 'x') {
        ring.rotation.y = Math.PI / 2;
      } else if (axis === 'z') {
        ring.rotation.x = Math.PI / 2;
      }

      group.add(ring);
    }

    return group;
  }

  _createScaleGizmo() {
    const group = new THREE.Group();
    group.name = 'scale_gizmo';

    for (const [axis, data] of Object.entries(this._axes)) {
      const mat = new THREE.MeshBasicMaterial({
        color: data.color,
        depthTest: false,
        transparent: true,
        opacity: 0.9
      });

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, this._arrowSize, 8),
        mat
      );

      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.12),
        mat
      );
      box.position.y = this._arrowSize / 2 + 0.06;

      const scaleGroup = new THREE.Group();
      scaleGroup.add(shaft);
      scaleGroup.add(box);
      scaleGroup.name = `scale_${axis}`;
      scaleGroup.userData.axis = axis;
      scaleGroup.userData.gizmoType = 'scale';
      scaleGroup.renderOrder = 999;
      shaft.renderOrder = 999;
      box.renderOrder = 999;

      if (axis === 'x') scaleGroup.rotation.z = -Math.PI / 2;
      else if (axis === 'z') scaleGroup.rotation.x = Math.PI / 2;

      group.add(scaleGroup);
    }

    const centerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      transparent: true,
      opacity: 0.5
    });
    const center = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), centerMat);
    center.renderOrder = 999;
    center.name = 'scale_center';
    center.userData.axis = 'all';
    center.userData.gizmoType = 'scale';
    group.add(center);

    return group;
  }

  setMode(mode) {
    this.mode = mode;
    this._translateGroup.visible = mode === 'translate';
    this._rotateGroup.visible = mode === 'rotate';
    this._scaleGroup.visible = mode === 'scale';
    this.emit('modeChanged', mode);
  }

  toggleSpace() {
    this.space = this.space === 'world' ? 'local' : 'world';
    this.emit('spaceChanged', this.space);
  }

  update(camera) {
    const selected = this.editor.selection.activeGameObject;
    if (!selected) {
      this._gizmoGroup.visible = false;
      return;
    }

    this._gizmoGroup.visible = true;
    const worldPos = selected.transform.worldPosition;
    this._gizmoGroup.position.copy(worldPos);

    const dist = camera.position.distanceTo(worldPos);
    const scale = dist * 0.12;
    this._gizmoGroup.scale.setScalar(scale);

    if (this.space === 'local' && this.mode !== 'scale') {
      this._gizmoGroup.quaternion.copy(selected.transform.worldQuaternion);
    } else {
      this._gizmoGroup.quaternion.identity();
    }
  }

  handleMouseDown(e, camera, canvas) {
    const rect = canvas.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, camera);

    const activeGroup = this.mode === 'translate' ? this._translateGroup :
                        this.mode === 'rotate' ? this._rotateGroup :
                        this._scaleGroup;

    const allMeshes = [];
    activeGroup.traverse(obj => {
      if (obj.isMesh && obj.userData.axis) allMeshes.push(obj);
    });

    const intersects = this._raycaster.intersectObjects(allMeshes, false);
    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && !target.userData.axis) target = target.parent;
      if (target && target.userData.axis) {
        this._activeAxis = target.userData.axis;
        this._isDragging = true;

        const selected = this.editor.selection.activeGameObject;
        if (selected) {
          this._startObjectPos.copy(selected.transform.position);
          this._startObjectRot.copy(selected.transform.rotation);
          this._startObjectScale.copy(selected.transform.scale);
          this._startPoint.copy(intersects[0].point);

          this.editor.undoRedo.beginAction('transform', selected);
        }
        return true;
      }
    }
    return false;
  }

  handleMouseMove(e, camera, canvas) {
    if (!this._isDragging || !this._activeAxis) return false;

    const selected = this.editor.selection.activeGameObject;
    if (!selected) return false;

    const rect = canvas.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, camera);

    const axisDir = this._axes[this._activeAxis]?.dir;
    if (!axisDir) return false;

    if (this.mode === 'translate') {
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      const planeNormal = new THREE.Vector3().crossVectors(axisDir, cameraDir).cross(axisDir).normalize();
      this._plane.setFromNormalAndCoplanarPoint(planeNormal, this._startPoint);

      if (this._raycaster.ray.intersectPlane(this._plane, this._intersection)) {
        const delta = this._intersection.clone().sub(this._startPoint);
        const projected = axisDir.clone().multiplyScalar(delta.dot(axisDir));

        selected.transform._position.copy(this._startObjectPos.clone().add(projected));
        selected.transform._markDirty();
      }
    } else if (this.mode === 'scale') {
      const dx = (e.clientX - this._lastScaleMouseX) || 0;
      this._lastScaleMouseX = e.clientX;
      const scaleFactor = 1 + dx * 0.01;

      if (this._activeAxis === 'x') selected.transform._scale.x *= scaleFactor;
      else if (this._activeAxis === 'y') selected.transform._scale.y *= scaleFactor;
      else if (this._activeAxis === 'z') selected.transform._scale.z *= scaleFactor;
      else if (this._activeAxis === 'all') selected.transform._scale.multiplyScalar(scaleFactor);
      selected.transform._markDirty();
    } else if (this.mode === 'rotate') {
      const dx = (e.clientX - (this._lastRotateMouseX || e.clientX));
      this._lastRotateMouseX = e.clientX;
      const angle = dx * 0.01;

      const q = new THREE.Quaternion();
      q.setFromAxisAngle(axisDir, angle);
      selected.transform._quaternion.premultiply(q);
      selected.transform._markDirty();
    }

    return true;
  }

  handleMouseUp(e) {
    if (this._isDragging) {
      const selected = this.editor.selection.activeGameObject;
      if (selected) {
        this.editor.undoRedo.endAction(selected);
      }
      this._isDragging = false;
      this._activeAxis = null;
      this._lastScaleMouseX = 0;
      this._lastRotateMouseX = 0;
      return true;
    }
    return false;
  }

  get isDragging() { return this._isDragging; }

  addToScene(scene) {
    scene.add(this._gizmoGroup);
  }

  removeFromScene(scene) {
    scene.remove(this._gizmoGroup);
  }
}

window.Gizmos = Gizmos;
