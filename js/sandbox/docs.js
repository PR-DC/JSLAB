/**
 * @file JSLAB library docs submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB docs submodule.
 */
class PRDC_JSLAB_LIB_DOCS {

  /**
   * Initializes docs submodule and loads generated documentation index.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;
    this._docs = JSON.parse(
      this.jsl.inter.env.readFileSync(this.jsl.app_path + '/docs/documentation.json', 'utf8')
    );
  }

  /**
   * Retrieves documentation in JSON format based on the provided name and type.
   * @param {string} [name] - The name of the documentation item.
   * @param {string} [type] - The type of the documentation (e.g., 'category').
   * @returns {string|undefined} The JSON string of the documentation or undefined if not found.
   */
  helpToJSON(name, type) {
    if(!name) {
      return this.jsl.setDepthSafeStringify(this._docs, 4);
    }

    const parts = name.split('.');
    if(parts.length === 2) {
      const [libName, itemName] = parts;
      const data = this._docs.lib[libName];
      if(data.hasOwnProperty(itemName)) {
        const result = data[itemName];
        if(result) {
          result.type = 'lib';
          result.category = libName;
          return this.jsl.setDepthSafeStringify(result, Infinity);
        }
      }
    } else {
      if(type == 'category') {
        for(const category in this._docs) {
          const categoryData = this._docs[category];
          if(categoryData.hasOwnProperty(name)) {
            return this.jsl.setDepthSafeStringify(categoryData[name], 4);
          }
        }
      } else {
        for(const category in this._docs.global) {
          const categoryData = this._docs.global[category];
          if(categoryData.hasOwnProperty(name)) {
            const result = categoryData[name];
            if(result) {
              result.type = 'global';
              result.category = category;
              return this.jsl.setDepthSafeStringify(result, Infinity);
            }
          }
        }
      }
    }
    this.jsl.inter.env.error('@help: ' + this.jsl.inter.lang.string(218) + name);
  }

  /**
   * Retrieves documentation based on the provided name and type.
   * @param {string} name - The name of the documentation item.
   * @param {string} type - The type of the documentation.
   * @returns {string|undefined} The JSON string of the documentation or undefined if not found.
   */
  help(name, type) {
    return this.helpToJSON(name, type);
  }

  /**
   * Retrieves documentation based on the provided name and type.
   * @param {string} name - The name of the documentation item.
   * @param {string} type - The type of the documentation.
   * @returns {string|undefined} The JSON string of the documentation or undefined if not found.
   */
  doc(name, type) {
    return this.help(name, type);
  }

  /**
   * Retrieves documentation based on the provided name and type.
   * @param {string} name - The name of the documentation item.
   * @param {string} type - The type of the documentation.
   * @returns {string|undefined} The JSON string of the documentation or undefined if not found.
   */
  documentation(name, type) {
    return this.help(name, type);
  }

  /**
   * Searches the documentation for methods that match all words in the given query, regardless of order.
   * @param {string} query - The search query containing keywords to match within the documentation.
   * @returns {Array<Object>} Array of matching documentation entries, each entry containing `type` and `category` properties.
   */
  helpSearch(query) {
    var obj = this;
    var query_words = query.toLowerCase().split(' ');
    var results = {};
    Object.keys(this._docs).forEach(function(type) {
      Object.keys(obj._docs[type]).forEach(function(category) {
        Object.keys(obj._docs[type][category]).forEach(function(member) {
          var member_obj = obj._docs[type][category][member];
          var str = JSON.stringify(member_obj).toLowerCase();
          var match = query_words.every((word) => str.includes(word));
          if(match) {
            member_obj.type = type;
            member_obj.category = category;
            results[member] = member_obj;
          }
        });
      });
    });
    return results;
  }

  /**
   * Searches the documentation for methods that match all words in the given query, regardless of order.
   * @param {string} query - The search query containing keywords to match within the documentation.
   * @returns {Array<Object>} Array of matching documentation entries, each entry containing `type` and `category` properties.
   */
  docSearch(query) {
    return this.helpSearch(query);
  }

  /**
   * Searches the documentation for methods that match all words in the given query, regardless of order.
   * @param {string} query - The search query containing keywords to match within the documentation.
   * @returns {Array<Object>} Array of matching documentation entries, each entry containing `type` and `category` properties.
   */
  documentationSearch(query) {
    return this.helpSearch(query);
  }

