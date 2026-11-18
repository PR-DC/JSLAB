/**
 * @file Simulate diagram rendering and selection
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SIMULATE_COMPILER } = require('./compiler');
const {
  parseAnnotation,
  iconTypes,
  renderBlockIcon
} = PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();

/**
 * Implements diagram rendering and selection against the owning Simulate window state.
 */
class PRDC_JSLAB_SIMULATE_DIAGRAM {

  /**
   * Connects controls for diagram rendering and selection.
   */
  _bindDiagramEvents() {

    var obj = this;
    document.getElementById('simulate-diagram-zoom-in').addEventListener('click', function() {
      obj.zoomDiagram(1.2);
    });

    document.getElementById('simulate-diagram-zoom-out').addEventListener('click', function() {
      obj.zoomDiagram(1 / 1.2);
    });

    document.getElementById('simulate-diagram-fit').addEventListener('click', function() {
      obj.diagram_fitted = false;
      requestAnimationFrame(obj.fitDiagram.bind(obj));
    });

    obj.diagram_resize_observer = new ResizeObserver(function() {
      if(obj.diagram_resize_frame) {
        cancelAnimationFrame(obj.diagram_resize_frame);
      }
      obj.diagram_resize_frame = requestAnimationFrame(function() {
        obj.diagram_resize_frame = null;
        obj.resizeDiagramView();
      });
    });

    obj.diagram_resize_observer.observe(document.getElementById('simulate-diagram-svg'));
  }

  /**
   * Converts an editor line and column to a source offset.
   */
  sourceOffset(position) {
    var obj = this;
    if(!position) {
      return obj.model_source.length;
    }
    var lines = obj.model_source.split('\n');
    var line = Math.max(0, Math.min(lines.length - 1, Number(position.line) || 0));
    var offset = 0;
    for(var index = 0; index < line; index++) {
      offset += lines[index].length + 1;
    }
    return offset + Math.max(0, Math.min(lines[line].length, Number(position.ch) || 0));
  }

  /**
   * Refreshes diagram selection markers for the selected blocks.
   */
  updateComponentSelection() {
    var obj = this;
    document.querySelectorAll('.simulate-component').forEach(function(element) {
      element.classList.toggle('selected', obj.selected_components.has(element.dataset.component));
    });
    document.querySelectorAll('.simulate-tree-item[data-component]').forEach(function(element) {
      element.classList.toggle('selected', obj.selected_components.has(element.dataset.component));
    });
  }

  /**
   * Updates the selected block group for an individual pointer action.
   */
  selectComponent(name, additive, toggle) {
    var obj = this;
    if(!additive) {
      obj.selected_components.clear();
    }
    if(toggle && obj.selected_components.has(name)) {
      obj.selected_components.delete(name);
    } else {
      obj.selected_components.add(name);
    }
    obj.selected_connection = '';
    obj.updateComponentSelection();
    obj.drawDiagramWires();
  }

  /**
   * Shows the model diagram and schedules its initial fit.
   */
  showDiagram() {
    var obj = this;
    requestAnimationFrame(function() {
      if(!obj.diagram_fitted) {
        obj.fitDiagram();
      }
    });
  }

  /**
   * Rebuilds the model tree with translated block names.
   */
  renderTree() {
    var obj = this;
    var tree = document.getElementById('simulate-tree');
    tree.replaceChildren();
    if(!obj.model) {
      return;
    }
    var root = document.createElement('div');
    root.className = 'simulate-tree-item simulate-tree-root';
    root.textContent = obj.projectFileName();
    root.addEventListener('click', function() {
      obj.showDiagram();
      obj.diagram_fitted = false;
      requestAnimationFrame(obj.fitDiagram.bind(obj));
    });
    root.addEventListener('dblclick', obj.showParameters.bind(obj));
    tree.appendChild(root);
    obj.model.components.filter(function(component) {
      return !component.parameter;
    }).forEach(function(component) {
      var item = document.createElement('div');
      item.className = 'simulate-tree-item' + (obj.selected_components.has(component.name) ? ' selected' : '');
      item.style.paddingLeft = '17px';
      var name = document.createElement('span');
      name.textContent = component.name;
      var type = document.createElement('span');
      type.className = 'simulate-tree-type';
      type.textContent = obj.simulateTypeLabel(component.type);
      item.appendChild(name);
      item.appendChild(type);
      item.title = obj.simulateTypeLabel(component.type);
      item.dataset.component = component.name;
      item.addEventListener('click', function(event) {
        obj.selectComponent(component.name, event.ctrlKey || event.metaKey || event.shiftKey,
          event.ctrlKey || event.metaKey);
        obj.showDiagram();
      });
      item.addEventListener('dblclick', function(event) {
        event.stopPropagation();
        obj.showComponentProperties(component);
      });
      tree.appendChild(item);
    });
  }

