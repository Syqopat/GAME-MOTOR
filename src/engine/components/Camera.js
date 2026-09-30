class CameraComponent extends Component {
  constructor() {
    super('Camera');
    this._camera = null;
    this.fieldOfView = 60;
    this.nearClip = 0.1;
    this.farClip = 1000;
    this.isOrthographic = false;
    this.orthographicSize = 5;
    this.depth = 0;
    this.clearFlags = 'skybox';
    this.backgroundColor = '#1a1a2e';
    this.viewportRect = { x: 0, y: 0, w: 1, h: 1 };
    this.renderTarget = null;
  }

  _createCamera() {
    if (this.isOrthographic) {
      this._camera = new THREE.OrthographicCamera(-this.orthographicSize, this.orthographicSize,
        this.orthographicSize, -this.orthographicSize, this.nearClip, this.farClip);
    } else {
      this._camera = new THREE.PerspectiveCamera(this.fieldOfView, 16 / 9, this.nearClip, this.farClip);
    }
    this._camera.userData.gameObject = this.gameObject;
    this.gameObject._threeObject.add(this._camera);
  }

  get camera() { return this._camera; }

  updateProjection(aspect) {
    if (!this._camera) return;
    if (this.isOrthographic) {
      this._camera.left = -this.orthographicSize * aspect;
      this._camera.right = this.orthographicSize * aspect;
      this._camera.top = this.orthographicSize;
      this._camera.bottom = -this.orthographicSize;
    } else {
      this._camera.fov = this.fieldOfView;
      this._camera.aspect = aspect;
    }
    this._camera.near = this.nearClip;
    this._camera.far = this.farClip;
    this._camera.updateProjectionMatrix();
  }

  screenToWorldPoint(screenPos, canvasWidth, canvasHeight) {
    const ndc = new THREE.Vector3(
      (screenPos.x / canvasWidth) * 2 - 1,
      -(screenPos.y / canvasHeight) * 2 + 1,
      screenPos.z || 0.5
    );
    ndc.unproject(this._camera);
    return ndc;
  }

  worldToScreenPoint(worldPos, canvasWidth, canvasHeight) {
    const pos = worldPos.clone();
    pos.project(this._camera);
    return new THREE.Vector3(
      (pos.x + 1) / 2 * canvasWidth,
      (-pos.y + 1) / 2 * canvasHeight,
      pos.z
    );
  }

  getSerializableProperties() {
    return {
      ...super.getSerializableProperties(),
      fieldOfView: this.fieldOfView,
      nearClip: this.nearClip,
      farClip: this.farClip,
      isOrthographic: this.isOrthographic,
      orthographicSize: this.orthographicSize,
      depth: this.depth,
      clearFlags: this.clearFlags,
      backgroundColor: this.backgroundColor
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    this.fieldOfView = props.fieldOfView ?? 60;
    this.nearClip = props.nearClip ?? 0.1;
    this.farClip = props.farClip ?? 1000;
    this.isOrthographic = props.isOrthographic ?? false;
    this.orthographicSize = props.orthographicSize ?? 5;
    this.depth = props.depth ?? 0;
    this.clearFlags = props.clearFlags || 'skybox';
    this.backgroundColor = props.backgroundColor || '#1a1a2e';
  }

  onDestroy() {
    if (this._camera) {
      this.gameObject._threeObject.remove(this._camera);
      this._camera = null;
    }
  }
}

window.CameraComponent = CameraComponent;
