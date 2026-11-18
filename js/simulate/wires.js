/**
 * @file Simulate wire routing and connection source editing
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


/**
 * Implements wire routing and connection source editing against the owning Simulate window state.
 */
class PRDC_JSLAB_SIMULATE_WIRES {

  /**
   * Connects controls for wire routing and connection source editing.
   */
  _bindWiresEvents() {

    var obj = this;

  }

  /**
   * Builds a stable identity for a pair of connected references.
   */
  connectionKey(connection) {
    return String(connection.from) + '\u0000' + String(connection.to);
  }

  /**
   * Removes duplicate and collinear points from a wire route.
   */
  simplifyWirePoints(points) {
    var simplified = [];
    points.forEach(function(point) {
      point = { x: Number(point.x), y: Number(point.y) };
      var last = simplified[simplified.length - 1];
      if(last && Math.abs(last.x - point.x) < 1e-9 && Math.abs(last.y - point.y) < 1e-9) {
        return;
      }
      simplified.push(point);
      while(simplified.length >= 3) {
        var a = simplified[simplified.length - 3];
        var b = simplified[simplified.length - 2];
        var c = simplified[simplified.length - 1];
        if(Math.abs(a.x - b.x) < 1e-9 && Math.abs(b.x - c.x) < 1e-9 ||
            Math.abs(a.y - b.y) < 1e-9 && Math.abs(b.y - c.y) < 1e-9) {
          simplified.splice(simplified.length - 2, 1);
        } else {
          break;
        }
      }
    });
    return simplified;
  }

  /**
   * Converts successive wire points into horizontal and vertical segments.
   */
  orthogonalWirePoints(points) {
    var obj = this;
    var orthogonal = [];
    points.forEach(function(point) {
      point = { x: Number(point.x), y: Number(point.y) };
      var previous = orthogonal[orthogonal.length - 1];
      if(previous && Math.abs(previous.x - point.x) > 1e-9 && Math.abs(previous.y - point.y) > 1e-9) {
        var before = orthogonal[orthogonal.length - 2];
        var vertical = before && Math.abs(before.x - previous.x) < 1e-9;
        orthogonal.push(vertical ? { x: previous.x, y: point.y } : { x: point.x, y: previous.y });
      }
      orthogonal.push(point);
    });
    return obj.simplifyWirePoints(orthogonal);
  }

  /**
   * Creates a route when the user adds a connection.
   */
  initialWirePoints(from, to) {
    var obj = this;
    if(Math.abs(from.x - to.x) < 1e-9 || Math.abs(from.y - to.y) < 1e-9) {
      return [from, to];
    }
    var middle = (from.x + to.x) / 2;
    return obj.simplifyWirePoints([from, { x: middle, y: from.y }, { x: middle, y: to.y }, to]);
  }

