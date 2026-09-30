class Selection extends EventEmitter {
  constructor(editor) {
    super();
    this.editor = editor;
    this._selected = [];
    this._hovered = null;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
  }

  get selected() { return [...this._selected]; }
  get activeGameObject() { return this._selected[0] || null; }
  get hovered() { return this._hovered; }

  select(gameObject, additive = false) {
    if (!additive) {
      this._clearHighlights();
      this._selected = [];
    }

    if (gameObject && !this._selected.includes(gameObject)) {
      this._selected.push(gameObject);
      this._highlightObject(gameObject, true);
    }

    this.emit('selectionChanged', this._selected);
  }

  deselect(gameObject) {
    const idx = this._selected.indexOf(gameObject);
    if (idx >= 0) {
      this._highlightObject(gameObject, false);
      this._selected.splice(idx, 1);
      this.emit('selectionChanged', this._selected);
    }
  }

  clear() {
    this._clearHighlights();
    this._selected = [];
    this.emit('selectionChanged', this._selected);
  }

  isSelected(gameObject) {
    return this._selected.includes(gameObject);
  }

  pickObject(mouseX, mouseY, camera, canvas) {
    if (!camera || !canvas) return null;

    const rect = canvas.getBoundingClientRect();
    this._mouse.x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, camera);

    const scene = this.editor.engine.activeScene;
    if (!scene) return null;

    const meshes = [];
    scene._threeScene.traverse((obj) => {
      if (obj.isMesh && obj.userData.gameObject) {
        meshes.push(obj);
      }
    });

    const allObjects = [];
    scene._threeScene.traverse((obj) => {
      if (obj.userData.gameObject && (obj.isMesh || obj.isLight || obj.isCamera)) {
        allObjects.push(obj);
      }
    });

    const intersects = this._raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.gameObject) {
        obj = obj.parent;
      }
      if (obj && obj.userData.gameObject) {
        return obj.userData.gameObject;
      }
    }

    return null;
  }

  _highlightObject(gameObject, highlight) {
    gameObject._threeObject.traverse((child) => {
      if (child.isMesh && child.material) {
        if (highlight) {
          child._originalEmissive = child.material.emissive?.clone();
          child._originalEmissiveIntensity = child.material.emissiveIntensity;
          if (child.material.emissive) {
            child.material.emissive.set(0x335599);
            child.material.emissiveIntensity = 0.15;
          }
        } else {
          if (child._originalEmissive) {
            child.material.emissive.copy(child._originalEmissive);
            child.material.emissiveIntensity = child._originalEmissiveIntensity || 0;
          }
        }
      }
    });
  }

  _clearHighlights() {
    for (const go of this._selected) {
      this._highlightObject(go, false);
    }
  }

  selectAll() {
    const scene = this.editor.engine.activeScene;
    if (!scene) return;
    this._clearHighlights();
    this._selected = [...scene._gameObjects];
    for (const go of this._selected) {
      this._highlightObject(go, true);
    }
    this.emit('selectionChanged', this._selected);
  }

  deleteSelected() {
    for (const go of [...this._selected]) {
      go.destroy();
    }
    this._selected = [];
    this.emit('selectionChanged', this._selected);
  }

  duplicateSelected() {
    const newSelection = [];
    for (const go of this._selected) {
      const clone = go.clone();
      if (go.parent) {
        clone.setParent(go.parent, false);
      }
      if (go.scene) {
        go.scene.addGameObject(clone);
      }
      clone.transform._position.x += 1;
      clone.transform._markDirty();
      newSelection.push(clone);
    }
    this._clearHighlights();
    this._selected = newSelection;
    for (const go of this._selected) {
      this._highlightObject(go, true);
    }
    this.emit('selectionChanged', this._selected);
    return newSelection;
  }

  focusSelected(editorCamera) {
    if (this._selected.length === 0 || !editorCamera) return;
    const target = this._selected[0].transform.worldPosition;
    editorCamera.focusOn(target);
  }
}

window.Selection = Selection;
