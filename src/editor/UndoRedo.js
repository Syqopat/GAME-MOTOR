class UndoRedo extends EventEmitter {
  constructor() {
    super();
    this._undoStack = [];
    this._redoStack = [];
    this._maxHistory = 100;
    this._currentAction = null;
  }

  beginAction(type, target) {
    this._currentAction = {
      type,
      targetId: target.id,
      before: {
        position: target.transform.position.clone(),
        rotation: target.transform.rotation.clone(),
        scale: target.transform.scale.clone()
      }
    };
  }

  endAction(target) {
    if (!this._currentAction) return;

    this._currentAction.after = {
      position: target.transform.position.clone(),
      rotation: target.transform.rotation.clone(),
      scale: target.transform.scale.clone()
    };

    this._undoStack.push(this._currentAction);
    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift();
    }
    this._redoStack = [];
    this._currentAction = null;
    this.emit('changed');
  }

  pushAction(action) {
    this._undoStack.push(action);
    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift();
    }
    this._redoStack = [];
    this.emit('changed');
  }

  undo(scene) {
    if (this._undoStack.length === 0) return;

    const action = this._undoStack.pop();
    this._redoStack.push(action);

    const target = scene.findById(action.targetId);
    if (target && action.before) {
      if (action.type === 'transform') {
        target.transform._position.copy(action.before.position);
        target.transform._rotation.copy(action.before.rotation);
        target.transform._scale.copy(action.before.scale);
        target.transform._markDirty();
      }
    }

    this.emit('undo', action);
    this.emit('changed');
  }

  redo(scene) {
    if (this._redoStack.length === 0) return;

    const action = this._redoStack.pop();
    this._undoStack.push(action);

    const target = scene.findById(action.targetId);
    if (target && action.after) {
      if (action.type === 'transform') {
        target.transform._position.copy(action.after.position);
        target.transform._rotation.copy(action.after.rotation);
        target.transform._scale.copy(action.after.scale);
        target.transform._markDirty();
      }
    }

    this.emit('redo', action);
    this.emit('changed');
  }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this.emit('changed');
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }
  get undoCount() { return this._undoStack.length; }
  get redoCount() { return this._redoStack.length; }
}

window.UndoRedo = UndoRedo;