  /**
   * Creates an SVG element with its attributes and optional class.
   */
  svgElement(name, attributes = {}, class_name = '') {
    var element = document.createElementNS('http://www.w3.org/2000/svg', name);
    if(class_name) {
      element.setAttribute('class', class_name);
    }
    Object.entries(attributes).forEach(function(entry) {
      element.setAttribute(entry[0], entry[1]);
    });
    return element;
  }

  /**
   * Draws a block using its compiler-owned icon metadata.
   */
  drawComponentIcon(container, component, width, height) {
    var obj = this;
    var modifiers = (component.modifiers || []).map(function(modifier) {
      return Object.assign({}, modifier);
    });
    var prefix = component.name + '\u0000';
    obj.component_bindings.forEach(function(value, key) {
      if(!key.startsWith(prefix)) {
        return;
      }
      var name = key.slice(prefix.length);
      var modifier = modifiers.find(function(item) {
        return item.name == name;
      });
      if(modifier) {
        modifier.value = value;
      } else {
        modifiers.push({ name: name, value: value });
      }
    });
    renderBlockIcon(container, Object.assign({}, component, { language: language.lang, modifiers: modifiers }),
      width, height, obj.component_graphics.get(component.type));
  }

  /**
   * Measures a block drawing and its captions in component coordinates.
   * @param {SVGGraphicsElement} visual Block drawing group.
   * @param {number} rotation Placement rotation in degrees.
   * @returns {Object} Bounds including rotated annotations and connectors.
   */
  componentVisualBounds(visual, rotation) {
    var bounds = visual.getBBox();
    var angle = -Number(rotation || 0) * Math.PI / 180;
    var cosine = Math.cos(angle);
    var sine = Math.sin(angle);
    var points = [[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y],
      [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height]]
      .map(function(point) {
        return { x: point[0] * cosine - point[1] * sine,
          y: point[0] * sine + point[1] * cosine };
      });
    return { left: Math.min(...points.map(function(point) {
      return point.x;
    })),
    right: Math.max(...points.map(function(point) {
      return point.x;
    })),
    top: Math.min(...points.map(function(point) {
      return point.y;
    })),
    bottom: Math.max(...points.map(function(point) {
      return point.y;
    })) };
  }

