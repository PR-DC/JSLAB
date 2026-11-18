/**
 * @file Simulate diagram pointer and keyboard interaction
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


/**
 * Implements diagram pointer and keyboard interaction against the owning Simulate window state.
 */
class PRDC_JSLAB_SIMULATE_INTERACTION {

  /**
   * Connects controls for diagram pointer and keyboard interaction.
   */
  _bindInteractionEvents() {

    var obj = this;
    obj.diagram_svg.addEventListener('pointerdown', function(event) {
      if(event.target.closest('.simulate-component')) {
        return;
      }
      if(event.button !== 0 && event.button !== 1) {
        return;
      }
      if(obj.selected_connection) {
        obj.selected_connection = '';
        obj.drawDiagramWires();
      }
      if(event.button === 1 || obj.diagram_space_pressed) {
        obj.diagram_drag = { kind: 'pan', pointer: event.pointerId, x: event.clientX, y: event.clientY,
          start_x: obj.diagram_view.x, start_y: obj.diagram_view.y, moved: false };
        obj.diagram_svg.classList.add('panning');
        return;
      }
      var additive = event.ctrlKey || event.metaKey || event.shiftKey;
      if(!additive) {
        obj.selected_components.clear();
      }
      obj.updateComponentSelection();
      var box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      box.setAttribute('class', 'simulate-selection-box');
      document.getElementById('simulate-component-layer').appendChild(box);
      obj.diagram_drag = {
        kind: 'selection', pointer: event.pointerId, x: event.clientX, y: event.clientY,
        start_point: obj.diagramPoint(event.clientX, event.clientY),
        base_selection: additive ? new Set(obj.selected_components) : new Set(), box: box, moved: false
      };
    });

    obj.diagram_svg.addEventListener('wheel', function(event) {
      event.preventDefault();
      var bounds = obj.diagram_svg.getBoundingClientRect();
      var x = event.clientX - bounds.left;
      var y = event.clientY - bounds.top;
      var next = Math.max(0.1, Math.min(12, obj.diagram_view.scale * Math.exp(-event.deltaY * 0.0015)));
      obj.diagram_view.x = x - (x - obj.diagram_view.x) * next / obj.diagram_view.scale;
      obj.diagram_view.y = y - (y - obj.diagram_view.y) * next / obj.diagram_view.scale;
      obj.diagram_view.scale = next;
      obj.diagram_fitted = true;
      obj.updateDiagramTransform();
    }, { passive: false });

    window.addEventListener('pointermove', obj.diagramPointerMove.bind(obj));

    window.addEventListener('pointerup', obj.diagramPointerUp.bind(obj));

    window.addEventListener('pointercancel', obj.diagramPointerUp.bind(obj));

    window.addEventListener('keyup', function(event) {
      if(event.code === 'Space') {
        obj.diagram_space_pressed = false;
      }
    });

    window.addEventListener('keydown', function(event) {
      if(event.code === 'Space' && !(event.target && event.target.closest &&
          event.target.closest('input, textarea, select, .CodeMirror'))) {
        obj.diagram_space_pressed = true;
        event.preventDefault();
      }
      if(event.key === 'Escape' && !document.getElementById('simulate-simulation-dialog').hidden) {
        event.preventDefault();
        obj.hideSimulationSettings();
        return;
      }
      if(event.key === 'Escape' && !document.getElementById('simulate-parameters-dialog').hidden) {
        event.preventDefault();
        obj.hideParameters();
        return;
      }
      if(event.key === 'Escape' && !document.getElementById('simulate-component-dialog').hidden) {
        event.preventDefault();
        obj.hideComponentProperties();
        return;
      }
      if(event.key === 'Escape' && !document.getElementById('simulate-library-dialog').hidden) {
        event.preventDefault();
        obj.hideBlockLibrary();
        return;
      }
      if(event.key === 'Escape' && obj.selected_connection) {
        event.preventDefault();
        obj.selected_connection = '';
        obj.drawDiagramWires();
        return;
      }
      if(event.key === 'Escape' && obj.selected_components.size) {
        event.preventDefault();
        obj.selected_components.clear();
        obj.updateComponentSelection();
        return;
      }
      if((event.key === 'Delete' || event.key === 'Backspace') && obj.selected_connection &&
          !(event.target && event.target.closest && event.target.closest('input, textarea, select, .CodeMirror'))) {
        var selected_wire = obj.model && obj.model.connections.find(function(connection) {
          return obj.connectionKey(connection) === obj.selected_connection;
        });
        if(selected_wire) {
          event.preventDefault();
          obj.removeConnectionSource(selected_wire);
        }
        return;
      }
      if(event.key === 'Delete' && obj.selected_components.size && !obj.busy &&
          !(event.target && event.target.closest && event.target.closest('input, textarea, select, .simulate-dialog'))) {
        event.preventDefault();
        obj.deleteDiagramSelection();
      }
      if(event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        obj.saveModel(false);
      }
      if(event.ctrlKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        obj.openModel();
      }
      if(event.key === 'F5') {
        event.preventDefault();
        obj.runCompiler('simulate');
      }
    });
  }

