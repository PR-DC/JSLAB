/**
 * @file JSLAB file browser module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


/**
 * Class for JSLAB file browser.
 */
class PRDC_JSLAB_FILE_BROWSER {

  /**
   * Initializes the file browser, setting up the UI component and event listeners for file browser interactions.
   * @param {object} win The window object representing the owning window controller.
   */
  constructor(win) {
    var obj = this;
    this.win = win;

    this.file_browser_cont = document.getElementById('file-browser-cont');
    this.expanded_paths = new Set();
    this.context_menu = document.getElementById('file-browser-context-menu');
    if(this.context_menu) {
      document.getElementById('file-browser-context-remove').addEventListener('click', () => this.removeSelectedEntry());
      document.addEventListener('click', event => {
        if(!this.context_menu.contains(event.target)) {
          this.hideContextMenu();
        }
      });
      document.addEventListener('keydown', event => {
        if(event.key == 'Escape') {
          this.hideContextMenu();
        }
      });
      document.getElementById('file-browser').addEventListener('scroll', () => this.hideContextMenu());
    }

    // File browser refresh button click
    $('#file-browser-options .refresh').click(function(e) {
      obj.updateFileBrowser();
    });
  }

  /**
   * Displays the contents of a specified folder within the file browser UI, optionally clearing the current display and replacing it with the new content.
   * @param {string} folder_path The path to the folder whose contents should be displayed.
   * @param {HTMLElement} [element=this.file_browser_cont] The HTML element where the folder contents should be displayed. Defaults to the file browser container.
   * @param {boolean} [root=false] Indicates whether the folder is the root folder being displayed. If true, the browser will clear its current content.
   */
  showFolderContent(folder_path, element = this.file_browser_cont, root = false) {
    const { fs, path } = this.win.platform;
    var obj = this;
    var ul = document.createElement('ul');
    ul.setAttribute('path', folder_path.replace(/\\/g, '/'));
    if(root) {
      $(element).html('');
    } else {
      $(element).find('ul').remove();
    }
    fs.readdir(folder_path, {withFileTypes: true}, function(err, dirents) {
      if(err) {
        obj.win.command_window.errorInternal(language.string(92) + ': ' + err);
        return;
      }

      dirents.sort((a, b) => {
        if(a.isDirectory() && !b.isDirectory()) {
          return -1;
        }
        if(!a.isDirectory() && b.isDirectory()) {
          return 1;
        }

        return a.name.localeCompare(b.name);
      });

      dirents.forEach(function(dirent) {
        var absolute_path = path.join(folder_path, dirent.name);
        obj.addFileBrowserItem(absolute_path, dirent, ul);
      });
      $(ul).appendTo(element).hide().slideDown(obj.win.platform.animation_duration ?? 300, 'linear');
    });
  }

  /**
   * Adds an item to the file browser UI, such as a file or folder, including its name and an icon indicating its type.
   * @param {string} absolute_path The absolute path to the file or folder to add.
   * @param {HTMLElement} ul The unordered list (UL) HTML element to which the item should be added.
   */
  addFileBrowserItem(absolute_path, dirent, ul) {
    const { fs, path, host } = this.win.platform;
    var obj = this;
    var type_folder = false;
    var li = document.createElement('li');
    li.setAttribute('path', absolute_path.replace(/\\/g, '/'));
    const label = document.createElement('span');
    label.textContent = path.basename(absolute_path);
    label.title = absolute_path;
    li.appendChild(label);
    li.oncontextmenu = function(event) {
      event.preventDefault();
      event.stopPropagation();
      obj.openContextMenu(absolute_path, dirent.isDirectory() ? 'directory' : 'file', event.clientX, event.clientY);
    };

    if(dirent.isDirectory()) {
      li.className = 'folder';
      type_folder = true;
    } else if(dirent.isSymbolicLink?.()) {
      li.className = 'link';
      absolute_path = fs.readlinkSync(absolute_path);
      type_folder = true;
    } else {
      li.className = 'file';
      li.ondblclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        if(/\.jslmo$/i.test(absolute_path)) host.send('MainProcess', 'show-simulate', absolute_path);
        else host.send('EditorWindow', 'open-script', [absolute_path]);
      };
      var ext = absolute_path.split('.').pop();
      if(ext == 'jsl') {
        li.classList.add('jsl');
      } else if(ext == 'js') {
        li.classList.add('js');
      } else if(ext == 'json') {
        li.classList.add('json');
      }
    }
    if(type_folder) {
      li.ondblclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        obj.win.folder_navigation.setPath(absolute_path);
      };
      var expand = document.createElement('i');
      expand.className = 'expend';
      expand.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        if($(this).hasClass('expended')) {
          $(this).removeClass('expended');
          var parent_ul = $(this).parent().find('ul');
          obj.expanded_paths.delete(absolute_path);
          $(parent_ul).slideUp(obj.win.platform.animation_duration ?? 300, 'linear', function() {
            $(parent_ul).remove();
          });
        } else {
          $(this).addClass('expended');
          obj.expanded_paths.add(absolute_path);
          obj.showFolderContent(absolute_path, $(this).parent());
        }
      };
      li.appendChild(expand);
    }
    ul.appendChild(li);
    if(type_folder && this.expanded_paths.has(absolute_path)) {
      li.querySelector('i.expend').classList.add('expended');
      this.showFolderContent(absolute_path, li);
    }
  }

  /**
   * Opens actions for the selected filesystem entry within the viewport.
   * @param {string} filename Selected entry path.
   * @param {string} kind File or directory.
   * @param {number} left Pointer horizontal coordinate.
   * @param {number} top Pointer vertical coordinate.
   */
  openContextMenu(filename, kind, left, top) {
    if(!this.context_menu || !filename) {
      return;
    }
    this.win.workspace.hideContextMenu();
    this.context_path = filename;
    this.context_kind = kind;
    this.context_menu.style.display = 'block';
    const bounds = this.context_menu.getBoundingClientRect();
    this.context_menu.style.left = Math.max(4, Math.min(left, window.innerWidth - bounds.width - 4)) + 'px';
    this.context_menu.style.top = Math.max(4, Math.min(top, window.innerHeight - bounds.height - 4)) + 'px';
  }

  /**
   * Dismisses the file actions and clears their selected entry.
   */
  hideContextMenu() {
    if(this.context_menu) {
      this.context_menu.style.display = 'none';
    }
    this.context_path = undefined;
    this.context_kind = undefined;
  }

  /**
   * Removes the selected entry through the platform filesystem service.
   * @returns {Promise<void>} Completion of removal and browser refresh.
   */
  async removeSelectedEntry() {
    const filename = this.context_path;
    this.hideContextMenu();
    if(!filename) {
      return;
    }
    try {
      await this.win.platform.removePath(filename);
      for(const expanded of this.expanded_paths) {
        if(expanded == filename || expanded.startsWith(filename + this.win.platform.path.sep)) {
          this.expanded_paths.delete(expanded);
        }
      }
      this.updateFileBrowser();
    } catch(error) {
      this.win.command_window.errorInternal(error.stack || String(error));
    }
  }

  /**
   * Refreshes the file browser to reflect the current state of the filesystem or the contents of the current directory.
   */
  updateFileBrowser() {
    this.win.folder_navigation.setPath(this.win.folder_navigation.current_path);
  }

}

exports.PRDC_JSLAB_FILE_BROWSER = PRDC_JSLAB_FILE_BROWSER;
