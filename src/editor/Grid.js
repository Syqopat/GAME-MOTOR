class Grid {
  constructor() {
    this._gridHelper = null;
    this._axisHelper = null;
    this.size = 100;
    this.divisions = 100;
    this.visible = true;
    this.showAxis = true;
    this.color1 = 0x333344;
    this.color2 = 0x222233;
    this._group = new THREE.Group();
    this._group.name = '__grid__';
    this._create();
  }

  _create() {
    this._gridHelper = new THREE.GridHelper(this.size, this.divisions, this.color1, this.color2);
    this._gridHelper.material.opacity = 0.4;
    this._gridHelper.material.transparent = true;
    this._group.add(this._gridHelper);

    const axisLength = this.size / 2;

    const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, 0),
      new THREE.Vector3(axisLength, 0.01, 0)
    ]);
    const xAxis = new THREE.Line(xAxisGeo, new THREE.LineBasicMaterial({ color: 0xff4444, opacity: 0.6, transparent: true }));

    const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, 0),
      new THREE.Vector3(0, 0.01, axisLength)
    ]);
    const zAxis = new THREE.Line(zAxisGeo, new THREE.LineBasicMaterial({ color: 0x4488ff, opacity: 0.6, transparent: true }));

    const yAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yAxis = new THREE.Line(yAxisGeo, new THREE.LineBasicMaterial({ color: 0x44ff44, opacity: 0.6, transparent: true }));

    this._axisHelper = new THREE.Group();
    this._axisHelper.add(xAxis);
    this._axisHelper.add(yAxis);
    this._axisHelper.add(zAxis);
    this._group.add(this._axisHelper);
  }

  addToScene(scene) {
    scene.add(this._group);
  }

  removeFromScene(scene) {
    scene.remove(this._group);
  }

  setVisible(visible) {
    this.visible = visible;
    this._group.visible = visible;
  }

  setAxisVisible(visible) {
    this.showAxis = visible;
    this._axisHelper.visible = visible;
  }
}

window.Grid = Grid;
