class ScriptEngine extends EventEmitter {
  constructor(engine) {
    super();
    this.engine = engine;
    this._scripts = new Map();
    this._userScripts = new Map();
  }

  registerScript(name, scriptClass) {
    this._scripts.set(name, scriptClass);
  }

  createScriptComponent(name) {
    const ScriptClass = this._scripts.get(name);
    if (!ScriptClass) return null;
    return new ScriptClass();
  }

  evaluateScript(code, name = 'UserScript') {
    try {
      const wrappedCode = `
        (function() {
          class ${name} extends Component {
            constructor() {
              super('${name}');
              this.scriptName = '${name}';
            }
            ${code}
          }
          return ${name};
        })()
      `;

      const ScriptClass = eval(wrappedCode);
      this._scripts.set(name, ScriptClass);
      this._userScripts.set(name, code);
      return ScriptClass;
    } catch (e) {
      console.error(`Script compilation error [${name}]:`, e);
      this.emit('scriptError', { name, error: e.message });
      return null;
    }
  }

  getScriptSource(name) {
    return this._userScripts.get(name) || '';
  }

  getRegisteredScripts() {
    return Array.from(this._scripts.keys());
  }
}

window.ScriptEngine = ScriptEngine;
