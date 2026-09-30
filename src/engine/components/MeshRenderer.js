class MeshFilter extends Component {
  constructor() {
    super('MeshFilter');
    this.geometry = null;
    this.meshType = 'cube';
  }

  getSerializableProperties() {
    return {
      ...super.getSerializableProperties(),
      meshType: this.meshType
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    if (props.meshType) {
      this.meshType = props.meshType;
      switch (this.meshType) {
        case 'cube': this.geometry = new THREE.BoxGeometry(1, 1, 1); break;
        case 'sphere': this.geometry = new THREE.SphereGeometry(0.5, 32, 32); break;
        case 'cylinder': this.geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
        case 'capsule': this.geometry = new THREE.CapsuleGeometry(0.25, 0.5, 16, 32); break;
        case 'plane': this.geometry = new THREE.PlaneGeometry(10, 10); break;
        case 'cone': this.geometry = new THREE.ConeGeometry(0.5, 1, 32); break;
        case 'torus': this.geometry = new THREE.TorusGeometry(0.4, 0.15, 16, 48); break;
        case 'torusknot': this.geometry = new THREE.TorusKnotGeometry(0.4, 0.12, 100, 16); break;
      }
    }
  }
}

window.MeshFilter = MeshFilter;


class MeshRenderer extends Component {
  constructor() {
    super('MeshRenderer');
    this._mesh = null;
    this.castShadow = true;
    this.receiveShadow = true;
    this.materialColor = '#4a9eff';
    this.materialType = 'standard';
    this.metalness = 0.1;
    this.roughness = 0.6;
    this.emissive = '#000000';
    this.emissiveIntensity = 0;
    this.opacity = 1.0;
    this.transparent = false;
    this.wireframe = false;
    this.side = 'front';
  }

  _createMesh() {
    const meshFilter = this.gameObject.getComponent('MeshFilter');
    if (!meshFilter || !meshFilter.geometry) return;

    if (this._mesh) {
      this.gameObject._threeObject.remove(this._mesh);
      this._mesh.geometry?.dispose();
      this._mesh.material?.dispose();
    }

    let material;
    switch (this.materialType) {
      case 'basic':
        material = new THREE.MeshBasicMaterial({ color: this.materialColor });
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial({
          color: this.materialColor,
          shininess: 30
        });
        break;
      case 'lambert':
        material = new THREE.MeshLambertMaterial({ color: this.materialColor });
        break;
      case 'physical':
        material = new THREE.MeshPhysicalMaterial({
          color: this.materialColor,
          metalness: this.metalness,
          roughness: this.roughness,
          clearcoat: 0.1,
          clearcoatRoughness: 0.4
        });
        break;
      default:
        material = new THREE.MeshStandardMaterial({
          color: this.materialColor,
          metalness: this.metalness,
          roughness: this.roughness,
          emissive: new THREE.Color(this.emissive),
          emissiveIntensity: this.emissiveIntensity
        });
    }

    material.opacity = this.opacity;
    material.transparent = this.transparent || this.opacity < 1;
    material.wireframe = this.wireframe;
    material.side = this.side === 'double' ? THREE.DoubleSide :
                    this.side === 'back' ? THREE.BackSide : THREE.FrontSide;

    this._mesh = new THREE.Mesh(meshFilter.geometry, material);
    this._mesh.castShadow = this.castShadow;
    this._mesh.receiveShadow = this.receiveShadow;
    this._mesh.userData.gameObject = this.gameObject;
    this.gameObject._threeObject.add(this._mesh);
  }

  updateMaterial() {
    if (!this._mesh) return;
    const mat = this._mesh.material;
    mat.color.set(this.materialColor);
    if (mat.metalness !== undefined) mat.metalness = this.metalness;
    if (mat.roughness !== undefined) mat.roughness = this.roughness;
    if (mat.emissive) {
      mat.emissive.set(this.emissive);
      mat.emissiveIntensity = this.emissiveIntensity;
    }
    mat.opacity = this.opacity;
    mat.transparent = this.transparent || this.opacity < 1;
    mat.wireframe = this.wireframe;
    this._mesh.castShadow = this.castShadow;
    this._mesh.receiveShadow = this.receiveShadow;
    mat.needsUpdate = true;
  }

  onDestroy() {
    if (this._mesh) {
      this.gameObject._threeObject.remove(this._mesh);
      this._mesh.geometry?.dispose();
      this._mesh.material?.dispose();
      this._mesh = null;
    }
  }

  getSerializableProperties() {
    return {
      ...super.getSerializableProperties(),
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
      materialColor: this.materialColor,
      materialType: this.materialType,
      metalness: this.metalness,
      roughness: this.roughness,
      emissive: this.emissive,
      emissiveIntensity: this.emissiveIntensity,
      opacity: this.opacity,
      transparent: this.transparent,
      wireframe: this.wireframe,
      side: this.side
    };
  }

  deserialize(data) {
    super.deserialize(data);
    const props = data.properties || data;
    Object.assign(this, {
      castShadow: props.castShadow ?? true,
      receiveShadow: props.receiveShadow ?? true,
      materialColor: props.materialColor || '#4a9eff',
      materialType: props.materialType || 'standard',
      metalness: props.metalness ?? 0.1,
      roughness: props.roughness ?? 0.6,
      emissive: props.emissive || '#000000',
      emissiveIntensity: props.emissiveIntensity ?? 0,
      opacity: props.opacity ?? 1.0,
      transparent: props.transparent ?? false,
      wireframe: props.wireframe ?? false,
      side: props.side || 'front'
    });
  }
}

window.MeshRenderer = MeshRenderer;