  /**
   * Deletes selected blocks, their connections and their workspace bindings.
   */
  deleteDiagramSelection() {
    var obj = this;
    if(obj.busy || !obj.model) {
      return;
    }
    if(!obj.model.components.some(component => !component.inherited && obj.selected_components.has(component.name))) {
      return;
    }
    var selected = new Set(obj.model.components.filter(component => !component.inherited &&
      obj.selected_components.has(component.name)).map(component => component.name));
    var patches = [];
    obj.model.connections.forEach(function(connection) {
      if(connection.inherited) {
        return;
      }
      if(!selected.has(connection.from_component || connection.from.split('.')[0]) &&
          !selected.has(connection.to_component || connection.to.split('.')[0])) {
        return;
      }
      var range = obj.connectionSourceRange(connection);
      if(!range) {
        return;
      }
      if(Number.isInteger(connection.source_start)) {
        patches.push({ start: connection.source_start, end: connection.source_end, value: '' });
        return;
      }
      var lines = obj.editor.getValue().split('\n');
      var start = lines.slice(0, range.start).join('\n').length + (range.start ? 1 : 0);
      var end = lines.slice(0, range.end + 1).join('\n').length;
      patches.push({ start: start, end: end, value: '' });
    });
    var clauses = new Map();
    obj.model.components.forEach(function(component) {
      if(!selected.has(component.name)) {
        return;
      }
      if(component.inherited) {
        return;
      }
      var key = component.source_start + ':' + component.source_end;
      if(!clauses.has(key)) {
        var members = component.clause_members || [{ name: component.name,
          start: component.source_start, end: component.source_end }];
        var remaining = members.filter(item => !selected.has(item.name));
        var source = obj.editor.getValue();
        var replacement = '';
        if(remaining.length) {
          var removals = [];
          for(var index = 0; index < members.length; index++) {
            if(!selected.has(members[index].name)) {
              continue;
            }
            var first = index;
            while(index + 1 < members.length && selected.has(members[index + 1].name)) {
              index++;
            }
            removals.push({
              start: (index + 1 < members.length ? members[first].start : members[first].separator_before) - component.source_start,
              end: (index + 1 < members.length ? members[index + 1].separator_before + 1 : members[index].end) - component.source_start,
              value: ''
            });
          }
          replacement = obj.applySourcePatches(source.slice(component.source_start, component.source_end), removals);
        }
        clauses.set(key, { start: component.source_start, end: component.source_end, value: replacement });
      }
      Array.from(obj.component_bindings.keys()).forEach(function(key) {
        if(key.startsWith(component.name + '\u0000')) {
          obj.component_bindings.delete(key);
        }
      });
    });
    patches.push(...clauses.values());
    obj.selected_components.clear();
    obj.editor.setValue(obj.applySourcePatches(obj.editor.getValue(), patches));
  }