  /**
   * Resolves a connector location within the block icon.
   */
  componentPortLocal(port, width, height, ports, component) {
    var obj = this;
    var label = String(port.label || '').split('.').pop();
    var type = component && component.type || '';
    var metadata = !iconTypes.includes(type) && obj.component_graphics.get(type);
    var definition = metadata && metadata.ports.find(function(item) {
      return item.name == label;
    });
    if(definition && definition.annotation) {
      var parsed = parseAnnotation(definition.annotation);
      var placement = Array.isArray(parsed) && parsed.find(function(item) {
        return item && item.kind == 'Placement';
      });
      var values = placement && placement.values;
      if(values && values.slice(3, 7).every(function(value) {
        return typeof value == 'number';
      })) {
        var origin_x = typeof values[1] == 'number' ? values[1] : 0;
        var origin_y = typeof values[2] == 'number' ? values[2] : 0;
        return { x: (origin_x + (values[3] + values[5]) / 2) * width / 200,
          y: -(origin_y + (values[4] + values[6]) / 2) * height / 200 };
      }
    }
    if(/\.JointSSR$/.test(type)) {
      if(label == 'frame_a') {
        return { x: width / 2, y: 0 };
      }
      if(label == 'frame_ib') {
        return { x: 0, y: height / 2 };
      }
      if(label == 'frame_b') {
        return { x: -width / 2, y: 0 };
      }
      if(label == 'axis') {
        return { x: 0, y: -height / 2 };
      }
    }
    if(/\.Body$/.test(type) && component.name.indexOf('lowerRod') === 0 && label == 'frame_a') {
      return { x: 0, y: -height / 2 };
    }
    if(label == 'frame_a' || label == 'u' || label == 'phi_ref') {
      return { x: -width / 2, y: 0 };
    }
    if(label == 'frame_b' || label == 'y' || label == 'flange') {
      return { x: width / 2, y: 0 };
    }
    if(label == 'axis') {
      return { x: 0, y: -height / 2 };
    }
    if(label == 'support') {
      return { x: 0, y: height / 2 };
    }
    var same_side = ports.filter(function(item) {
      return item.side === port.side;
    });
    var index = same_side.indexOf(port);
    return {
      x: port.side === 'left' ? -width / 2 : width / 2,
      y: (index + 1) * height / (same_side.length + 1) - height / 2
    };
  }

