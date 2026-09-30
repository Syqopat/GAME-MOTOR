class Editor extends EventEmitter {
  constructor() {
    super();
    this.engine = new Engine();
    this.editorCamera = new EditorCamera();
    this.selection = new Selection(this);
    this.gizmos = new Gizmos(this);
    this.grid = new Grid();
    this.undoRedo = new UndoRedo();
    this.sceneSerializer = new SceneSerializer(this);

    this.hierarchyPanel = null;
    this.inspectorPanel = null;
    this.console = null;
    this.projectPanel = null;

    this._sceneCanvas = null;
    this._gameCanvas = null;
    this._activeView = 'scene';
    this._toolMode = 'translate';
    this._snapEnabled = false;
    this._snapValue = 0.5;

    this._sceneViewWidth = 0;
    this._sceneViewHeight = 0;
  }

  init() {
    this._sceneCanvas = document.getElementById('scene-canvas');
    this._gameCanvas = document.getElementById('game-canvas');

    if (!this._sceneCanvas) return;

    this.engine.init(this._sceneCanvas);

    this.grid.addToScene(this.engine.activeScene._threeScene);
    this.gizmos.addToScene(this.engine.activeScene._threeScene);

    this.console = new ConsolePanel(this);
    this.hierarchyPanel = new HierarchyPanel(this);
    this.inspectorPanel = new InspectorPanel(this);
    this.projectPanel = new ProjectPanel(this);

    this._setupDefaultScene();
    this._setupEventListeners();
    this._setupResizeObserver();
    this._setupMenus();
    this._setupToolbar();
    this._setupWindowControls();

    this.engine.on('update', (dt) => this._editorUpdate(dt));

    this.engine.activeScene.on('hierarchyChanged', () => {
      this.hierarchyPanel.refresh();
    });

    this.hierarchyPanel.refresh();
    this.inspectorPanel.refresh();

    this.console.log('Antigravity Engine initialized');
    this.console.log(`Three.js r${THREE.REVISION}`);
    this.console.log('Ready');
  }

  _setupDefaultScene() {
    const scene = this.engine.activeScene;

    const dirLight = scene.createLight('directional', 'Directional Light');
    dirLight.transform._position.set(5, 10, 7);
    dirLight.transform._markDirty();

    const ground = scene.createPrimitive('plane', 'Ground');
    const groundRenderer = ground.getComponent('MeshRenderer');
    if (groundRenderer) {
      groundRenderer.materialColor = '#3a3a4e';
      groundRenderer.roughness = 0.9;
      groundRenderer.updateMaterial();
    }

    const cube = scene.createPrimitive('cube', 'Cube');
    cube.transform._position.set(0, 0.5, 0);
    cube.transform._markDirty();
    const cubeRenderer = cube.getComponent('MeshRenderer');
    if (cubeRenderer) {
      cubeRenderer.materialColor = '#4a9eff';
      cubeRenderer.metalness = 0.2;
      cubeRenderer.roughness = 0.4;
      cubeRenderer.updateMaterial();
    }

    const sphere = scene.createPrimitive('sphere', 'Sphere');
    sphere.transform._position.set(2.5, 0.5, 0);
    sphere.transform._markDirty();
    const sphereRenderer = sphere.getComponent('MeshRenderer');
    if (sphereRenderer) {
      sphereRenderer.materialColor = '#ff6644';
      sphereRenderer.metalness = 0.4;
      sphereRenderer.roughness = 0.3;
      sphereRenderer.updateMaterial();
    }

    const cylinder = scene.createPrimitive('cylinder', 'Cylinder');
    cylinder.transform._position.set(-2.5, 0.5, 0);
    cylinder.transform._markDirty();
    const cylRenderer = cylinder.getComponent('MeshRenderer');
    if (cylRenderer) {
      cylRenderer.materialColor = '#44ff88';
      cylRenderer.metalness = 0.3;
      cylRenderer.roughness = 0.5;
      cylRenderer.updateMaterial();
    }

    const mainCamera = scene.createCamera('Main Camera');
    mainCamera.transform._position.set(0, 3, 8);
    mainCamera.transform._markDirty();
  }

  _setupEventListeners() {
    this._sceneCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !e.altKey) {
        const gizmoHandled = this.gizmos.handleMouseDown(e, this.editorCamera.camera, this._sceneCanvas);
        if (!gizmoHandled) {
          const picked = this.selection.pickObject(e.clientX, e.clientY, this.editorCamera.camera, this._sceneCanvas);
          if (picked) {
            this.selection.select(picked, e.ctrlKey || e.metaKey);
          } else {
            this.selection.clear();
          }
          this.hierarchyPanel.refresh();
          this.inspectorPanel.refresh();
        }
      }
      this.editorCamera.handleMouseDown(e, this._sceneCanvas);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.gizmos.handleMouseMove(e, this.editorCamera.camera, this._sceneCanvas)) {
        this.editorCamera.handleMouseMove(e);
      } else {
        this.inspectorPanel.refresh();
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.gizmos.handleMouseUp(e);
      this.editorCamera.handleMouseUp(e);
    });

    this._sceneCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.editorCamera.handleWheel(e);
    });

    this._sceneCanvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            if (e.shiftKey) {
              this.undoRedo.redo(this.engine.activeScene);
            } else {
              this.undoRedo.undo(this.engine.activeScene);
            }
            this.inspectorPanel.refresh();
            e.preventDefault();
            break;
          case 'y':
            this.undoRedo.redo(this.engine.activeScene);
            this.inspectorPanel.refresh();
            e.preventDefault();
            break;
          case 's':
            this.sceneSerializer.saveSceneAs();
            e.preventDefault();
            break;
          case 'o':
            this.sceneSerializer.openScene();
            e.preventDefault();
            break;
          case 'n':
            this.sceneSerializer.newScene();
            this.hierarchyPanel.refresh();
            this.inspectorPanel.refresh();
            e.preventDefault();
            break;
          case 'd':
            this.selection.duplicateSelected();
            this.hierarchyPanel.refresh();
            this.inspectorPanel.refresh();
            e.preventDefault();
            break;
          case 'a':
            this.selection.selectAll();
            this.hierarchyPanel.refresh();
            e.preventDefault();
            break;
        }
      }

      switch (e.key.toLowerCase()) {
        case 'w': if (!e.ctrlKey) { this.setTool('translate'); } break;
        case 'e': if (!e.ctrlKey) { this.setTool('rotate'); } break;
        case 'r': if (!e.ctrlKey) { this.setTool('scale'); } break;
        case 'f':
          this.selection.focusSelected(this.editorCamera);
          break;
        case 'delete':
          this.selection.deleteSelected();
          this.hierarchyPanel.refresh();
          this.inspectorPanel.refresh();
          break;
      }
    });
  }

  _setupResizeObserver() {
    const sceneView = document.getElementById('scene-viewport');
    if (!sceneView) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this._sceneViewWidth = entry.contentRect.width;
        this._sceneViewHeight = entry.contentRect.height;
        this._sceneCanvas.width = this._sceneViewWidth;
        this._sceneCanvas.height = this._sceneViewHeight;
        this.editorCamera.resize(this._sceneViewWidth, this._sceneViewHeight);
      }
    });
    observer.observe(sceneView);
  }

  _editorUpdate(dt) {
    this.editorCamera.handleKeyboard(this.engine.input, dt);
    this.editorCamera.update(dt);
    this.gizmos.update(this.editorCamera.camera);

    this.engine.render(this.editorCamera.camera, this._sceneViewWidth, this._sceneViewHeight);

    this._updateStatusBar();
  }

  _updateStatusBar() {
    const fpsEl = document.getElementById('status-fps');
    const trisEl = document.getElementById('status-tris');
    const objsEl = document.getElementById('status-objects');
    const drawEl = document.getElementById('status-drawcalls');

    if (fpsEl) fpsEl.textContent = `${this.engine.stats.fps} FPS`;
    if (trisEl) trisEl.textContent = `${this.engine.stats.triangles} Tris`;
    if (objsEl) objsEl.textContent = `${this.engine.activeScene?._gameObjects.length || 0} Objects`;
    if (drawEl) drawEl.textContent = `${this.engine.stats.drawCalls} Draw Calls`;
  }

  setTool(tool) {
    this._toolMode = tool;
    this.gizmos.setMode(tool);

    document.querySelectorAll('.toolbar-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  _setupToolbar() {
    document.querySelectorAll('.toolbar-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTool(btn.dataset.tool);
      });
    });

    const playBtn = document.getElementById('toolbar-play');
    const pauseBtn = document.getElementById('toolbar-pause');
    const stopBtn = document.getElementById('toolbar-stop');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (!this.engine.isPlaying) {
          this.engine.play();
          playBtn.classList.add('active');
          this.console.log('â–¶ Play mode started');
        }
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (this.engine.isPlaying) {
          this.engine.pause();
          pauseBtn.classList.toggle('active', this.engine.isPaused);
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (this.engine.isPlaying) {
          this.engine.stop();
          playBtn.classList.remove('active');
          pauseBtn.classList.remove('active');
          this.hierarchyPanel.refresh();
          this.inspectorPanel.refresh();
          this.console.log('â¹ Play mode stopped');
        }
      });
    }

    const snapBtn = document.getElementById('toolbar-snap');
    if (snapBtn) {
      snapBtn.addEventListener('click', () => {
        this._snapEnabled = !this._snapEnabled;
        snapBtn.classList.toggle('active', this._snapEnabled);
      });
    }

    const spaceBtn = document.getElementById('toolbar-space');
    if (spaceBtn) {
      spaceBtn.addEventListener('click', () => {
        this.gizmos.toggleSpace();
        spaceBtn.textContent = this.gizmos.space === 'world' ? 'Global' : 'Local';
      });
    }
  }

  _setupMenus() {
    const menuBar = document.getElementById('menu-bar');
    if (!menuBar) return;

    const menus = {
      'File': [
        { label: 'New Scene', shortcut: 'Ctrl+N', action: () => { this.sceneSerializer.newScene(); this.hierarchyPanel.refresh(); this.inspectorPanel.refresh(); } },
        { label: 'Open Scene', shortcut: 'Ctrl+O', action: () => this.sceneSerializer.openScene() },
        { label: 'Save Scene', shortcut: 'Ctrl+S', action: () => this.sceneSerializer.saveSceneAs() },
        { label: '---' },
        { label: 'Exit', action: () => window.electronAPI.window.close() }
      ],
      'Edit': [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => { this.undoRedo.undo(this.engine.activeScene); this.inspectorPanel.refresh(); } },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => { this.undoRedo.redo(this.engine.activeScene); this.inspectorPanel.refresh(); } },
        { label: '---' },
        { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => { this.selection.duplicateSelected(); this.hierarchyPanel.refresh(); } },
        { label: 'Delete', shortcut: 'Delete', action: () => { this.selection.deleteSelected(); this.hierarchyPanel.refresh(); this.inspectorPanel.refresh(); } },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => { this.selection.selectAll(); this.hierarchyPanel.refresh(); } }
      ],
      'GameObject': [
        { label: 'Create Empty', action: () => { this.engine.activeScene.createEmpty(); this.hierarchyPanel.refresh(); } },
        { label: '---' },
        { label: 'Cube', action: () => { this.engine.activeScene.createPrimitive('cube'); this.hierarchyPanel.refresh(); } },
        { label: 'Sphere', action: () => { this.engine.activeScene.createPrimitive('sphere'); this.hierarchyPanel.refresh(); } },
        { label: 'Cylinder', action: () => { this.engine.activeScene.createPrimitive('cylinder'); this.hierarchyPanel.refresh(); } },
        { label: 'Capsule', action: () => { this.engine.activeScene.createPrimitive('capsule'); this.hierarchyPanel.refresh(); } },
        { label: 'Plane', action: () => { this.engine.activeScene.createPrimitive('plane'); this.hierarchyPanel.refresh(); } },
        { label: 'Cone', action: () => { this.engine.activeScene.createPrimitive('cone'); this.hierarchyPanel.refresh(); } },
        { label: 'Torus', action: () => { this.engine.activeScene.createPrimitive('torus'); this.hierarchyPanel.refresh(); } },
        { label: '---' },
        { label: 'Directional Light', action: () => { this.engine.activeScene.createLight('directional'); this.hierarchyPanel.refresh(); } },
        { label: 'Point Light', action: () => { this.engine.activeScene.createLight('point'); this.hierarchyPanel.refresh(); } },
        { label: 'Spot Light', action: () => { this.engine.activeScene.createLight('spot'); this.hierarchyPanel.refresh(); } },
        { label: '---' },
        { label: 'Camera', action: () => { this.engine.activeScene.createCamera(); this.hierarchyPanel.refresh(); } }
      ],
      'Component': [
        { label: 'Rigidbody', action: () => this._addComponentToSelected('Rigidbody') },
        { label: 'Collider', action: () => this._addComponentToSelected('Collider') },
        { label: 'Audio Source', action: () => this._addComponentToSelected('AudioSource') },
        { label: 'Particle System', action: () => this._addComponentToSelected('ParticleSystem') },
        { label: 'Animator', action: () => this._addComponentToSelected('Animator') }
      ],
      'Window': [
        { label: 'Reset Layout', action: () => this.console.log('Layout reset') },
        { label: '---' },
        { label: 'Console', action: () => {} },
        { label: 'Inspector', action: () => {} },
        { label: 'Hierarchy', action: () => {} },
        { label: 'Project', action: () => {} }
      ],
      'Help': [
        { label: 'About Antigravity Engine', action: () => this._showAboutDialog() },
        { label: 'Keyboard Shortcuts', action: () => this._showShortcutsDialog() }
      ]
    };

    for (const [menuName, items] of Object.entries(menus)) {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.textContent = menuName;

      const dropdown = document.createElement('div');
      dropdown.className = 'menu-dropdown';

      for (const item of items) {
        if (item.label === '---') {
          const sep = document.createElement('div');
          sep.className = 'menu-separator';
          dropdown.appendChild(sep);
        } else {
          const el = document.createElement('div');
          el.className = 'menu-dropdown-item';
          el.innerHTML = `<span>${item.label}</span>${item.shortcut ? `<span class="menu-shortcut">${item.shortcut}</span>` : ''}`;
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            item.action();
            document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('visible'));
          });
          dropdown.appendChild(el);
        }
      }

      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('visible'));
        dropdown.classList.toggle('visible');
      });

      menuItem.appendChild(dropdown);
      menuBar.appendChild(menuItem);
    }

    document.addEventListener('click', () => {
      document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('visible'));
    });
  }

  _addComponentToSelected(typeName) {
    const go = this.selection.activeGameObject;
    if (!go) {
      this.console.warn('No object selected');
      return;
    }
    this.inspectorPanel._addComponent(go, typeName);
  }

  _setupWindowControls() {
    document.getElementById('window-minimize')?.addEventListener('click', () => window.electronAPI.window.minimize());
    document.getElementById('window-maximize')?.addEventListener('click', () => window.electronAPI.window.maximize());
    document.getElementById('window-close')?.addEventListener('click', () => window.electronAPI.window.close());
  }

  _showAboutDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <span>About Antigravity Engine</span>
          <span class="modal-close">âœ•</span>
        </div>
        <div class="modal-body">
          <h2 style="background: linear-gradient(135deg, #4a9eff, #ff6644); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 24px; margin-bottom: 12px;">Antigravity Engine</h2>
          <p>Version 1.0.0</p>
          <p>Professional Game Engine</p>
          <br>
          <p>Powered by:</p>
          <p>â€¢ Three.js r${THREE.REVISION}</p>
          <p>â€¢ Electron</p>
          <p>â€¢ Cannon-es Physics</p>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.querySelector('.modal-close').addEventListener('click', () => dialog.remove());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
  }

  _showShortcutsDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-dialog" style="width: 500px;">
        <div class="modal-header">
          <span>Keyboard Shortcuts</span>
          <span class="modal-close">âœ•</span>
        </div>
        <div class="modal-body">
          <table class="shortcuts-table">
            <tr><td>W</td><td>Move Tool</td></tr>
            <tr><td>E</td><td>Rotate Tool</td></tr>
            <tr><td>R</td><td>Scale Tool</td></tr>
            <tr><td>F</td><td>Focus on Selected</td></tr>
            <tr><td>Delete</td><td>Delete Selected</td></tr>
            <tr><td>Ctrl+Z</td><td>Undo</td></tr>
            <tr><td>Ctrl+Shift+Z</td><td>Redo</td></tr>
            <tr><td>Ctrl+D</td><td>Duplicate</td></tr>
            <tr><td>Ctrl+S</td><td>Save Scene</td></tr>
            <tr><td>Ctrl+O</td><td>Open Scene</td></tr>
            <tr><td>Ctrl+N</td><td>New Scene</td></tr>
            <tr><td>Ctrl+A</td><td>Select All</td></tr>
            <tr><td>Middle Mouse</td><td>Orbit Camera</td></tr>
            <tr><td>Right Mouse</td><td>Pan Camera</td></tr>
            <tr><td>Scroll</td><td>Zoom</td></tr>
            <tr><td>Alt+Left Click</td><td>Orbit Camera</td></tr>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.querySelector('.modal-close').addEventListener('click', () => dialog.remove());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
  }
}

window.Editor = Editor;