  /**
   * Starts moving one block or the current selected block group.
   */
  startComponentDrag(event, component, group) {
    var obj = this;
    if(event.button !== 0 || event.target.closest('.simulate-port')) {
      return;
    }
    event.stopPropagation();
    var additive = event.ctrlKey || event.metaKey || event.shiftKey;
    if(event.ctrlKey || event.metaKey) {
      obj.selectComponent(component.name, true, true);
      if(!obj.selected_components.has(component.name)) {
        return;
      }
    } else if(!obj.selected_components.has(component.name)) {
      obj.selectComponent(component.name, additive, false);
    } else {
      obj.selected_connection = '';
      obj.drawDiagramWires();
    }
    if(component.inherited) {
      return;
    }
    var components = Array.from(obj.selected_components).map(function(name) {
      var node = obj.diagram_nodes.get(name);
      return node && !node.component.inherited && {
        component: node.component, group: node.group,
        start_x: node.component.placement.x, start_y: node.component.placement.y
      };
    }).filter(Boolean);
    var moving = new Set(components.map(item => item.component.name));
    obj.diagram_drag = {
      kind: 'component', pointer: event.pointerId, x: event.clientX, y: event.clientY,
      components: components, moved: false,
      connections: obj.model.connections.filter(function(connection) {
        return !connection.inherited && obj.portPosition(connection.from) && obj.portPosition(connection.to) &&
          (moving.has(connection.from_component || connection.from.split('.')[0]) ||
          moving.has(connection.to_component || connection.to.split('.')[0]));
      }).map(function(connection) {
        return { connection: connection, points: obj.connectionWirePoints(connection,
          obj.portPosition(connection.from), obj.portPosition(connection.to)),
          move_from: moving.has(connection.from_component || connection.from.split('.')[0]),
          move_to: moving.has(connection.to_component || connection.to.split('.')[0]) };
      })
    };
    components.forEach(function(item) {
      item.group.classList.add('dragging');
    });
  }

