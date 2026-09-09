class ConsolePanel {
  constructor(editor) {
    this.editor = editor;
    this.container = document.getElementById('console-content');
    this._messages = [];
    this._maxMessages = 500;
    this._filter = 'all';
    this._counts = { log: 0, warn: 0, error: 0 };

    this._interceptConsole();
    this._setupButtons();
  }

  _interceptConsole() {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args) => {
      origLog.apply(console, args);
      this.log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    };

    console.warn = (...args) => {
      origWarn.apply(console, args);
      this.warn(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    };

    console.error = (...args) => {
      origError.apply(console, args);
      this.error(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    };

    window.addEventListener('error', (e) => {
      this.error(`${e.message} at ${e.filename}:${e.lineno}`);
    });
  }

  _setupButtons() {
    const clearBtn = document.getElementById('console-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clear());
    }

    const filterBtns = document.querySelectorAll('.console-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._filter = btn.dataset.filter;
        this._render();
      });
    });
  }

  log(message) {
    this._addMessage('log', message);
  }

  warn(message) {
    this._addMessage('warn', message);
  }

  error(message) {
    this._addMessage('error', message);
  }

  _addMessage(type, message) {
    const entry = {
      type,
      message,
      time: new Date().toLocaleTimeString(),
      count: 1
    };

    if (this._messages.length > 0) {
      const last = this._messages[this._messages.length - 1];
      if (last.message === message && last.type === type) {
        last.count++;
        this._render();
        return;
      }
    }

    this._messages.push(entry);
    this._counts[type]++;

    if (this._messages.length > this._maxMessages) {
      const removed = this._messages.shift();
      this._counts[removed.type]--;
    }

    this._render();
    this._updateCounts();
  }

  _render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const filtered = this._filter === 'all'
      ? this._messages
      : this._messages.filter(m => m.type === this._filter);

    for (const msg of filtered) {
      const el = document.createElement('div');
      el.className = `console-message console-${msg.type}`;

      const icon = msg.type === 'log' ? 'ℹ️' : msg.type === 'warn' ? '⚠️' : '❌';

      el.innerHTML = `
        <span class="console-icon">${icon}</span>
        <span class="console-text">${this._escapeHtml(msg.message)}</span>
        <span class="console-time">${msg.time}</span>
        ${msg.count > 1 ? `<span class="console-count">${msg.count}</span>` : ''}
      `;
      this.container.appendChild(el);
    }

    this.container.scrollTop = this.container.scrollHeight;
  }

  _updateCounts() {
    const logCount = document.getElementById('console-log-count');
    const warnCount = document.getElementById('console-warn-count');
    const errorCount = document.getElementById('console-error-count');
    if (logCount) logCount.textContent = this._counts.log;
    if (warnCount) warnCount.textContent = this._counts.warn;
    if (errorCount) errorCount.textContent = this._counts.error;
  }

  clear() {
    this._messages = [];
    this._counts = { log: 0, warn: 0, error: 0 };
    this._render();
    this._updateCounts();
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.ConsolePanel = ConsolePanel;
