class InspectorPanel {
  constructor(editor) {
    this.editor = editor;
    this.container = document.getElementById('inspector-content');
  }

  refresh() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const go = this.editor.selection.activeGameObject;
    if (!go) {
      this.container.innerHTML = '<div class="inspector-empty">No object selected</div>';
      return;
    }

    this._createHeader(go);

    for (const comp of go.components) {
      this._createComponentSection(comp);
    }

    this._createAddComponentButton(go);
  }

  _createHeader(go) {
    const header = document.createElement('div');
    header.className = 'inspector-header';

    header.innerHTML = `
      <div class="inspector-header-row">
        <input type="checkbox" class="inspector-active-toggle" ${go.activeSelf ? 'checked' : ''}>
        <input type="text" class="inspector-name-input" value="${go.name}">
        <span class="inspector-static-label">Static</span>
        <input type="checkbox" class="inspector-static-toggle" ${go.isStatic ? 'checked' : ''}>
      </div>
      <div class="inspector-header-row">
        <span class="inspector-label">Tag</span>
        <select class="inspector-tag-select">
          ${['Untagged', 'MainCamera', 'Player', 'Enemy', 'UI', 'Ground'].map(t =>
            `<option value="${t}" ${go.tag === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
        </select>
        <span class="inspector-label">Layer</span>
        <select class="inspector-layer-select">
          ${['Default', 'TransparentFX', 'Ignore Raycast', 'Water', 'UI'].map((l, i) =>
            `<option value="${i}" ${go.layer === i ? 'selected' : ''}>${l}</option>`
          ).join('')}
        </select>
      </div>
    `;

    header.querySelector('.inspector-active-toggle').addEventListener('change', (e) => {
      go.setActive(e.target.checked);
      this.editor.hierarchyPanel.refresh();
    });

    header.querySelector('.inspector-name-input').addEventListener('change', (e) => {
      go.name = e.target.value;
      go._threeObject.name = go.name;
      this.editor.hierarchyPanel.refresh();
    });

    header.querySelector('.inspector-static-toggle').addEventListener('change', (e) => {
      go.isStatic = e.target.checked;
    });

    header.querySelector('.inspector-tag-select').addEventListener('change', (e) => {
      go.tag = e.target.value;
    });

    header.querySelector('.inspector-layer-select').addEventListener('change', (e) => {
      go.layer = parseInt(e.target.value);
    });

    this.container.appendChild(header);
  }

  _createComponentSection(comp) {
    const section = document.createElement('div');
    section.className = 'inspector-component';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'inspector-component-header';

    const icon = this._getComponentIcon(comp.type);
    headerDiv.innerHTML = `
      <span class="component-fold">â–¼</span>
      <input type="checkbox" class="component-enable" ${comp.enabled ? 'checked' : ''}>
      <span class="component-icon">${icon}</span>
      <span class="component-name">${comp.type}</span>
      ${comp.type !== 'Transform' ? '<span class="component-remove" title="Remove Component">âœ•</span>' : ''}
    `;

    headerDiv.querySelector('.component-enable')?.addEventListener('change', (e) => {
      comp.setEnabled(e.target.checked);
    });

    const removeBtn = headerDiv.querySelector('.component-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        comp.gameObject.removeComponent(comp);
        this.refresh();
      });
    }

    const body = document.createElement('div');
    body.className = 'inspector-component-body';

    headerDiv.querySelector('.component-fold').addEventListener('click', () => {
      body.classList.toggle('collapsed');
      headerDiv.querySelector('.component-fold').textContent = body.classList.contains('collapsed') ? 'â–¶' : 'â–¼';
    });

    const props = comp.getSerializableProperties();
    for (const [key, value] of Object.entries(props)) {
      if (key === 'enabled') continue;
      this._createPropertyField(body, key, value, comp);
    }

    section.appendChild(headerDiv);
    section.appendChild(body);
    this.container.appendChild(section);
  }

  _createPropertyField(container, key, value, comp) {
    const field = document.createElement('div');
    field.className = 'inspector-field';

    const label = document.createElement('span');
    label.className = 'inspector-field-label';
    label.textContent = this._formatLabel(key);
    field.appendChild(label);

    const valueContainer = document.createElement('div');
    valueContainer.className = 'inspector-field-value';

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if ('x' in value && 'y' in value && 'z' in value) {
        this._createVector3Field(valueContainer, key, value, comp);
      } else if ('x' in value && 'y' in value && !('z' in value)) {
        this._createVector2Field(valueContainer, key, value, comp);
      } else {
        for (const [subKey, subValue] of Object.entries(value)) {
          this._createPropertyField(valueContainer, `${key}.${subKey}`, subValue, comp);
        }
      }
    } else if (typeof value === 'boolean') {
      this._createBooleanField(valueContainer, key, value, comp);
    } else if (typeof value === 'number') {
      this._createNumberField(valueContainer, key, value, comp);
    } else if (typeof value === 'string') {
      if (key.toLowerCase().includes('color') || key.toLowerCase().includes('emissive')) {
        this._createColorField(valueContainer, key, value, comp);
      } else {
        this._createStringField(valueContainer, key, value, comp);
      }
    }

    field.appendChild(valueContainer);
    container.appendChild(field);
  }

  _createVector3Field(container, key, value, comp) {
    const wrapper = document.createElement('div');
    wrapper.className = 'vector3-field';

    ['x', 'y', 'z'].forEach((axis, i) => {
      const axisLabel = document.createElement('span');
      axisLabel.className = `vector-axis-label vector-axis-${axis}`;
      axisLabel.textContent = axis.toUpperCase();

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'vector-input';
      input.value = parseFloat(value[axis]).toFixed(3);
      input.step = key.includes('scale') ? '0.1' : '0.5';

      input.addEventListener('change', () => {
        const newVal = parseFloat(input.value) || 0;
        this._setComponentProperty(comp, key, axis, newVal);
      });

      let isDragging = false;
      let startX, startVal;
      axisLabel.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startVal = parseFloat(input.value);
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const sensitivity = e.shiftKey ? 0.01 : 0.1;
        const newVal = startVal + dx * sensitivity;
        input.value = newVal.toFixed(3);
        this._setComponentProperty(comp, key, axis, newVal);
      });

      document.addEventListener('mouseup', () => { isDragging = false; });

      wrapper.appendChild(axisLabel);
      wrapper.appendChild(input);
    });

    container.appendChild(wrapper);
  }

  _createVector2Field(container, key, value, comp) {
    const wrapper = document.createElement('div');
    wrapper.className = 'vector2-field';
    ['x', 'y'].forEach(axis => {
      const axisLabel = document.createElement('span');
      axisLabel.className = `vector-axis-label vector-axis-${axis}`;
      axisLabel.textContent = axis.toUpperCase();

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'vector-input';
      input.value = parseFloat(value[axis]).toFixed(3);
      input.step = '0.1';
      input.addEventListener('change', () => {
        this._setComponentProperty(comp, key, axis, parseFloat(input.value) || 0);
      });
      wrapper.appendChild(axisLabel);
      wrapper.appendChild(input);
    });
    container.appendChild(wrapper);
  }

  _createBooleanField(container, key, value, comp) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'inspector-checkbox';
    input.checked = value;
    input.addEventListener('change', () => {
      this._setComponentProperty(comp, key, null, input.checked);
    });
    container.appendChild(input);
  }

  _createNumberField(container, key, value, comp) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'inspector-number';
    input.value = value;
    input.step = key.includes('intensity') || key.includes('metalness') || key.includes('roughness') || key.includes('opacity') ? '0.05' : '0.5';
    input.addEventListener('change', () => {
      this._setComponentProperty(comp, key, null, parseFloat(input.value) || 0);
    });

    let isDragging = false, startX, startVal;
    input.addEventListener('mousedown', (e) => {
      if (document.activeElement === input) return;
      isDragging = true;
      startX = e.clientX;
      startVal = parseFloat(input.value);
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const sensitivity = e.shiftKey ? 0.01 : parseFloat(input.step) || 0.1;
      const newVal = startVal + (e.clientX - startX) * sensitivity;
      input.value = newVal.toFixed(3);
      this._setComponentProperty(comp, key, null, newVal);
    });
    document.addEventListener('mouseup', () => { isDragging = false; });

    container.appendChild(input);
  }

  _createColorField(container, key, value, comp) {
    const wrapper = document.createElement('div');
    wrapper.className = 'color-field';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'inspector-color';
    colorInput.value = value && value.startsWith('#') ? value.substring(0, 7) : '#ffffff';
    colorInput.addEventListener('input', () => {
      this._setComponentProperty(comp, key, null, colorInput.value);
      hexInput.value = colorInput.value;
    });

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'inspector-color-hex';
    hexInput.value = colorInput.value;
    hexInput.addEventListener('change', () => {
      colorInput.value = hexInput.value;
      this._setComponentProperty(comp, key, null, hexInput.value);
    });

    wrapper.appendChild(colorInput);
    wrapper.appendChild(hexInput);
    container.appendChild(wrapper);
  }

  _createStringField(container, key, value, comp) {
    if (['materialType', 'lightType', 'shapeType', 'shape', 'meshType', 'clearFlags', 'side', 'interpolation', 'collisionDetection'].includes(key)) {
      const select = document.createElement('select');
      select.className = 'inspector-select';
      let options = [];

      switch (key) {
        case 'materialType': options = ['standard', 'basic', 'phong', 'lambert', 'physical']; break;
        case 'lightType': options = ['directional', 'point', 'spot', 'hemisphere', 'area']; break;
        case 'shapeType': options = ['box', 'sphere', 'cylinder', 'plane']; break;
        case 'shape': options = ['cone', 'sphere', 'box']; break;
        case 'meshType': options = ['cube', 'sphere', 'cylinder', 'capsule', 'plane', 'cone', 'torus', 'torusknot']; break;
        case 'clearFlags': options = ['skybox', 'solidColor', 'depthOnly', 'nothing']; break;
        case 'side': options = ['front', 'back', 'double']; break;
        case 'interpolation': options = ['none', 'interpolate', 'extrapolate']; break;
        case 'collisionDetection': options = ['discrete', 'continuous', 'continuousDynamic']; break;
      }

      for (const opt of options) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
        if (opt === value) option.selected = true;
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        this._setComponentProperty(comp, key, null, select.value);
      });

      container.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'inspector-text';
      input.value = value || '';
      input.addEventListener('change', () => {
        this._setComponentProperty(comp, key, null, input.value);
      });
      container.appendChild(input);
    }
  }

  _setComponentProperty(comp, key, subKey, value) {
    if (comp.type === 'Transform') {
      if (key === 'position' && subKey) {
        comp._position[subKey] = value;
        comp._markDirty();
      } else if (key === 'rotation' && subKey) {
        const euler = comp.eulerAngles;
        euler[subKey] = value;
        comp.eulerAngles = euler;
      } else if (key === 'scale' && subKey) {
        comp._scale[subKey] = value;
        comp._markDirty();
      }
    } else {
      if (subKey) {
        if (comp[key] && typeof comp[key] === 'object') {
          comp[key][subKey] = value;
        }
      } else {
        comp[key] = value;
      }

      if (comp.type === 'MeshRenderer') {
        comp.updateMaterial();
      } else if (comp.type === 'Light') {
        comp.updateLight();
      } else if (comp.type === 'MeshFilter' && key === 'meshType') {
        comp.deserialize({ properties: { meshType: value } });
        const renderer = comp.gameObject.getComponent('MeshRenderer');
        if (renderer) renderer._createMesh();
      } else if (comp.type === 'Light' && key === 'lightType') {
        comp._createLight();
      }
    }
  }

  _createAddComponentButton(go) {
    const btn = document.createElement('button');
    btn.className = 'add-component-btn';
    btn.textContent = 'Add Component';

    btn.addEventListener('click', () => {
      this._showAddComponentMenu(btn, go);
    });

    this.container.appendChild(btn);
  }

  _showAddComponentMenu(btn, go) {
    const existing = document.querySelector('.add-component-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'add-component-menu';

    const components = [
      { name: 'MeshFilter', category: 'Rendering' },
      { name: 'MeshRenderer', category: 'Rendering' },
      { name: 'Camera', category: 'Rendering' },
      { name: 'Light', category: 'Rendering' },
      { name: 'Rigidbody', category: 'Physics' },
      { name: 'Collider', category: 'Physics' },
      { name: 'AudioSource', category: 'Audio' },
      { name: 'AudioListener', category: 'Audio' },
      { name: 'ParticleSystem', category: 'Effects' },
      { name: 'Animator', category: 'Animation' }
    ];

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'component-search';
    search.placeholder = 'Search components...';
    menu.appendChild(search);

    const list = document.createElement('div');
    list.className = 'component-list';

    const renderList = (filter = '') => {
      list.innerHTML = '';
      let currentCategory = '';
      for (const comp of components) {
        if (filter && !comp.name.toLowerCase().includes(filter.toLowerCase())) continue;
        if (comp.category !== currentCategory) {
          currentCategory = comp.category;
          const catEl = document.createElement('div');
          catEl.className = 'component-category';
          catEl.textContent = currentCategory;
          list.appendChild(catEl);
        }
        const item = document.createElement('div');
        item.className = 'component-list-item';
        item.textContent = comp.name;
        item.addEventListener('click', () => {
          this._addComponent(go, comp.name);
          menu.remove();
        });
        list.appendChild(item);
      }
    };

    search.addEventListener('input', () => renderList(search.value));
    renderList();

    menu.appendChild(list);
    btn.after(menu);

    setTimeout(() => search.focus(), 50);

    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
  }

  _addComponent(go, typeName) {
    let comp;
    switch (typeName) {
      case 'MeshFilter': comp = new MeshFilter(); break;
      case 'MeshRenderer': comp = new MeshRenderer(); break;
      case 'Camera': comp = new CameraComponent(); break;
      case 'Light': comp = new LightComponent(); break;
      case 'Rigidbody': comp = new Rigidbody(); break;
      case 'Collider': comp = new Collider(); break;
      case 'AudioSource': comp = new AudioSource(); break;
      case 'AudioListener': comp = new AudioListener(); break;
      case 'ParticleSystem': comp = new ParticleSystemComponent(); break;
      case 'Animator': comp = new Animator(); break;
    }

    if (comp) {
      go.addComponent(comp);
      if (comp.type === 'MeshRenderer') comp._createMesh();
      if (comp.type === 'Camera') comp._createCamera();
      if (comp.type === 'Light') comp._createLight();
      this.refresh();
      this.editor.console.log(`Added ${typeName} to ${go.name}`);
    }
  }

  _getComponentIcon(type) {
    const icons = {
      'Transform': 'â†”ï¸',
      'MeshFilter': 'ğŸ”·',
      'MeshRenderer': 'ğŸ¨',
      'Camera': 'ğŸ“·',
      'Light': 'ğŸ’¡',
      'Rigidbody': 'âš¡',
      'Collider': 'ğŸ›¡ï¸',
      'AudioSource': 'ğŸ”Š',
      'AudioListener': 'ğŸ‘‚',
      'ParticleSystem': 'âœ¨',
      'Animator': 'ğŸ¬'
    };
    return icons[type] || 'ğŸ“¦';
  }

  _formatLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  }
}

window.InspectorPanel = InspectorPanel;