  /**
   * Rebuilds block graphics, connectors and wires while preserving the view.
   */
  renderDiagram() {
    var obj = this;
    var svg = document.getElementById('simulate-diagram-svg');
    var layer = document.getElementById('simulate-diagram-layer');
    var wire_layer = document.getElementById('simulate-wire-layer');
    var component_layer = document.getElementById('simulate-component-layer');
    wire_layer.replaceChildren();
    component_layer.replaceChildren();
    obj.diagram_nodes.clear();
    if(!obj.model) {
      document.getElementById('simulate-diagram-fit').disabled = true;
      document.getElementById('simulate-diagram-empty').hidden = true;
      return;
    }
    var namespace = 'http://www.w3.org/2000/svg';
    var ports = new Map();
    var addPort = function(reference, side) {
      var split = String(reference).split('.');
      var name = split.shift();
      if(!ports.has(name)) {
        ports.set(name, []);
      }
      var list = ports.get(name);
      if(!list.some(function(port) {
        return port.reference === reference;
      })) {
        list.push({ reference: reference, label: split.join('.'), side: side });
      }
    };
    obj.model.connections.forEach(function(connection) {
      addPort(connection.from, 'right');
      addPort(connection.to, 'left');
    });
    obj.model.components.forEach(function(component) {
      if(!component.placement || component.placement.visible === false) {
        return;
      }
      var definition = obj.block_catalog.find(function(item) {
        return item[0] == component.type;
      });
      var metadata = obj.component_graphics.get(component.type);
      if(!definition && metadata) {
        metadata.ports.forEach(function(port) {
          addPort(component.name + '.' + port.name, /Input$/.test(port.type) ? 'left' : 'right');
        });
      }
      if(!definition && !metadata && !obj.component_graphics_pending.has(component.type)) {
        obj.loadComponentGraphics(component.type).then(function() {
          obj.renderDiagram();
        }).catch(function(error) {
          obj.appendOutput(obj.simpleCompilerError(error), true);
        });
      }
      if(definition) {
        definition[2].forEach(function(port) {
          if(/\.Revolute$/.test(component.type) && /^(axis|support)$/.test(port) &&
            !(component.modifiers || []).some(function(modifier) {
              return modifier.name == 'useAxisFlange' && modifier.value == 'true';
            })) {
            return;
          }
          addPort(component.name + '.' + port, /^(frame_a|u|phi_ref)$/.test(port) ? 'left' : 'right');
        });
      }
      var extent = component.placement.extent;
      var component_ports = ports.get(component.name) || [];
      var width = Math.max(8, Math.abs(extent[2] - extent[0]));
      var height = Math.max(8, Math.abs(extent[3] - extent[1]));
      var group = document.createElementNS(namespace, 'g');
      group.setAttribute('class', 'simulate-component' + (obj.selected_components.has(component.name) ? ' selected' : ''));
      group.dataset.component = component.name;
      group.setAttribute('transform', 'translate(' + component.placement.x + ' ' + (-component.placement.y) + ')');
      var visual = obj.svgElement('g', { transform: 'rotate(' + (-component.placement.rotation || 0) + ')' }, 'component-visual');
      var rect = document.createElementNS(namespace, 'rect');
      rect.setAttribute('class', 'component-background');
      rect.setAttribute('x', -width / 2);
      rect.setAttribute('y', -height / 2);
      rect.setAttribute('width', width);
      rect.setAttribute('height', height);
      rect.setAttribute('rx', 1.5);
      var name_text = document.createElementNS(namespace, 'text');
      name_text.setAttribute('class', 'component-name');
      name_text.textContent = component.name;
      var name_width = Math.max(6, component.name.length * 1.8 + 1);
      visual.appendChild(rect);
      obj.drawComponentIcon(visual, component, width, height);
      component_ports.forEach(function(port, index) {
        var position = obj.componentPortLocal(port, width, height, component_ports, component);
        var label = String(port.label || '').split('.').pop();
        var frame_port = label.indexOf('frame_') === 0;
        var marker = document.createElementNS(namespace, frame_port ? 'rect' : 'circle');
        var marker_class = 'simulate-port';
        if(label == 'axis' || label == 'flange' || label == 'support') {
          marker_class += ' rotational-port';
        }
        if(label == 'u' || label == 'y' || label == 'phi_ref') {
          marker_class += ' signal-port';
        }
        marker.setAttribute('class', marker_class);
        if(frame_port) {
          var size = Math.min(2.2, Math.min(width, height) / 5);
          marker.setAttribute('x', position.x - size / 2);
          marker.setAttribute('y', position.y - size / 2);
          marker.setAttribute('width', size);
          marker.setAttribute('height', size);
        } else {
          marker.setAttribute('cx', position.x);
          marker.setAttribute('cy', position.y);
          marker.setAttribute('r', Math.min(1.15, Math.min(width, height) / 8));
        }
        marker.dataset.reference = port.reference;
        marker.dataset.side = port.side;
        var title = document.createElementNS(namespace, 'title');
        title.textContent = port.reference;
        marker.appendChild(title);
        marker.addEventListener('pointerdown', obj.startConnectionDrag.bind(obj));
        visual.appendChild(marker);
      });
      group.append(visual, name_text);
      group.addEventListener('pointerdown', function(event) {
        obj.startComponentDrag(event, component, group);
      });
      group.addEventListener('dblclick', function(event) {
        event.stopPropagation();
        obj.showComponentProperties(component);
      });
      component_layer.appendChild(group);
      obj.diagram_nodes.set(component.name, { component: component, group: group, width: width, height: height,
        visual_bounds: obj.componentVisualBounds(visual, component.placement.rotation),
        ports: component_ports, name_text: name_text, name_width: name_width });
    });
    obj.drawDiagramWires();
    document.getElementById('simulate-diagram-fit').disabled = !obj.diagram_nodes.size;
    document.getElementById('simulate-diagram-empty').hidden = !!obj.diagram_nodes.size;
    obj.updateDiagramTransform();
    if(!obj.diagram_fitted) {
      requestAnimationFrame(obj.fitDiagram.bind(obj));
    }
  }

  /**
   * Applies the current pan and zoom to the diagram group.
   */
  updateDiagramTransform() {
    var obj = this;
    document.getElementById('simulate-diagram-layer').setAttribute('transform',
      'translate(' + obj.diagram_view.x + ' ' + obj.diagram_view.y + ') scale(' + obj.diagram_view.scale + ')');
  }

