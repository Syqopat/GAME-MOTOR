class LightComponent extends Component {
  constructor() {
    super('Light');
    this._light = null;
    this._helper = null;
    this.lightType = 'directional';
    this.color = '#ffffff';
    this.intensity = 1;
    this.range = 10;
    this.spotAngle = 45;
    this.castShadow = true;
    this.shadowMapSize = 2048;
    this.shadowBias = -0.001;
    this.shadowNormalBias = 0.02;
  }

  _createLight() {
    if (this._light) {
      this.gameObject._threeObject.remove(this._light);
      if (this._light.target) {
        this.gameObject._threeObject.remove(this._light.target);
      }
    }
    if (this._helper) {
      this.gameObject._threeObject.remove(this._helper);
    }

    switch (this.lightType) {
      case 'directional':
        this._light = new THREE.DirectionalLight(this.color, this.intensity);
        this._light.castShadow = this.castShadow;
        this._light.shadow.mapSize.width = this.shadowMapSize;
        this._light.shadow.mapSize.height = this.shadowMapSize;
        this._light.shadow.camera.near = 0.5;
        this._light.shadow.camera.far = 500;
        this._light.shadow.camera.left = -30;
        this._light.shadow.camera.right = 30;
        this._light.shadow.camera.top = 30;
        this._light.shadow.camera.bottom = -30;
        this._light.shadow.bias = this.shadowBias;
        this._light.shadow.normalBias = this.shadowNormalBias;
        this.gameObject._threeObject.add(this._light.target);
        this._light.target.position.set(0, -1, 0);
        break;

      case 'point':
        this._light = new THREE.PointLight(this.color, this.intensity, this.range);
        this._light.castShadow = this.castShadow;
        this._light.shadow.mapSize.width = this.shadowMapSize;
        this._light.shadow.mapSize.height = this.shadowMapSize;
        this._light.shadow.bias = this.shadowBias;
        break;

      case 'spot':
        this._light = new THREE.SpotLight(this.color, this.intensity, this.range,
          THREE.MathUtils.degToRad(this.spotAngle / 2), 0.5, 2);
        this._light.castShadow = this.castShadow;
        this._light.shadow.mapSize.width = this.shadowMapSize;
        this._light.shadow.mapSize.height = this.shadowMapSize;
        this._light.shadow.bias = this.shadowBias;
        this.gameObject._threeObject.add(this._light.target);
        this._light.target.position.set(0, -1, 0);
        break;

      case 'hemisphere':
        this._light = new THREE.HemisphereLight(this.color, '#444444', this.intensity);
        break;

      case 'area':
        this._light = new THREE.RectAreaLight(this.color, this.intensity, 2, 2);
        break;
    }

    if (this._light) {
      this._light.userData.gameObject = this.gameObject;
      this.gameObject._threeObject.add(this._light);
    }
  }

  updateLight() {
    if (!this._light) return;
    this._light.color.set(this.color);
    this._light.intensity = this.intensity;
    if (this._light.distance !== undefined) this._light.distance = this.range;
    if (this._light.angle !== undefined) this._light.angle = THREE.MathUtils.degToRad(this.spotAngle / 2);
    if (this._light.castShadow !== undefined) this._light.castShadow = this.castShadow;
  }

  getSerializableProperties() {
    return {
      ...super.getSerializableProperties(),
      lightType: this.lightType,
      color: this.color,
      intensity: this.intensity,
      range: this.range,
      spotAngle: this.spotAngle,
      castShadow: this.castShadow,
      shadowMapSize: this.shadowMapSize,
      shadowBias: this.shadowBias,
      shadowNormalBias: this.shadowNormalBias
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    this.lightType = props.lightType || 'directional';
    this.color = props.color || '#ffffff';
    this.intensity = props.intensity ?? 1;
    this.range = props.range ?? 10;
    this.spotAngle = props.spotAngle ?? 45;
    this.castShadow = props.castShadow ?? true;
    this.shadowMapSize = props.shadowMapSize ?? 2048;
    this.shadowBias = props.shadowBias ?? -0.001;
    this.shadowNormalBias = props.shadowNormalBias ?? 0.02;
  }

  onDestroy() {
    if (this._light) {
      this.gameObject._threeObject.remove(this._light);
      if (this._light.target) {
        this.gameObject._threeObject.remove(this._light.target);
      }
      if (this._light.dispose) this._light.dispose();
      this._light = null;
    }
  }
}

window.LightComponent = LightComponent;
