/**
 * @file JSLAB LaTeX Editor project tree
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Displays the project hierarchy and dispatches source, preview and folder actions.
 */
class PRDC_JSLAB_LATEX_EDITOR_PROJECT_TREE {

  /**
   * Connects a tree element to the owning editor.
   * @param {HTMLElement} container Project tree container.
   * @param {Object} editor Owning LaTeX Editor.
   */
  constructor(container, editor) {
    this.container = container;
    this.editor = editor;
  }

  /**
   * Draws project files and restores expanded folders after a refresh.
   * @param {Object} project Project root and child entries.
   */
  render(project) {
    const expanded = new Set(Array.from(this.container.querySelectorAll('details[open]'), element => element.dataset.file));
    const root = this.createFolder({ name: project.name, file: '', children: project.tree }, expanded);
    root.open = true;
    this.container.replaceChildren(root);
  }

  /**
   * Creates a folder and its Explorer button.
   * @param {Object} entry Folder entry.
   * @param {Set<string>} expanded Previously expanded folder paths.
   * @returns {HTMLElement} Folder row and descendants.
   */
  createFolder(entry, expanded) {
    const folder = document.createElement('details');
    folder.dataset.file = entry.file;
    folder.open = expanded.has(entry.file);
    const row = document.createElement('summary');
    row.append(this.icon('browser-folder'), this.label(entry.name));
    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'latex-folder-reveal';
    reveal.title = this.editor.strings[734];
    reveal.setAttribute('aria-label', this.editor.strings[734]);
    reveal.append(this.icon('open-folder'));
    reveal.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      this.editor.perform(() => this.editor.revealFolder(entry.file));
    });
    row.append(reveal);
    const children = document.createElement('div');
    children.className = 'latex-tree-children';
    for(const child of entry.children) {
      children.append(child.children ? this.createFolder(child, expanded) : this.createFile(child));
    }
    folder.append(row, children);
    return folder;
  }

  /**
   * Creates a source, preview or informational file row.
   * @param {Object} entry File entry.
   * @returns {HTMLElement} Project file row.
   */
  createFile(entry) {
    const available = entry.editable || entry.preview;
    const row = document.createElement(available ? 'button' : 'div');
    row.className = 'latex-tree-file';
    row.title = entry.file;
    row.dataset.file = entry.file;
    row.append(this.icon('browser-file'), this.label(entry.name));
    if(available) {
      row.type = 'button';
      row.addEventListener('click', () => this.editor.perform(() => this.editor.select(entry.file)));
    }
    if(entry.editable && /\.tex$/i.test(entry.file)) {
      row.addEventListener('contextmenu', event => {
        event.preventDefault();
        this.editor.perform(async () => {
          if(!this.editor.busy && await this.editor.host.request('file-menu', entry.file)) {
            await this.editor.setMain(entry.file);
          }
        });
      });
    }
    return row;
  }

  /**
   * Highlights the active file and expands its ancestor folders.
   * @param {string|null} file Active file path.
   */
  select(file) {
    for(const row of this.container.querySelectorAll('.latex-tree-file')) {
      const active = row.dataset.file === file;
      row.classList.toggle('active', active);
      if(row.tagName === 'BUTTON') row.setAttribute('aria-current', active ? 'true' : 'false');
      if(active) {
        for(let folder = row.closest('details'); folder; folder = folder.parentElement.closest('details')) {
          folder.open = true;
        }
      }
    }
  }

  /**
   * Marks files whose current editor document contains unsaved changes.
   * @param {Map} documents Loaded project files.
   */
  markDirty(documents) {
    for(const row of this.container.querySelectorAll('button.latex-tree-file')) {
      const entry = documents.get(row.dataset.file);
      row.classList.toggle('latex-tree-dirty', Boolean(entry?.doc && !entry.doc.isClean(entry.saved)));
    }
  }

  /**
   * Creates a file tree icon from an existing application asset.
   * @param {string} name Image basename.
   * @returns {HTMLImageElement} Decorative icon.
   */
  icon(name) {
    const icon = document.createElement('img');
    icon.alt = '';
    icon.src = '../img/' + name + '.svg';
    return icon;
  }

  /**
   * Creates an ellipsized file tree label.
   * @param {string} name Entry name.
   * @returns {HTMLElement} Label element.
   */
  label(name) {
    const label = document.createElement('span');
    label.textContent = name;
    return label;
  }
}

exports.PRDC_JSLAB_LATEX_EDITOR_PROJECT_TREE = PRDC_JSLAB_LATEX_EDITOR_PROJECT_TREE;