  /**
   * Measures the available diagram viewport.
   */
  currentDiagramViewport() {
    var svg = document.getElementById('simulate-diagram-svg');
    var svg_bounds = svg.getBoundingClientRect();
    var browser_bounds = document.getElementById('simulate-browser').getBoundingClientRect();
    var left = Math.max(0, browser_bounds.right - svg_bounds.left + 12);
    var width = Math.max(1, svg.clientWidth - left);
    var height = Math.max(1, svg.clientHeight);
    return { left: left, width: width, height: height,
      center_x: left + width / 2, center_y: height / 2 };
  }

  /**
   * Preserves the visible diagram center when the viewport changes size.
   */
  adaptDiagramView(previous, next) {
    var obj = this;
    if(!previous || !next || !obj.diagram_view.scale) {
      return false;
    }
    var model_x = (previous.center_x - obj.diagram_view.x) / obj.diagram_view.scale;
    var model_y = (previous.center_y - obj.diagram_view.y) / obj.diagram_view.scale;
    var factor = Math.min(next.width / previous.width, next.height / previous.height);
    var scale = Math.max(.1, Math.min(12, obj.diagram_view.scale * factor));
    obj.diagram_view.scale = scale;
    obj.diagram_view.x = next.center_x - model_x * scale;
    obj.diagram_view.y = next.center_y - model_y * scale;
    obj.updateDiagramTransform();
    return true;
  }

  /**
   * Updates the diagram transform after a window or panel resize.
   */
  resizeDiagramView() {
    var obj = this;
    var next = obj.currentDiagramViewport();
    if(obj.diagram_viewport && (next.width != obj.diagram_viewport.width ||
        next.height != obj.diagram_viewport.height || next.left != obj.diagram_viewport.left)) {
      obj.adaptDiagramView(obj.diagram_viewport, next);
    }
    obj.diagram_viewport = next;
  }

  /**
   * Resolves a connector reference to its diagram coordinates.
   */
  portPosition(reference) {
    var obj = this;
    for(const node of obj.diagram_nodes.values()) {
      var port = node.ports.find(function(item) {
        return item.reference === reference;
      });
      if(!port) {
        continue;
      }
      var local = obj.componentPortLocal(port, node.width, node.height, node.ports, node.component);
      var local_x = local.x;
      var local_y = local.y;
      var angle = -Number(node.component.placement.rotation || 0) * Math.PI / 180;
      return {
        x: node.component.placement.x + local_x * Math.cos(angle) - local_y * Math.sin(angle),
        y: -node.component.placement.y + local_x * Math.sin(angle) + local_y * Math.cos(angle)
      };
    }
    return null;
  }

