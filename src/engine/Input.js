class Input {
  constructor() {
    this._keys = {};
    this._keysDown = {};
    this._keysUp = {};
    this._mouseButtons = {};
    this._mouseButtonsDown = {};
    this._mouseButtonsUp = {};
    this._mousePosition = { x: 0, y: 0 };
    this._mouseDelta = { x: 0, y: 0 };
    this._mouseWheel = 0;
    this._gamepads = [];
    this._lastMousePosition = { x: 0, y: 0 };
    this._mouseLocked = false;

    this._setupListeners();
  }

  _setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this._keys[e.code]) {
        this._keysDown[e.code] = true;
      }
      this._keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this._keys[e.code] = false;
      this._keysUp[e.code] = true;
    });

    window.addEventListener('mousemove', (e) => {
      this._mousePosition.x = e.clientX;
      this._mousePosition.y = e.clientY;
      this._mouseDelta.x += e.movementX;
      this._mouseDelta.y += e.movementY;
    });

    window.addEventListener('mousedown', (e) => {
      if (!this._mouseButtons[e.button]) {
        this._mouseButtonsDown[e.button] = true;
      }
      this._mouseButtons[e.button] = true;
    });

    window.addEventListener('mouseup', (e) => {
      this._mouseButtons[e.button] = false;
      this._mouseButtonsUp[e.button] = true;
    });

    window.addEventListener('wheel', (e) => {
      this._mouseWheel += e.deltaY;
    });

    window.addEventListener('contextmenu', (e) => {
      if (this._preventContextMenu) {
        e.preventDefault();
      }
    });

    window.addEventListener('gamepadconnected', (e) => {
      this._gamepads[e.gamepad.index] = e.gamepad;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      delete this._gamepads[e.gamepad.index];
    });
  }

  lateUpdate() {
    this._keysDown = {};
    this._keysUp = {};
    this._mouseButtonsDown = {};
    this._mouseButtonsUp = {};
    this._mouseDelta = { x: 0, y: 0 };
    this._mouseWheel = 0;
  }

  getKey(code) {
    return !!this._keys[code];
  }

  getKeyDown(code) {
    return !!this._keysDown[code];
  }

  getKeyUp(code) {
    return !!this._keysUp[code];
  }

  getMouseButton(button) {
    return !!this._mouseButtons[button];
  }

  getMouseButtonDown(button) {
    return !!this._mouseButtonsDown[button];
  }

  getMouseButtonUp(button) {
    return !!this._mouseButtonsUp[button];
  }

  get mousePosition() {
    return { ...this._mousePosition };
  }

  get mouseDelta() {
    return { ...this._mouseDelta };
  }

  get mouseScrollDelta() {
    return this._mouseWheel;
  }

  getAxis(axisName) {
    switch (axisName) {
      case 'Horizontal':
        return (this.getKey('KeyD') || this.getKey('ArrowRight') ? 1 : 0) -
               (this.getKey('KeyA') || this.getKey('ArrowLeft') ? 1 : 0);
      case 'Vertical':
        return (this.getKey('KeyW') || this.getKey('ArrowUp') ? 1 : 0) -
               (this.getKey('KeyS') || this.getKey('ArrowDown') ? 1 : 0);
      case 'Mouse X':
        return this._mouseDelta.x;
      case 'Mouse Y':
        return this._mouseDelta.y;
      default:
        return 0;
    }
  }

  getGamepad(index) {
    const gamepads = navigator.getGamepads();
    return gamepads[index] || null;
  }

  lockCursor() {
    document.body.requestPointerLock();
    this._mouseLocked = true;
  }

  unlockCursor() {
    document.exitPointerLock();
    this._mouseLocked = false;
  }

  get isCursorLocked() {
    return document.pointerLockElement !== null;
  }

  setPreventContextMenu(prevent) {
    this._preventContextMenu = prevent;
  }
}

window.Input = Input;