  /**
   * Starts a new connection from a diagram connector.
   */
  startConnectionDrag(event) {
    var obj = this;
    if(event.button !== 0) {
      return;
    }
    event.stopPropagation();
    obj.connection_drag = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY,
      source: event.currentTarget, reference: event.currentTarget.dataset.reference,
      moved: false, preview: null, target: null
    };
  }

  /**
   * Writes an edited block position back to its placement annotation.
   */
  updatePlacementSource(components, connections = []) {
    var obj = this;
    var list = Array.isArray(components) ? components : [components];
    var patches = [];
    list.forEach(function(component) {
      if(component.inherited) {
        return;
      }
      var placement = component.placement;
      var origin = '{' + Math.round(placement.x * 1000) / 1000 + ', ' + Math.round(placement.y * 1000) / 1000 + '}';
      if(placement.origin_range) {
        patches.push({ start: placement.origin_range.start, end: placement.origin_range.end, value: origin });
      } else if(Number.isInteger(placement.origin_insert)) {
        patches.push({ start: placement.origin_insert, end: placement.origin_insert,
          value: placement.origin_separator + (placement.origin_prefix || 'origin = ') + origin + (placement.origin_suffix || '') });
      }
    });
    connections.forEach(function(connection) {
      var patch = obj.connectionSourcePatch(connection);
      if(patch) {
        patches.push(patch);
      }
    });
    if(patches.length) {
      obj.editor.setValue(obj.applySourcePatches(obj.editor.getValue(), patches));
      return;
    }
    // Older parsed documents may contain only line locations.
    var component = list[0];
    if(!component || component.inherited) {
      return;
    }
    var start = Math.max(0, component.line - 1);
    var end = start;
    while(end < obj.editor.lineCount() - 1 && end < start + 100 && !/;\s*$/.test(obj.editor.getLine(end))) {
      end++;
    }
    var text = obj.editor.getRange({ line: start, ch: 0 }, { line: end, ch: obj.editor.getLine(end).length });
    var replacement = text.replace(/\borigin\s*=\s*\{\s*-?[\d.eE+]+\s*,\s*-?[\d.eE+]+\s*\}/i,
      'origin = {' + Math.round(component.placement.x * 1000) / 1000 + ', ' + Math.round(component.placement.y * 1000) / 1000 + '}');
    if(replacement !== text) {
      obj.editor.replaceRange(replacement, { line: start, ch: 0 }, { line: end, ch: obj.editor.getLine(end).length }, '+simulate-diagram');
    }
  }

  /**
   * Updates the active block, wire, selection or viewport drag.
   */
  diagramPointerMove(event) {
    var obj = this;
    if(obj.wire_drag && obj.wire_drag.pointer === event.pointerId) {
      var wire_dx = event.clientX - obj.wire_drag.x;
      var wire_dy = event.clientY - obj.wire_drag.y;
      if(Math.abs(wire_dx) + Math.abs(wire_dy) < 3 && !obj.wire_drag.moved) {
        return;
      }
      obj.wire_drag.moved = true;
      var moved_points = obj.wire_drag.points.map(function(point) {
        return { x: point.x, y: point.y };
      });
      var first = moved_points[obj.wire_drag.segment];
      var second = moved_points[obj.wire_drag.segment + 1];
      if(obj.wire_drag.horizontal) {
        var y = Math.round((first.y + wire_dy / obj.diagram_view.scale) / 2) * 2;
        first.y = y;
        second.y = y;
      } else {
        var x = Math.round((first.x + wire_dx / obj.diagram_view.scale) / 2) * 2;
        first.x = x;
        second.x = x;
      }
      obj.wire_drag.connection.points = moved_points.map(function(point) {
        return [point.x || 0, -point.y || 0];
      });
      obj.drawDiagramWires();
      return;
    }
    if(obj.connection_drag && obj.connection_drag.pointer === event.pointerId) {
      if(Math.abs(event.clientX - obj.connection_drag.x) + Math.abs(event.clientY - obj.connection_drag.y) < 3 && !obj.connection_drag.moved) {
        return;
      }
      obj.connection_drag.moved = true;
      if(!obj.connection_drag.preview) {
        obj.connection_drag.preview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        obj.connection_drag.preview.setAttribute('class', 'simulate-connection-preview');
        document.getElementById('simulate-wire-layer').appendChild(obj.connection_drag.preview);
      }
      if(obj.connection_drag.target) {
        obj.connection_drag.target.classList.remove('connection-target');
      }
      var target = document.elementFromPoint(event.clientX, event.clientY);
      obj.connection_drag.target = target && target.closest ? target.closest('.simulate-port') : null;
      if(obj.connection_drag.target === obj.connection_drag.source) {
        obj.connection_drag.target = null;
      }
      if(obj.connection_drag.target) {
        obj.connection_drag.target.classList.add('connection-target');
      }
      var from = obj.portPosition(obj.connection_drag.reference);
      var to = obj.diagramPoint(event.clientX, event.clientY);
      if(from) {
        obj.connection_drag.preview.setAttribute('d', obj.roundedWirePath(obj.initialWirePoints(from, to)));
      }
      return;
    }
    if(!obj.diagram_drag || obj.diagram_drag.pointer !== event.pointerId) {
      return;
    }
    var dx = event.clientX - obj.diagram_drag.x;
    var dy = event.clientY - obj.diagram_drag.y;
    if(Math.abs(dx) + Math.abs(dy) < 3 && !obj.diagram_drag.moved) {
      return;
    }
    obj.diagram_drag.moved = true;
    if(obj.diagram_drag.kind === 'component') {
      var grid = 2;
      obj.diagram_drag.components.forEach(function(item) {
        item.component.placement.x = Math.round((item.start_x + dx / obj.diagram_view.scale) / grid) * grid;
        item.component.placement.y = Math.round((item.start_y - dy / obj.diagram_view.scale) / grid) * grid;
        item.group.setAttribute('transform', 'translate(' + item.component.placement.x + ' ' + (-item.component.placement.y) + ')');
      });
      obj.diagram_drag.connections.forEach(function(item) {
        item.connection.points = obj.moveWireEndpoints(item.points,
          item.move_from ? obj.portPosition(item.connection.from) : item.points[0],
          item.move_to ? obj.portPosition(item.connection.to) : item.points[item.points.length - 1])
          .map(point => [point.x || 0, -point.y || 0]);
      });
      obj.drawDiagramWires();
    } else if(obj.diagram_drag.kind === 'selection') {
      var selection_point = obj.diagramPoint(event.clientX, event.clientY);
      var left = Math.min(obj.diagram_drag.start_point.x, selection_point.x);
      var right = Math.max(obj.diagram_drag.start_point.x, selection_point.x);
      var top = Math.min(obj.diagram_drag.start_point.y, selection_point.y);
      var bottom = Math.max(obj.diagram_drag.start_point.y, selection_point.y);
      obj.diagram_drag.box.setAttribute('x', left);
      obj.diagram_drag.box.setAttribute('y', top);
      obj.diagram_drag.box.setAttribute('width', right - left);
      obj.diagram_drag.box.setAttribute('height', bottom - top);
      obj.selected_components = new Set(obj.diagram_drag.base_selection);
      obj.diagram_nodes.forEach(function(node, name) {
        var x = node.component.placement.x;
        var y = -node.component.placement.y;
        if(x + node.width / 2 >= left && x - node.width / 2 <= right &&
            y + node.height / 2 >= top && y - node.height / 2 <= bottom) {
          obj.selected_components.add(name);
        }
      });
      obj.updateComponentSelection();
    } else {
      obj.diagram_view.x = obj.diagram_drag.start_x + dx;
      obj.diagram_view.y = obj.diagram_drag.start_y + dy;
      obj.updateDiagramTransform();
    }
  }

  /**
   * Finishes the active diagram interaction and persists its edits.
   */
  diagramPointerUp(event) {
    var obj = this;
    if(obj.wire_drag && obj.wire_drag.pointer === event.pointerId) {
      var edited_wire = obj.wire_drag;
      obj.wire_drag = null;
      if(edited_wire.moved) {
        obj.updateConnectionSource(edited_wire.connection);
      }
      return;
    }
    if(obj.connection_drag && obj.connection_drag.pointer === event.pointerId) {
      var connection = obj.connection_drag;
      if(connection.target) {
        connection.target.classList.remove('connection-target');
      }
      if(connection.preview) {
        connection.preview.remove();
      }
      obj.connection_drag = null;
      if(connection.moved && connection.target) {
        obj.addSimulateConnection(connection.reference, connection.target.dataset.reference);
      }
      return;
    }
    if(!obj.diagram_drag || obj.diagram_drag.pointer !== event.pointerId) {
      return;
    }
    var drag = obj.diagram_drag;
    obj.diagram_drag = null;
    (drag.components || []).forEach(function(item) {
      item.group.classList.remove('dragging');
    });
    if(drag.box) {
      drag.box.remove();
    }
    document.getElementById('simulate-diagram-svg').classList.remove('panning');
    if(drag.moved && drag.kind === 'component') {
      obj.updatePlacementSource(drag.components.map(item => item.component), drag.connections.map(item => item.connection));
    }
  }
}

exports.PRDC_JSLAB_SIMULATE_INTERACTION = PRDC_JSLAB_SIMULATE_INTERACTION;