  /**
   * Places transparent labels close to their icons and clear of connector exits and wires.
   */
  positionComponentLabels(wire_paths) {
    var obj = this;
    var placed = [];
    var terminals = [];
    for(const node of obj.diagram_nodes.values()) {
      node.ports.forEach(function(port) {
        var point = obj.portPosition(port.reference);
        if(!point) {
          return;
        }
        var dx = point.x - node.component.placement.x;
        var dy = point.y + node.component.placement.y;
        var box = { left: point.x - 1.5, right: point.x + 1.5,
          top: point.y - 1.5, bottom: point.y + 1.5 };
        if(Math.abs(dx) / node.width >= Math.abs(dy) / node.height) {
          box[dx < 0 ? 'left' : 'right'] += dx < 0 ? -8 : 8;
        } else {
          box[dy < 0 ? 'top' : 'bottom'] += dy < 0 ? -8 : 8;
        }
        terminals.push(box);
      });
    }
    for(const node of obj.diagram_nodes.values()) {
      var component = node.component;
      var center_x = component.placement.x;
      var center_y = -component.placement.y;
      var bounds = node.visual_bounds;
      var shift = node.name_width / 2 + 2.2;
      var candidates = [
        { x: 0, y: bounds.bottom + 2.2, priority: 0 },
        { x: 0, y: bounds.top - 2.2, priority: .1 },
        { x: -shift, y: bounds.bottom + 2.2, priority: .2 },
        { x: shift, y: bounds.bottom + 2.2, priority: .3 },
        { x: -shift, y: bounds.top - 2.2, priority: .4 },
        { x: shift, y: bounds.top - 2.2, priority: .5 },
        { x: bounds.left - node.name_width / 2 - .8, y: bounds.top - 2.2, priority: .6 },
        { x: bounds.right + node.name_width / 2 + .8, y: bounds.top - 2.2, priority: .7 }
      ];
      var best = null;
      candidates.forEach(function(candidate) {
        var label_x = center_x + candidate.x;
        var label_y = center_y + candidate.y;
        var box = { left: label_x - node.name_width / 2, right: label_x + node.name_width / 2,
          top: label_y - 1.6, bottom: label_y + 1.6 };
        var score = candidate.priority;
        terminals.forEach(function(terminal) {
          if(obj.boxesOverlap(box, terminal, .3)) {
            score += 10000;
          }
        });
        wire_paths.forEach(function(points) {
          for(var segment = 0; segment < points.length - 1; segment++) {
            if(obj.segmentIntersectsBox(points[segment], points[segment + 1], box, .4)) {
              score += 1000;
            }
          }
        });
        for(const other of obj.diagram_nodes.values()) {
          if(other === node) {
            continue;
          }
          var other_box = { left: other.component.placement.x + other.visual_bounds.left,
            right: other.component.placement.x + other.visual_bounds.right,
            top: -other.component.placement.y + other.visual_bounds.top,
            bottom: -other.component.placement.y + other.visual_bounds.bottom };
          if(obj.boxesOverlap(box, other_box, .8)) {
            score += 100;
          }
        }
        placed.forEach(function(other_box) {
          if(obj.boxesOverlap(box, other_box, .4)) {
            score += 100;
          }
        });
        if(!best || score < best.score) {
          best = { score: score, x: candidate.x, y: candidate.y, box: box };
        }
      });
      node.name_text.setAttribute('x', best.x);
      node.name_text.setAttribute('y', best.y);
      node.label_bounds = best.box;
      placed.push(best.box);
    }
  }

  /**
   * Draws current connections and installs their editing interactions.
   */
  drawDiagramWires() {
    var obj = this;
    var wire_layer = document.getElementById('simulate-wire-layer');
    wire_layer.replaceChildren();
    if(!obj.model) {
      return;
    }
    var namespace = 'http://www.w3.org/2000/svg';
    var wire_paths = [];
    obj.model.connections.forEach(function(connection) {
      var from = obj.portPosition(connection.from);
      var to = obj.portPosition(connection.to);
      if(!from || !to) {
        return;
      }
      var key = obj.connectionKey(connection);
      var points = obj.connectionWirePoints(connection, from, to);
      wire_paths.push(points);
      var wire = document.createElementNS(namespace, 'path');
      wire.setAttribute('class', 'simulate-connection' + (key === obj.selected_connection ? ' selected' : ''));
      wire.dataset.connection = key;
      wire.setAttribute('d', obj.roundedWirePath(points));
      if(connection.color && connection.color.length === 3) {
        wire.style.stroke = 'rgb(' + connection.color.join(',') + ')';
      }
      var title = document.createElementNS(namespace, 'title');
      title.textContent = connection.from + ' ↔ ' + connection.to;
      wire.appendChild(title);
      var hit = document.createElementNS(namespace, 'path');
      hit.setAttribute('class', 'simulate-connection-hit');
      hit.dataset.connection = key;
      hit.setAttribute('d', obj.roundedWirePath(points));
      hit.addEventListener('pointerdown', function(event) {
        obj.startWireDrag(event, connection, points);
      });
      wire_layer.append(wire, hit);
      if(key === obj.selected_connection && !connection.inherited) {
        points.slice(1, -1).forEach(function(point) {
          var handle = document.createElementNS(namespace, 'circle');
          handle.setAttribute('class', 'simulate-wire-handle');
          handle.setAttribute('cx', point.x);
          handle.setAttribute('cy', point.y);
          handle.setAttribute('r', 1.4);
          wire_layer.appendChild(handle);
        });
        for(var index = 0; index < points.length - 1; index++) {
          var segment_element = document.createElementNS(namespace, 'line');
          var horizontal = Math.abs(points[index].y - points[index + 1].y) < 1e-9;
          segment_element.setAttribute('class', 'simulate-wire-segment ' + (horizontal ? 'horizontal' : 'vertical'));
          segment_element.setAttribute('x1', points[index].x);
          segment_element.setAttribute('y1', points[index].y);
          segment_element.setAttribute('x2', points[index + 1].x);
          segment_element.setAttribute('y2', points[index + 1].y);
          segment_element.addEventListener('pointerdown', function(segment_index) {
            return function(event) {
              obj.startWireDrag(event, connection, points, segment_index);
            };
          }(index));
          wire_layer.appendChild(segment_element);
        }
      }
    });
    obj.positionComponentLabels(wire_paths);
  }

