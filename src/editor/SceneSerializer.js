class SceneSerializer {
  constructor(editor) {
    this.editor = editor;
  }

  async saveScene(filePath) {
    const scene = this.editor.engine.activeScene;
    if (!scene) return false;

    const data = {
      version: '1.0.0',
      engine: 'Antigravity Engine',
      timestamp: Date.now(),
      scene: scene.serialize()
    };

    const json = JSON.stringify(data, null, 2);
    const result = await window.electronAPI.fs.writeFile(filePath, json);
    if (result.success) {
      this.editor.console.log(`Scene saved: ${filePath}`);
    } else {
      this.editor.console.error(`Failed to save scene: ${result.error}`);
    }
    return result.success;
  }

  async loadScene(filePath) {
    const result = await window.electronAPI.fs.readFile(filePath);
    if (!result.success) {
      this.editor.console.error(`Failed to load scene: ${result.error}`);
      return false;
    }

    try {
      const data = JSON.parse(result.data);
      const sceneData = data.scene;

      this.editor.engine.activeScene.clear();
      this.editor.engine._restoreScene(sceneData);
      this.editor.selection.clear();
      this.editor.console.log(`Scene loaded: ${filePath}`);
      return true;
    } catch (e) {
      this.editor.console.error(`Failed to parse scene: ${e.message}`);
      return false;
    }
  }

  async saveSceneAs() {
    const result = await window.electronAPI.dialog.saveFile({
      filters: [
        { name: 'Antigravity Scene', extensions: ['agscene'] },
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      return this.saveScene(result.filePath);
    }
    return false;
  }

  async openScene() {
    const result = await window.electronAPI.dialog.openFile({
      filters: [
        { name: 'Antigravity Scene', extensions: ['agscene', 'json'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return this.loadScene(result.filePaths[0]);
    }
    return false;
  }

  newScene() {
    this.editor.engine.activeScene.clear();
    this.editor.engine.activeScene.name = 'Untitled Scene';
    this.editor.selection.clear();

    const dirLight = this.editor.engine.activeScene.createLight('directional', 'Directional Light');
    dirLight.transform._position.set(5, 10, 5);
    dirLight.transform._markDirty();

    this.editor.console.log('New scene created');
  }
}

window.SceneSerializer = SceneSerializer;
