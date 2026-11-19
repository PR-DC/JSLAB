/**
 * @file JSLAB LaTeX project file types shared by editor hosts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const latex_source = /\.(?:tex|bib|sty|cls|ltx|bst|dtx|ins)$/i;
const latex_document = '\\documentclass{article}\n\n\\begin{document}\n\\null\n\\end{document}\n';
const latex_asset_types = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};
for(const extension of ['.log', '.txt', '.md', '.csv', '.tsv', '.json', '.xml', '.yaml', '.yml', '.ini', '.cfg', '.aux', '.toc', '.bbl', '.blg']) {
  latex_asset_types[extension] = 'text/plain';
}

/**
 * Collects source files and resources for an isolated LaTeX build.
 */
class PRDC_JSLAB_LATEX_PROJECT_FILES {

  /**
   * Builds the editor tree from host directory entries using project-relative paths.
   * @param {Function} list Lists entries for a project-relative directory.
   * @param {string} separator Host path separator.
   * @returns {Promise<Object>} Tree and editable source paths.
   */
  static async scan(list, separator) {
    const files = [];
    async function visit(directory) {
      const entries = await list(directory);
      const children = [];
      entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
      for(const entry of entries) {
        if(entry.name === '.git' || entry.name.startsWith('.jslab-latex-')) continue;
        const file = directory ? directory + separator + entry.name : entry.name;
        const node = { name: entry.name, file };
        if(entry.isDirectory()) {
          node.children = await visit(file);
        } else {
          node.editable = entry.isFile() && latex_source.test(entry.name);
          const extension = /\.[^.]+$/.exec(entry.name)?.[0].toLowerCase();
          node.preview = entry.isFile() ? latex_asset_types[extension] || null : null;
          if(node.editable) files.push(file);
        }
        children.push(node);
      }
      return children;
    }
    return { tree: await visit(''), files };
  }

  /**
   * Chooses the main TeX source, giving an explicit request precedence.
   * @param {string[]} files Editable project paths.
   * @param {string} [requested] Explicit main source.
   * @param {string} [saved] Previous main source for this project.
   * @returns {string|null|false} Source, empty project, or invalid request.
   */
  static chooseMain(files, requested, saved) {
    const valid = file => typeof file === 'string' && /\.tex$/i.test(file) && files.includes(file);
    if(requested) return valid(requested) ? requested : false;
    if(valid(saved)) return saved;
    return files.find(file => /^main\.tex$/i.test(file)) || files.find(valid) || null;
  }

  /**
   * Reads project files into the isolated compiler's virtual filesystem.
   * @param {Object[]} tree Project listing.
   * @param {string} main Project-relative main document.
   * @param {Function} read Host file reader returning bytes or null.
   * @returns {Promise<Object[]>} Compiler files.
   */
  static async read(tree, main, read) {
    const files = [];
    const stem = main.replace(/\.tex$/i, '');
    const generated = new Set(['.pdf', '.log', '.synctex.gz', '.aux', '.toc', '.out', '.idx', '.ind', '.ilg', '.blg', '.bcf', '.run.xml']
      .map(extension => stem + extension));
    async function visit(nodes) {
      for(const node of nodes) {
        if(node.children) {
          await visit(node.children);
        } else if(!generated.has(node.file)) {
          const contents = await read(node.file);
          if(contents) files.push({ path: node.file.replaceAll('\\', '/'), contents });
        }
      }
    }
    await visit(tree);
    return files;
  }

  /**
   * Captures the current project's source and resources for the compiler worker.
   * @param {Object} project Project adapter with a root and a tree scanner.
   * @param {Object} source Resolved target and project-relative source path.
   * @param {Function} read Host file reader.
   * @returns {Promise<Object|null>} Snapshot, or null if the project has changed.
   */
  static async snapshot(project, { root, target, main, separator }, read) {
    const { tree } = await project.scan(root);
    const files = await this.read(tree, main, read);
    if(project.root !== root) return null;
    return { target, project: root, main: main.replaceAll(separator, '/'), files, separator };
  }

  /**
   * Validates and saves a compiler log and PDF beside their source document.
   * @param {string} target Main source path approved by the host.
   * @param {Object} output Compiler log and optional PDF bytes.
   * @param {Function} write Host file writer accepting text or bytes.
   * @returns {Promise<Object|null>} Published PDF path or invalid output.
   */
  static async publish(target, output, write) {
    if(typeof output?.log !== 'string' || (output.pdf !== null &&
        (!ArrayBuffer.isView(output.pdf) || Object.prototype.toString.call(output.pdf) !== '[object Uint8Array]'))) return null;
    const stem = target.slice(0, -4);
    if(output.log) await write(stem + '.log', output.log);
    const pdf = output.pdf ? stem + '.pdf' : null;
    if(pdf) await write(pdf, output.pdf);
    return { pdf };
  }
}

exports.latex_source = latex_source;
exports.latex_document = latex_document;
exports.latex_asset_types = latex_asset_types;
exports.PRDC_JSLAB_LATEX_PROJECT_FILES = PRDC_JSLAB_LATEX_PROJECT_FILES;