  /**
   * Searches documentation by keyword and prints matching symbols.
   * MATLAB-compatible alias for documentation search.
   * @param {string} query Search query.
   * @returns {Array<string>} Matching summary lines.
   */
  lookfor(query) {
    if(typeof query !== 'string' || !query.trim().length) {
      this.jsl.inter.env.error('@lookfor: expected a search query.');
      this.jsl.no_ans = true;
      this.jsl.ignore_output = true;
      return [];
    }
    var matches = this.documentationSearch(query.trim());
    var names = Object.keys(matches || {}).sort();
    var lines = names.map(function(name) {
      var item = matches[name] || {};
      var description = item.description || '';
      return description ? (name + ' - ' + description) : name;
    });

    if(lines.length) {
      if(typeof this.jsl.inter.env.dispMonospaced === 'function') {
        this.jsl.inter.env.dispMonospaced(lines.join('\n'));
      } else {
        this.jsl.inter.env.disp(lines.join('\n'));
      }
    } else {
      this.jsl.inter.env.disp('@lookfor: no matches found.');
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return lines;
  }

  /**
   * Opens the source file and navigates to the specified line based on the provided name.
   * @param {string} name - The name of the source to locate.
   */
  source(name) {
    const parts = name.split('.');
    if(parts.length === 2) {
      const [libName, itemName] = parts;
      const data = this._docs.lib[libName];
      if(data.hasOwnProperty(itemName)) {
        const result = data[itemName];
        if(result) {
          this.jsl.inter.env.editor(this.jsl.app_path + '/js/sandbox/' + result.source_filename, result.source_lineno);
          return;
        }
      }
    } else {
      for(const category in this._docs.global) {
        const categoryData = this._docs.global[category];
        if(categoryData.hasOwnProperty(name)) {
          const result = categoryData[name];
          if(result) {
            this.jsl.inter.env.editor(this.jsl.app_path + '/js/sandbox/' + result.source_filename, result.source_lineno);
            return;
          }
        }
      }
    }
    this.jsl.inter.env.error('@source: ' + this.jsl.inter.lang.string(220) + name);
  }

  /**
   * Showing graph of function.
   * @param {string} name - The name of the function.
   */
  async docGraph(name) {
    var obj = this;
    function _docGraph(name) {
      var result;
      const parts = name.split('.');
      if(parts.length === 2) {
        const [libName, itemName] = parts;
        const data = obj._docs.lib[libName];
        if(data.hasOwnProperty(itemName)) {
          result = data[itemName];
        }
      } else {
        for(const category in obj._docs.global) {
          const categoryData = obj._docs.global[category];
          if(categoryData.hasOwnProperty(name)) {
            result = categoryData[name];
          }
        }
      }

      var source;
      var called = new Set();
      if(result) {
        if(result.source_range && result.kind == 'function') {
          source = obj.jsl.inter.file_system.getContentFromCharRange(
            obj.jsl.app_path + '/js/sandbox/' + result.source_filename, result.source_range);

          var ast = obj.jsl.inter.env.recast.parse('function ' + source, {
            parser: {
              parse(src) {
                return obj.jsl.inter.env.babel_parser.parse(src, {
                  sourceType: 'module',
                  allowReturnOutsideFunction: true,
                  plugins: [
                    'jsx',
                    'typescript',
                    'classProperties',
                    'dynamicImport',
                    'optionalChaining',
                    'nullishCoalescingOperator',
                  ],
                });
              },
            },
          });

          obj.jsl.inter.env.recast.visit(ast, {
            visitCallExpression(path) {
              var { callee } = path.node;
              var fn_name;

              if(callee.type === 'Identifier') {
                fn_name = callee.name;
              } else if(
                callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier'
              ) {
                fn_name = callee.property.name;
              }

              if(fn_name) {
                called.add(fn_name);
              }
              this.traverse(path);
            },
          });
        }

        var lines = ['graph TD', `  root["${name}"]`];
        var id = 0;
        for(var fn of called) {
          id = id + 1;
          lines.push(`  root --> id${id}["${fn}"]`);
        }
        return lines.join('\n');
      }
      obj.jsl.inter.env.error('@docGraph: ' + obj.jsl.inter.lang.string(218) + name);
      return false;
    }

    var graph = _docGraph(name);
    if(graph) {
      var graph_win = await this.jsl.inter.windows.showMermaidGraph(graph);
      graph_win.document.custom_style.textContent += '.node { cursor: pointer; }';
      graph_win.document.addEventListener('click', async (e) => {
        var node = e.target.closest('.node');
        if(!node) {
          return;
        }
        const labelEl = node.querySelector('.nodeLabel');
        if(!labelEl) {
          return;
        }
        const new_graph = _docGraph(labelEl.textContent.trim());
        if(new_graph) {
          await graph_win.showGraph(new_graph);
        }
      });
    }
  }
}

exports.PRDC_JSLAB_LIB_DOCS = PRDC_JSLAB_LIB_DOCS;