  /**
   * Reads the saved route without rearranging its bends during rendering.
   */
  connectionWirePoints(connection, from, to) {
    if(connection.points && connection.points.length > 1) {
      return connection.points.map(point => ({ x: Number(point[0]), y: -Number(point[1]) }));
    }
    return [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
  }

  /**
   * Moves attached endpoints during a user block drag while retaining the other bends.
   */
  moveWireEndpoints(points, from, to) {
    var moved = points.map(point => ({ x: point.x, y: point.y }));
    var first = moved[0], last = moved[moved.length - 1];
    if(moved.length == 2) {
      var horizontal = Math.abs(first.y - last.y) < 1e-9;
      return this.simplifyWirePoints([from,
        horizontal ? { x: to.x, y: from.y } : { x: from.x, y: to.y }, to]);
    }
    var next = moved[1], previous = moved[moved.length - 2];
    if(Math.abs(first.x - next.x) < 1e-9) {
      next.x = from.x;
    } else if(Math.abs(first.y - next.y) < 1e-9) {
      next.y = from.y;
    }
    if(Math.abs(last.x - previous.x) < 1e-9) {
      previous.x = to.x;
    } else if(Math.abs(last.y - previous.y) < 1e-9) {
      previous.y = to.y;
    }
    moved[0] = { x: from.x, y: from.y };
    moved[moved.length - 1] = { x: to.x, y: to.y };
    return moved;
  }

  /**
   * Builds an SVG wire path with rounded orthogonal corners.
   */
  roundedWirePath(points, radius = 2.5) {
    if(!points.length) {
      return '';
    }
    var path = 'M' + points[0].x + ' ' + points[0].y;
    for(var index = 1; index < points.length - 1; index++) {
      var previous = points[index - 1];
      var point = points[index];
      var next = points[index + 1];
      var incoming = Math.hypot(point.x - previous.x, point.y - previous.y);
      var outgoing = Math.hypot(next.x - point.x, next.y - point.y);
      if(!incoming || !outgoing) {
        continue;
      }
      var corner = Math.min(radius, incoming / 3, outgoing / 3);
      var before = {
        x: point.x - (point.x - previous.x) / incoming * corner,
        y: point.y - (point.y - previous.y) / incoming * corner
      };
      var after = {
        x: point.x + (next.x - point.x) / outgoing * corner,
        y: point.y + (next.y - point.y) / outgoing * corner
      };
      path += 'L' + before.x + ' ' + before.y + 'Q' + point.x + ' ' + point.y + ' ' + after.x + ' ' + after.y;
    }
    var last = points[points.length - 1];
    return path + 'L' + last.x + ' ' + last.y;
  }

  /**
   * Measures the distance from a point to a line segment.
   */
  segmentDistance(point, a, b) {
    if(Math.abs(a.x - b.x) < 1e-9) {
      return Math.hypot(point.x - a.x,
        Math.max(Math.min(a.y, b.y) - point.y, 0, point.y - Math.max(a.y, b.y)));
    }
    return Math.hypot(
      Math.max(Math.min(a.x, b.x) - point.x, 0, point.x - Math.max(a.x, b.x)), point.y - a.y);
  }

  /**
   * Finds the closest editable segment in a wire route.
   */
  nearestWireSegment(points, point) {
    var obj = this;
    var best = 0;
    var distance = Infinity;
    for(var index = 0; index < points.length - 1; index++) {
      var candidate = obj.segmentDistance(point, points[index], points[index + 1]);
      if(candidate < distance) {
        distance = candidate;
        best = index;
      }
    }
    return best;
  }

  /**
   * Begins dragging a selected orthogonal wire segment.
   */
  startWireDrag(event, connection, points, segment) {
    var obj = this;
    if(event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    obj.selected_components.clear();
    obj.updateComponentSelection();
    obj.selected_connection = obj.connectionKey(connection);
    if(connection.inherited) {
      obj.drawDiagramWires();
      return;
    }
    var working = points.map(function(point) {
      return { x: point.x, y: point.y };
    });
    if(segment == null) {
      segment = obj.nearestWireSegment(working, obj.diagramPoint(event.clientX, event.clientY));
    }
    if(working.length === 2) {
      working = [working[0], { x: working[0].x, y: working[0].y },
        { x: working[1].x, y: working[1].y }, working[1]];
      segment = 1;
    } else if(segment === 0) {
      working.splice(1, 0, { x: working[0].x, y: working[0].y });
      segment = 1;
    } else if(segment === working.length - 2) {
      working.splice(working.length - 1, 0, {
        x: working[working.length - 1].x, y: working[working.length - 1].y
      });
    }
    var horizontal = Math.abs(working[segment].y - working[segment + 1].y) <=
      Math.abs(working[segment].x - working[segment + 1].x);
    obj.wire_drag = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY,
      connection: connection, points: working, segment: segment,
      horizontal: horizontal, moved: false
    };
    obj.drawDiagramWires();
  }

  /**
   * Checks whether a wire segment intersects an expanded component bound.
   */
  segmentIntersectsBox(a, b, box, margin = 2.4) {
    var left = box.left - margin, right = box.right + margin;
    var top = box.top - margin, bottom = box.bottom + margin;
    if(Math.abs(a.y - b.y) < 1e-9) {
      return a.y >= top && a.y <= bottom && Math.max(a.x, b.x) >= left && Math.min(a.x, b.x) <= right;
    }
    if(Math.abs(a.x - b.x) < 1e-9) {
      return a.x >= left && a.x <= right && Math.max(a.y, b.y) >= top && Math.min(a.y, b.y) <= bottom;
    }
    var dx = b.x - a.x, dy = b.y - a.y;
    if(a.x >= left && a.x <= right && a.y >= top && a.y <= bottom ||
        b.x >= left && b.x <= right && b.y >= top && b.y <= bottom) {
      return true;
    }
    for(const edge of [left, right]) {
      var t = (edge - a.x) / dx;
      var y = a.y + t * dy;
      if(t >= 0 && t <= 1 && y >= top && y <= bottom) {
        return true;
      }
    }
    for(const edge of [top, bottom]) {
      var t = (edge - a.y) / dy;
      var x = a.x + t * dx;
      if(t >= 0 && t <= 1 && x >= left && x <= right) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks whether two diagram bounds overlap with the requested clearance.
   */
  boxesOverlap(a, b, margin = 1.2) {
    return a.left < b.right + margin && a.right > b.left - margin &&
      a.top < b.bottom + margin && a.bottom > b.top - margin;
  }

  /**
   * Locates the source range of a connection and its annotation.
   */
  connectionSourceRange(connection) {
    var obj = this;
    if(connection.inherited) {
      return null;
    }
    var start = Math.min(obj.editor.lineCount() - 1, Math.max(0, Number(connection.line || 1) - 1));
    while(start > 0 && !/\bconnect\s*\(/.test(obj.editor.getLine(start))) {
      start--;
    }
    if(!/\bconnect\s*\(/.test(obj.editor.getLine(start) || '')) {
      return null;
    }
    var end = start;
    while(end < obj.editor.lineCount() - 1 && end < start + 100 && !/;\s*$/.test(obj.editor.getLine(end))) {
      end++;
    }
    return { start: start, end: end };
  }

  /**
   * Creates a source patch for an explicitly edited connection route.
   */
  connectionSourcePatch(connection) {
    if(connection.inherited) {
      return null;
    }
    var source = this.editor.getValue();
    var start = connection.source_start, end = connection.source_end;
    if(!Number.isInteger(start)) {
      var range = this.connectionSourceRange(connection);
      if(!range) {
        return null;
      }
      var lines = source.split('\n');
      start = lines.slice(0, range.start).join('\n').length + (range.start ? 1 : 0);
      end = lines.slice(0, range.end + 1).join('\n').length;
    }
    var points = '{' + connection.points.map(function(point) {
      return '{' + point.map(value => String(Math.round(Number(value) * 1000) / 1000)).join(', ') + '}';
    }).join(', ') + '}';
    if(connection.points_range) {
      return { start: connection.points_range.start, end: connection.points_range.end, value: points };
    }
    if(Number.isInteger(connection.line_insert)) {
      return { start: connection.line_insert, end: connection.line_insert,
        value: connection.line_separator + 'points = ' + points };
    }
    if(Number.isInteger(connection.annotation_insert)) {
      return { start: connection.annotation_insert, end: connection.annotation_insert,
        value: connection.annotation_separator + 'Line(points = ' + points + ')' };
    }
    var text = source.slice(start, end);
    var pattern = /\bpoints\s*=\s*\{\s*(?:\{\s*-?[\d.eE+]+\s*,\s*-?[\d.eE+]+\s*\}\s*,?\s*)+\}/i;
    var replacement = text.replace(pattern, 'points = ' + points);
    if(replacement === text) {
      if(/\bLine\s*\(/.test(text)) {
        replacement = text.replace(/\bLine\s*\(/, 'Line(points = ' + points + ', ');
      } else if(/\bannotation\s*\(/.test(text)) {
        replacement = text.replace(/\bannotation\s*\(/, 'annotation(Line(points = ' + points + '), ');
      } else {
        var semicolon = text.lastIndexOf(';');
        replacement = text.slice(0, semicolon) + ' annotation(Line(points = ' + points + '))' + text.slice(semicolon);
      }
    }
    return { start: start, end: end, value: replacement };
  }

  /**
   * Persists a user wire edit in its source annotation, creating it when absent.
   */
  updateConnectionSource(connection) {
    var patch = this.connectionSourcePatch(connection);
    if(patch) {
      this.editor.setValue(this.applySourcePatches(this.editor.getValue(), [patch]));
    }
  }

  /**
   * Removes the selected connection from the model source.
   */
  removeConnectionSource(connection) {
    var obj = this;
    var range = obj.connectionSourceRange(connection);
    if(!range) {
      return;
    }
    if(Number.isInteger(connection.source_start)) {
      obj.selected_connection = '';
      obj.editor.setValue(obj.applySourcePatches(obj.editor.getValue(), [{
        start: connection.source_start, end: connection.source_end, value: '' }]));
      return;
    }
    var end_ch = obj.editor.getLine(range.end).length;
    if(range.end < obj.editor.lineCount() - 1) {
      range.end++;
      end_ch = 0;
    }
    obj.selected_connection = '';
    obj.editor.replaceRange('', { line: range.start, ch: 0 }, { line: range.end, ch: end_ch }, '+simulate-wire');
  }

  /**
   * Adds a validated connection between two block connectors.
   */
  addSimulateConnection(from, to) {
    var obj = this;
    if(!from || !to || from === to) {
      return;
    }
    if(obj.model.connections.some(function(connection) {
      return connection.from === from && connection.to === to || connection.from === to && connection.to === from;
    })) {
      return;
    }
    var lines = obj.editor.getValue().split('\n');
    var end_pattern = new RegExp('^\\s*end\\s+' + obj.model.name.replace(/[$]/g, '\\$&') + '\\s*;');
    var end = -1;
    for(var index = lines.length - 1; index >= 0; index--) {
      if(end_pattern.test(lines[index])) {
        end = index;
        break;
      }
    }
    if(end < 0) {
      return;
    }
    var equation = lines.findIndex(function(line) {
      return /^\s*equation\s*$/.test(line);
    });
    if(equation < 0 || equation > end) {
      lines.splice(end, 0, 'equation');
      end++;
    }
    var insertion = end;
    for(index = end - 1; index > equation; index--) {
      if(/^\s*annotation\s*\(/.test(lines[index])) {
        insertion = index;
      } else if(lines[index].trim()) {
        break;
      }
    }
    var from_position = obj.portPosition(from) || { x: 0, y: 0 };
    var to_position = obj.portPosition(to) || { x: 0, y: 0 };
    var route = obj.initialWirePoints(from_position, to_position);
    var route_source = route.map(function(point) {
      return '{' + point.x + ', ' + (-point.y) + '}';
    }).join(', ');
    var connection_source = '  connect(' + from + ', ' + to + ') annotation(\n' +
      '    Line(points = {' + route_source + '}));\n';
    obj.editor.replaceRange(connection_source, { line: insertion, ch: 0 }, null, '+simulate-diagram');
  }
}

exports.PRDC_JSLAB_SIMULATE_WIRES = PRDC_JSLAB_SIMULATE_WIRES;
