class HierarchyPanel {
  constructor(editor) {
    this.editor = editor;
    this.container = document.getElementById('hierarchy-content');
    this._draggedItem = null;
    this._setupContextMenu();
  }

  refresh() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const scene = this.editor.engine.activeScene;
    if (!scene) return;

    const sceneHeader = document.createElement('div');
    sceneHeader.className = 'hierarchy-scene-header';
    sceneHeader.innerHTML = `<span class="hierarchy-icon">ğŸ¬</span>${scene.name}`;
    this.container.appendChild(sceneHeader);

    for (const go of scene.rootGameObjects) {
      this._createItem(go, this.container, 0);
    }
  }

  _createItem(gameObject, parent, depth) {
    const item = document.createElement('div');
    item.className = 'hierarchy-item';
    item.dataset.id = gameObject.id;
    item.draggable = true;

    if (this.editor.selection.isSelected(gameObject)) {
      item.classList.add('selected');
    }

    if (!gameObject.activeSelf) {
      item.classList.add('inactive');
    }

    const indent = depth * 18;
    const hasChildren = gameObject.children.length > 0;

    let icon = 'ğŸ“¦';
    if (gameObject.getComponent('Camera')) icon = 'ğŸ“·';
    else if (gameObject.getComponent('Light')) icon = 'ğŸ’¡';
    else if (gameObject.getComponent('ParticleSystem')) icon = 'âœ¨';
    else if (gameObject.getComponent('AudioSource')) icon = 'ğŸ”Š';
    else if (gameObject.getComponent('MeshRenderer')) icon = 'ğŸ§Š';

    item.innerHTML = `
      <div class="hierarchy-item-content" style="padding-left: ${indent + 8}px">
        ${hasChildren ? '<span class="hierarchy-expand">â–¼</span>' : '<span class="hierarchy-expand-space"></span>'}
        <span class="hierarchy-icon">${icon}</span>
        <span class="hierarchy-name">${gameObject.name}</span>
      </div>
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editor.selection.select(gameObject, e.ctrlKey || e.metaKey);
      this.refresh();
      this.editor.inspectorPanel.refresh();
    });

    item.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this._startRename(item, gameObject);
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.editor.selection.select(gameObject);
      this.refresh();
      this._showContextMenu(e.clientX, e.clientY, gameObject);
    });

    item.addEventListener('dragstart', (e) => {
      this._draggedItem = gameObject;
      e.dataTransfer.setData('text/plain', gameObject.id);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      this._draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (this._draggedItem && this._draggedItem !== gameObject) {
        this._draggedItem.setParent(gameObject);
        this.refresh();
      }
    });

    parent.appendChild(item);

    if (hasChildren) {
      const childContainer = document.createElement('div');
      childContainer.className = 'hierarchy-children';
      for (const child of gameObject.children) {
        this._createItem(child, childContainer, depth + 1);
      }
      parent.appendChild(childContainer);
    }
  }

  _startRename(item, gameObject) {
    const nameSpan = item.querySelector('.hierarchy-name');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'hierarchy-rename-input';
    input.value = gameObject.name;

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const finish = () => {
      gameObject.name = input.value || 'GameObject';
      gameObject._threeObject.name = gameObject.name;
      this.refresh();
      this.editor.inspectorPanel.refresh();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish();
      if (e.key === 'Escape') { input.value = gameObject.name; finish(); }
    });
  }

  _setupContextMenu() {
    this._contextMenu = document.createElement('div');
    this._contextMenu.className = 'context-menu';
    this._contextMenu.style.display = 'none';
    document.body.appendChild(this._contextMenu);

    document.addEventListener('click', () => {
      this._contextMenu.style.display = 'none';
    });
  }

  _showContextMenu(x, y, gameObject) {
    const items = [
      { label: 'Create Empty', action: () => this._createChild(gameObject, 'empty') },
      { label: '---' },
      { label: 'Create Cube', action: () => this._createChild(gameObject, 'cube') },
      { label: 'Create Sphere', action: () => this._createChild(gameObject, 'sphere') },
      { label: 'Create Cylinder', action: () => this._createChild(gameObject, 'cylinder') },
      { label: 'Create Plane', action: () => this._createChild(gameObject, 'plane') },
      { label: '---' },
      { label: 'Duplicate', action: () => { this.editor.selection.duplicateSelected(); this.refresh(); } },
      { label: 'Delete', action: () => { this.editor.selection.deleteSelected(); this.refresh(); } },
      { label: '---' },
      { label: 'Rename', action: () => { const item = this.container.querySelector(`[data-id="${gameObject.id}"]`); if (item) this._startRename(item, gameObject); } },
      { label: 'Create Prefab', action: () => { this.editor.engine.prefabs.createPrefab(gameObject); this.editor.console.log(`Prefab created: ${gameObject.name}`); } },
      { label: gameObject.activeSelf ? 'Deactivate' : 'Activate', action: () => { gameObject.setActive(!gameObject.activeSelf); this.refresh(); } },
      { label: 'Unparent', action: () => { gameObject.setParent(null); this.refresh(); } },
      { label: 'Focus', action: () => { this.editor.selection.focusSelected(this.editor.editorCamera); } }
    ];

    this._contextMenu.innerHTML = '';
    for (const item of items) {
      if (item.label === '---') {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        this._contextMenu.appendChild(sep);
      } else {
        const el = document.createElement('div');
        el.className = 'context-menu-item';
        el.textContent = item.label;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action();
          this._contextMenu.style.display = 'none';
        });
        this._contextMenu.appendChild(el);
      }
    }

    this._contextMenu.style.left = x + 'px';
    this._contextMenu.style.top = y + 'px';
    this._contextMenu.style.display = 'block';
  }

  _createChild(parent, type) {
    const scene = this.editor.engine.activeScene;
    let go;
    if (type === 'empty') {
      go = scene.createEmpty('Child');
    } else {
      go = scene.createPrimitive(type);
    }
    go.setParent(parent);
    this.refresh();
  }
}

window.HierarchyPanel = HierarchyPanel;
