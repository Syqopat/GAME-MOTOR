class ProjectPanel {
  constructor(editor) {
    this.editor = editor;
    this.container = document.getElementById('project-content');
    this.currentPath = null;
    this._setupButtons();
  }

  _setupButtons() {
    const openBtn = document.getElementById('project-open-folder');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openFolder());
    }
  }

  async openFolder() {
    const result = await window.electronAPI.dialog.openDirectory();
    if (!result.canceled && result.filePaths.length > 0) {
      this.currentPath = result.filePaths[0];
      this.refresh();
    }
  }

  async refresh() {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (!this.currentPath) {
      this.container.innerHTML = `
        <div class="project-empty">
          <div class="project-empty-icon">ğŸ“</div>
          <div class="project-empty-text">No project folder opened</div>
          <button class="project-open-btn" id="project-open-inline">Open Folder</button>
        </div>
      `;
      document.getElementById('project-open-inline')?.addEventListener('click', () => this.openFolder());
      return;
    }

    const pathBar = document.createElement('div');
    pathBar.className = 'project-path-bar';

    const parts = this.currentPath.replace(/\\/g, '/').split('/');
    let builtPath = '';
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) builtPath += '/';
      builtPath += parts[i];
      const crumb = document.createElement('span');
      crumb.className = 'project-breadcrumb';
      crumb.textContent = parts[i];
      const path = builtPath;
      crumb.addEventListener('click', () => {
        this.currentPath = path;
        this.refresh();
      });
      pathBar.appendChild(crumb);
      if (i < parts.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'project-separator';
        sep.textContent = ' â€º ';
        pathBar.appendChild(sep);
      }
    }
    this.container.appendChild(pathBar);

    const result = await window.electronAPI.fs.readDir(this.currentPath);
    if (!result.success) {
      this.container.innerHTML += '<div class="project-error">Failed to read directory</div>';
      return;
    }

    const fileGrid = document.createElement('div');
    fileGrid.className = 'project-file-grid';

    const dirs = result.data.filter(f => f.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
    const files = result.data.filter(f => !f.isDirectory).sort((a, b) => a.name.localeCompare(b.name));

    for (const dir of dirs) {
      const item = this._createFileItem(dir, true);
      fileGrid.appendChild(item);
    }

    for (const file of files) {
      const item = this._createFileItem(file, false);
      fileGrid.appendChild(item);
    }

    this.container.appendChild(fileGrid);
  }

  _createFileItem(file, isDir) {
    const item = document.createElement('div');
    item.className = 'project-file-item';

    const icon = isDir ? 'ğŸ“' : this._getFileIcon(file.ext);

    item.innerHTML = `
      <div class="project-file-icon">${icon}</div>
      <div class="project-file-name" title="${file.name}">${file.name}</div>
    `;

    if (isDir) {
      item.addEventListener('dblclick', () => {
        this.currentPath = file.path;
        this.refresh();
      });
    } else {
      item.addEventListener('dblclick', () => {
        this._openFile(file);
      });
    }

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showFileContextMenu(e.clientX, e.clientY, file, isDir);
    });

    return item;
  }

  _getFileIcon(ext) {
    const iconMap = {
      '.js': 'ğŸ“œ',
      '.json': 'ğŸ“‹',
      '.agscene': 'ğŸ¬',
      '.png': 'ğŸ–¼ï¸',
      '.jpg': 'ğŸ–¼ï¸',
      '.jpeg': 'ğŸ–¼ï¸',
      '.gif': 'ğŸ–¼ï¸',
      '.svg': 'ğŸ–¼ï¸',
      '.mp3': 'ğŸµ',
      '.wav': 'ğŸµ',
      '.ogg': 'ğŸµ',
      '.mp4': 'ğŸ¬',
      '.glb': 'ğŸ§Š',
      '.gltf': 'ğŸ§Š',
      '.fbx': 'ğŸ§Š',
      '.obj': 'ğŸ§Š',
      '.txt': 'ğŸ“',
      '.md': 'ğŸ“',
      '.css': 'ğŸ¨',
      '.html': 'ğŸŒ'
    };
    return iconMap[ext] || 'ğŸ“„';
  }

  _openFile(file) {
    if (file.ext === '.agscene' || file.ext === '.json') {
      this.editor.sceneSerializer.loadScene(file.path);
    } else {
      this.editor.console.log(`Opened: ${file.name}`);
    }
  }

  _showFileContextMenu(x, y, file, isDir) {
    const menu = document.querySelector('.context-menu') || document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = '';

    const items = [
      { label: 'Open', action: () => isDir ? (this.currentPath = file.path, this.refresh()) : this._openFile(file) },
      { label: '---' },
      { label: 'Delete', action: async () => {
        await window.electronAPI.fs.delete(file.path);
        this.refresh();
      }},
      { label: 'Show in Explorer', action: () => {
        window.electronAPI.shell.openExternal('file://' + (isDir ? file.path : file.path.replace(/[^/\\]+$/, '')));
      }}
    ];

    for (const item of items) {
      if (item.label === '---') {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        menu.appendChild(sep);
      } else {
        const el = document.createElement('div');
        el.className = 'context-menu-item';
        el.textContent = item.label;
        el.addEventListener('click', (e) => { e.stopPropagation(); item.action(); menu.style.display = 'none'; });
        menu.appendChild(el);
      }
    }

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
    if (!menu.parentElement) document.body.appendChild(menu);
  }
}

window.ProjectPanel = ProjectPanel;