  /**
   * Fits the complete diagram inside the available viewport.
   */
  fitDiagram() {
    var obj = this;
    var svg = document.getElementById('simulate-diagram-svg');
    var layer = document.getElementById('simulate-diagram-layer');
    if(!svg.clientWidth || !svg.clientHeight) {
      return false;
    }
    if(!obj.diagram_nodes.size) {
      obj.diagram_view = { x: svg.clientWidth / 2, y: svg.clientHeight / 2, scale: 4 };
      obj.diagram_fitted = true;
      obj.updateDiagramTransform();
      return false;
    }
    var previous_transform = layer.getAttribute('transform');
    layer.removeAttribute('transform');
    var bounds = layer.getBBox();
    if(previous_transform) {
      layer.setAttribute('transform', previous_transform);
    }
    if(!bounds.width || !bounds.height) {
      return false;
    }
    var browser = document.getElementById('simulate-browser');
    var browser_bounds = browser.getBoundingClientRect();
    var svg_bounds = svg.getBoundingClientRect();
    var left_inset = Math.max(0, browser_bounds.right - svg_bounds.left + 12);
    var margin = 36;
    var available_width = Math.max(1, svg.clientWidth - left_inset);
    obj.diagram_view.scale = Math.max(0.02, Math.min(8, Math.min(
      (available_width - margin * 2) / bounds.width,
      (svg.clientHeight - margin * 2) / bounds.height
    )));
    obj.diagram_view.x = left_inset + available_width / 2 -
      (bounds.x + bounds.width / 2) * obj.diagram_view.scale;
    obj.diagram_view.y = svg.clientHeight / 2 - (bounds.y + bounds.height / 2) * obj.diagram_view.scale;
    obj.diagram_viewport = obj.currentDiagramViewport();
    obj.diagram_fitted = true;
    obj.updateDiagramTransform();
    return true;
  }

  /**
   * Changes diagram zoom while preserving its visible center.
   */
  zoomDiagram(factor) {
    var obj = this;
    var svg = document.getElementById('simulate-diagram-svg');
    var x = svg.clientWidth / 2;
    var y = svg.clientHeight / 2;
    var next = Math.max(.1, Math.min(12, obj.diagram_view.scale * factor));
    obj.diagram_view.x = x - (x - obj.diagram_view.x) * next / obj.diagram_view.scale;
    obj.diagram_view.y = y - (y - obj.diagram_view.y) * next / obj.diagram_view.scale;
    obj.diagram_view.scale = next;
    obj.diagram_fitted = true;
    obj.updateDiagramTransform();
  }

  /**
   * Converts client pointer coordinates to model diagram coordinates.
   */
  diagramPoint(client_x, client_y) {
    var obj = this;
    var bounds = document.getElementById('simulate-diagram-svg').getBoundingClientRect();
    return {
      x: (client_x - bounds.left - obj.diagram_view.x) / obj.diagram_view.scale,
      y: (client_y - bounds.top - obj.diagram_view.y) / obj.diagram_view.scale
    };
  }
}

exports.PRDC_JSLAB_SIMULATE_DIAGRAM = PRDC_JSLAB_SIMULATE_DIAGRAM;
