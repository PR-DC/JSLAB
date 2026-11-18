/**
 * @file Safe Modelica graphical annotation reader and SVG renderer
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  readMetadata
} = require('./assets');
const {
  translatedIconText
} = require('./localization');
/**
 * Class for parsing and rendering compiler annotation geometry.
 */
class PRDC_OMJSL_ANNOTATIONS {

  /**
   * Parse scripting annotation values and constructor records without evaluating code.
   * @param {*} source Original compiler source text.
   */
  static parseAnnotation(source) {
    var index = 0;
    var skip = function() {
      while(/\s/.test(source[index] || '')) {
        index++;
      }
    };
    var list = function(closing) {
      var values = [];
      skip();
      while(index < source.length && source[index] != closing) {
        values.push(read());
        skip();
        if(source[index] != ',') {
          break;
        }
        index++;
      }
      if(source[index] != closing) {
        throw new Error('Invalid graphical annotation.');
      }
      index++;
      return values;
    };
    var read = function() {
      skip();
      if(source[index] == '{') {
        index++;
        return list('}');
      }
      if(source[index] == '"') {
        index++;
        var value = '';
        while(index < source.length) {
          var character = source[index++];
          if(character == '"') {
            return value;
          }
          if(character == '\\') {
            var escaped = source[index++];
            value += {
              n: '\n',
              r: '\r',
              t: '\t',
              b: '\b',
              f: '\f'
            }[escaped] || escaped;
          } else {
            value += character;
          }
        }
        throw new Error('Unterminated annotation string.');
      }
      var start = index;
      while(index < source.length && !/[\s,{}()]/.test(source[index])) {
        index++;
      }
      var token = source.slice(start, index);
      skip();
      if(token == 'not') {
        return {
          operator: 'not',
          value: read()
        };
      }
      if(source[index] == '(') {
        index++;
        if(token == 'DynamicSelect') {
          // Editing uses the static argument; the dynamic expression is simulation-only.
          var static_value = read();
          var depth = 1,
            quoted = false;
          while(index < source.length && depth) {
            var character = source[index++];
            if(quoted) {
              if(character == '\\') {
                index++;
              } else if(character == '"') {
                quoted = false;
              }
            } else if(character == '"') {
              quoted = true;
            } else if(character == '(') {
              depth++;
            } else if(character == ')') {
              depth--;
            }
          }
          if(depth) {
            throw new Error('Unterminated dynamic annotation.');
          }
          return static_value;
        }
        return {
          kind: token,
          values: list(')')
        };
      }
      if(token == 'true') {
        return true;
      }
      if(token == 'false') {
        return false;
      }
      if(token && Number.isFinite(Number(token))) {
        return Number(token);
      }
      return token;
    };
    return read();
  }

  /**
   * Modelica splines join segment midpoints using the original vertices as controls.
   * @param {*} points Points.
   * @param {*} closed Closed.
   */
  static bezierPath(points, closed) {
    var values = points.map(function(point) {
      return [Number(point[0]) || 0, Number(point[1]) || 0];
    });
    if(closed && values.length > 1 && values[0].join(',') == values[values.length - 1].join(',')) {
      values.pop();
    }
    if(values.length < 2) {
      return '';
    }
    var midpoint = function(a, b) {
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2].join(',');
    };
    if(closed) {
      var path = 'M' + midpoint(values[values.length - 1], values[0]);
      values.forEach(function(value, index) {
        path += ' Q' + value.join(',') + ' ' + midpoint(value, values[(index + 1) % values.length]);
      });
      return path + ' Z';
    }
    var path = 'M' + values[0].join(',') + ' L' + midpoint(values[0], values[1]);
    for(var index = 1; index < values.length - 1; index++) {
      path += ' Q' + values[index].join(',') + ' ' + midpoint(values[index], values[index + 1]);
    }
    return path + ' L' + values[values.length - 1].join(',');
  }

  /**
   * Fit automatic font sizes to the complete multiline extent. Widths use a 100px font.
   * @param {*} width Width.
   * @param {*} height Height.
   * @param {*} lineWidths LineWidths.
   * @param {*} requested Requested.
   * @param {*} fontHeight FontHeight.
   */
  static annotationTextSize(width, height, lineWidths, requested, fontHeight = 115) {
    if(requested > 0) {
      return requested;
    }
    var size = height > 0 ? height * 100 / (fontHeight + Math.max(0, lineWidths.length - 1) * 115) : 100;
    var widest = Math.max(0, ...lineWidths);
    if(width > 0 && widest > 0) {
      size = Math.min(size, width * 100 / widest);
    }
    return Math.max(.01, size);
  }

  /**
   * Render inherited and local compiler primitives using bounded SVG attributes.
   * @param {*} container Owning SVG element.
   * @param {*} metadata Reviewed compiler metadata.
   * @param {*} component Component declaration and property bindings.
   * @param {*} width Width.
   * @param {*} height Height.
   */
  static renderAnnotation(container, metadata, component, width, height) {
    var doc = container.ownerDocument;
    var create = function(tag, attrs, parent) {
      var element = doc.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.keys(attrs).forEach(function(name) {
        element.setAttribute(name, attrs[name]);
      });
      (parent || container).appendChild(element);
      return element;
    };
    var count = 0;
    var color = function(value) {
      return Array.isArray(value) && value.length == 3 ? 'rgb(' + value.map(function(v) {
        return Math.max(0, Math.min(255, Number(v) || 0));
      }).join(',') + ')' : 'none';
    };
    var inherited_extent = [-100, -100, 100, 100];
    var inherited_aspect = true;
    var icons = metadata.icons || [];
    var custom_icons = readMetadata('custom-icons.json');
    if(custom_icons[metadata.type]) {
      icons = icons.concat(custom_icons[metadata.type]);
    }
    icons.forEach(function(icon) {
      var annotation = PRDC_OMJSL_ANNOTATIONS.parseAnnotation(icon.annotation);
      if(!Array.isArray(annotation)) {
        return;
      }
      var shapes = annotation.find(function(value) {
        return Array.isArray(value);
      }) || [];
      // An omitted coordinate system uses the language-defined [-100,100] extent.
      var extent = inherited_extent.map(function(value, index) {
        return typeof annotation[index] == 'number' ? annotation[index] : value;
      });
      var x0 = extent[0],
        y0 = extent[1],
        x1 = extent[2],
        y1 = extent[3];
      if(!Number.isFinite(x0 + y0 + x1 + y1) || x0 == x1 || y0 == y1) {
        return;
      }
      var scale_x = width / (x1 - x0),
        scale_y = height / (y1 - y0);
      var preserve_aspect = typeof annotation[4] == 'boolean' ? annotation[4] : inherited_aspect;
      inherited_extent = extent;
      inherited_aspect = preserve_aspect;
      if(preserve_aspect) {
        scale_x = scale_y = Math.min(scale_x, scale_y);
      }
      var group = create('g', {
        class: 'component-icon',
        transform: 'scale(' + scale_x + ' ' + -scale_y + ') translate(' + -(x0 + x1) / 2 + ' ' + -(y0 + y1) / 2 + ')'
      });
      shapes.forEach(function(shape) {
        if(!shape || !shape.values) {
          return;
        }
        var v = shape.values;
        var visibility = v[0];
        var resolveVisibility = function(value) {
          if(value && value.operator == 'not') {
            return !resolveVisibility(value.value);
          }
          if(typeof value == 'boolean') {
            return value;
          }
          var modifier = (component.modifiers || []).find(function(item) {
            return item.name == value;
          });
          return modifier ? modifier.value == 'true' : false;
        };
        if(!resolveVisibility(visibility)) {
          return;
        }
        var parent = create('g', {
          transform: 'translate(' + (Number(v[1] && v[1][0]) || 0) + ' ' + (Number(v[1] && v[1][1]) || 0) + ') rotate(' + (Number(v[2]) || 0) + ')'
        }, group);
        if(shape.kind == 'Bitmap') {
          var image_extent = v[3];
          var image_uri = v[5] ? 'data:image/png;base64,' + String(v[5]).replace(/\s/g, '') : metadata.assets && metadata.assets[v[4]];
          if(!image_uri || !/^data:image\/(png|jpeg|gif|webp|bmp|svg\+xml);base64,/.test(image_uri)) {
            return;
          }
          create('image', {
            x: Math.min(image_extent[0][0], image_extent[1][0]),
            y: -Math.max(image_extent[0][1], image_extent[1][1]),
            width: Math.abs(image_extent[1][0] - image_extent[0][0]),
            height: Math.abs(image_extent[1][1] - image_extent[0][1]),
            transform: 'scale(1 -1)',
            href: image_uri,
            preserveAspectRatio: 'none'
          }, parent);
          count++;
          return;
        }
        var line = shape.kind == 'Line';
        var attrs = {
          stroke: color(v[line ? 4 : 3]),
          fill: line || /None$/.test(String(v[6])) ? 'none' : color(v[4]),
          'stroke-width': Math.max(.1, Number(v[line ? 6 : 7]) || .25) * 4,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round'
        };
        var pattern = String(v[5]);
        if(pattern.endsWith('.None')) {
          attrs.stroke = 'none';
        }
        var dashes = {
          Dash: '12 8',
          Dot: '2 6',
          DashDot: '12 6 2 6',
          DashDotDot: '12 6 2 6 2 6'
        };
        if(dashes[pattern.split('.').pop()]) {
          attrs['stroke-dasharray'] = dashes[pattern.split('.').pop()];
        }
        var fill_pattern = !line && String(v[6]).split('.').pop();
        if(fill_pattern && !['None', 'Solid'].includes(fill_pattern)) {
          var paint_id = 'modelica-paint-' + ++next_paint_id;
          var defs = create('defs', {}, parent);
          if(['HorizontalCylinder', 'VerticalCylinder', 'Sphere'].includes(fill_pattern)) {
            var sphere = fill_pattern == 'Sphere';
            var paint = create(sphere ? 'radialGradient' : 'linearGradient', sphere ? {
              id: paint_id,
              cx: '.5',
              cy: '.5',
              r: '.5'
            } : {
              id: paint_id,
              x1: '0',
              y1: '0',
              x2: fill_pattern == 'VerticalCylinder' ? '1' : '0',
              y2: fill_pattern == 'HorizontalCylinder' ? '1' : '0'
            }, defs);
            (sphere ? [[0, v[4]], [1, v[3]]] : [[0, v[3]], [.5, v[4]], [1, v[3]]]).forEach(function(stop) {
              create('stop', {
                offset: stop[0],
                'stop-color': color(stop[1])
              }, paint);
            });
          } else {
            var paint = create('pattern', {
              id: paint_id,
              patternUnits: 'userSpaceOnUse',
              width: 8,
              height: 8
            }, defs);
            create('rect', {
              width: 8,
              height: 8,
              fill: color(v[4])
            }, paint);
            var hatches = {
              Horizontal: 'M0 4H8',
              Vertical: 'M4 0V8',
              Cross: 'M0 4H8M4 0V8',
              Forward: 'M-4 8L8-4M0 12L12 0',
              Backward: 'M-4 0L8 12M0-4L12 8',
              CrossDiag: 'M-4 8L8-4M0 12L12 0M-4 0L8 12M0-4L12 8'
            };
            create('path', {
              d: hatches[fill_pattern] || '',
              stroke: color(v[3]),
              'stroke-width': 1,
              fill: 'none'
            }, paint);
          }
          attrs.fill = 'url(#' + paint_id + ')';
        }
        var points = function(value) {
          return (Array.isArray(value) ? value : []).map(function(point) {
            return [Number(point[0]) || 0, Number(point[1]) || 0].join(',');
          }).join(' ');
        };
        if(shape.kind == 'Polygon' || line) {
          var vertices = v[line ? 3 : 8];
          if(String(v[9]).endsWith('.Bezier') && vertices.length > 2) {
            create('path', Object.assign(attrs, {
              d: PRDC_OMJSL_ANNOTATIONS.bezierPath(vertices, !line)
            }), parent);
          } else {
            create(line ? 'polyline' : 'polygon', Object.assign(attrs, {
              points: points(vertices)
            }), parent);
          }
          if(line && Array.isArray(v[7]) && vertices.length > 1) {
            v[7].forEach(function(arrow, index) {
              if(String(arrow).endsWith('.None')) {
                return;
              }
              var tip = index ? vertices[vertices.length - 1] : vertices[0];
              var neighbor = index ? vertices[vertices.length - 2] : vertices[1];
              var angle = Math.atan2(tip[1] - neighbor[1], tip[0] - neighbor[0]) * 180 / Math.PI;
              var size = Math.max(0, Number(v[8]) || 3) * 4;
              var arrow_attrs = {
                transform: 'translate(' + tip.join(' ') + ') rotate(' + angle + ')',
                stroke: attrs.stroke,
                'stroke-width': attrs['stroke-width'],
                'stroke-linejoin': 'round',
                fill: String(arrow).endsWith('.Filled') ? attrs.stroke : 'none'
              };
              var path = 'M' + -size + ',' + size / 3 + ' L0,0';
              if(!String(arrow).endsWith('.Half')) {
                path += ' L' + -size + ',' + -size / 3;
              }
              if(String(arrow).endsWith('.Filled')) {
                path += ' Z';
              }
              create('path', Object.assign(arrow_attrs, {
                d: path
              }), parent);
            });
          }
        } else if(shape.kind == 'Rectangle' || shape.kind == 'Ellipse' || shape.kind == 'Text') {
          var extent = v[shape.kind == 'Rectangle' ? 9 : 8];
          if(!Array.isArray(extent) || extent.length != 2) {
            return;
          }
          var left = Math.min(extent[0][0], extent[1][0]),
            bottom = Math.min(extent[0][1], extent[1][1]);
          var w = Math.abs(extent[1][0] - extent[0][0]),
            h = Math.abs(extent[1][1] - extent[0][1]);
          if(shape.kind == 'Text') {
            var text = String(v[9] || '');
            if(text.includes('%name')) {
              return;
            }
            var translated = translatedIconText(metadata.type || component.type, text, component.language || 'en');
            var localized = translated != text;
            text = translated;
            text = text.replace(/%([A-Za-z_]\w*)/g, function(_, name) {
              var modifier = (component.modifiers || []).find(function(item) {
                return item.name == name;
              });
              return modifier ? modifier.value : name;
            });
            var alignment = String(v[14]).split('.').pop();
            var style = Array.isArray(v[13]) ? v[13] : [];
            var text_color = Array.isArray(v[11]) && v[11].every(function(channel) {
              return channel >= 0;
            }) ? v[11] : v[3];
            var text_x = alignment == 'Left' ? left : alignment == 'Right' ? left + w : left + w / 2;
            var text_element = create('text', {
              x: text_x,
              y: -(bottom + h / 2),
              transform: 'scale(1 -1)',
              fill: color(text_color),
              'text-anchor': alignment == 'Left' ? 'start' : alignment == 'Right' ? 'end' : 'middle',
              'dominant-baseline': 'middle',
              'font-family': v[12] || 'Roboto, Arial, sans-serif',
              'text-rendering': 'geometricPrecision',
              'font-weight': style.includes('TextStyle.Bold') ? 'bold' : 'normal',
              'font-style': style.includes('TextStyle.Italic') ? 'italic' : 'normal',
              'text-decoration': style.includes('TextStyle.UnderLine') ? 'underline' : 'none',
              'font-size': Number(v[10]) || Math.max(8, h * .7)
            }, parent);
            var lines = text.split('\n');
            if((localized || !(Number(v[10]) > 0)) && doc.body && typeof text_element.getBBox == 'function') {
              if(!text_measurements.has(doc)) {
                var measure_svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
                measure_svg.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;visibility:hidden;overflow:visible;pointer-events:none';
                var measure = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
                measure_svg.appendChild(measure);
                doc.body.appendChild(measure_svg);
                text_measurements.set(doc, measure);
              }
              var measure = text_measurements.get(doc);
              ['font-family', 'font-weight', 'font-style', 'text-rendering'].forEach(name => measure.setAttribute(name, text_element.getAttribute(name)));
              measure.setAttribute('font-size', 100);
              measure.textContent = 'Mg';
              var font_height = measure.getBBox().height;
              var size = PRDC_OMJSL_ANNOTATIONS.annotationTextSize(w, h, lines.map(value => {
                measure.textContent = value;
                return measure.getBBox().width;
              }), 0, font_height);
              if(Number(v[10]) > 0) {
                size = Math.min(size, Number(v[10]));
              }
              for(var fit = 0; fit < 4; fit++) {
                measure.setAttribute('font-size', size);
                var measured_width = 0,
                  measured_height = 0;
                lines.forEach(value => {
                  measure.textContent = value;
                  var box = measure.getBBox();
                  measured_width = Math.max(measured_width, box.width);
                  measured_height = Math.max(measured_height, box.height);
                });
                measured_height += Math.max(0, lines.length - 1) * 1.15 * size;
                var factor = Math.min(1, w > 0 && measured_width > w ? w / measured_width : 1, h > 0 && measured_height > h ? h / measured_height : 1);
                if(factor >= 1) {
                  break;
                }
                size *= factor * .999;
              }
              text_element.setAttribute('font-size', size);
              text_element.setAttribute('data-text-extent', JSON.stringify([w, h]));
            }
            lines.forEach(function(value, index) {
              create('tspan', {
                x: text_x,
                dy: index ? '1.15em' : -(lines.length - 1) * .575 + 'em'
              }, text_element).textContent = value;
            });
          } else if(shape.kind == 'Ellipse') {
            var start_angle = Number(v[9]) || 0,
              end_angle = Number(v[10]);
            if(!Number.isFinite(end_angle)) {
              end_angle = 360;
            }
            if(Math.abs(end_angle - start_angle) >= 360) {
              create('ellipse', Object.assign(attrs, {
                cx: left + w / 2,
                cy: bottom + h / 2,
                rx: w / 2,
                ry: h / 2
              }), parent);
            } else {
              var position = function(angle) {
                return [left + w / 2 + w / 2 * Math.cos(angle * Math.PI / 180), bottom + h / 2 + h / 2 * Math.sin(angle * Math.PI / 180)];
              };
              var start = position(start_angle),
                end = position(end_angle);
              var path = 'M' + start.join(',') + ' A' + w / 2 + ',' + h / 2 + ' 0 ' + (Math.abs(end_angle - start_angle) > 180 ? 1 : 0) + ' ' + (end_angle >= start_angle ? 1 : 0) + ' ' + end.join(',');
              if(String(v[11]).endsWith('.Radial')) {
                path += ' L' + (left + w / 2) + ',' + (bottom + h / 2) + ' Z';
              } else if(!String(v[11]).endsWith('.None')) {
                path += ' Z';
              }
              create('path', Object.assign(attrs, {
                d: path
              }), parent);
            }
          } else {
            create('rect', Object.assign(attrs, {
              x: left,
              y: bottom,
              width: w,
              height: h,
              rx: Number(v[10]) || 0
            }), parent);
            if(!String(v[8]).endsWith('.None')) {
              var raised = String(v[8]).endsWith('.Raised');
              create('path', {
                d: 'M' + left + ',' + bottom + ' V' + (bottom + h) + ' H' + (left + w),
                stroke: raised ? '#fff' : '#444',
                opacity: '.6',
                'stroke-width': 2,
                fill: 'none'
              }, parent);
              create('path', {
                d: 'M' + (left + w) + ',' + (bottom + h) + ' V' + bottom + ' H' + left,
                stroke: raised ? '#444' : '#fff',
                opacity: '.6',
                'stroke-width': 2,
                fill: 'none'
              }, parent);
            }
          }
        } else {
          return;
        }
        count++;
      });
    });
    return count;
  }

  /**
   * Inventory source labels independently of the currently selected UI language.
   * @param {*} graphics Graphics.
   * @param {*} custom Custom.
   */
  static collectIconTexts(graphics, custom = {}) {
    var result = new Map();
    function inspect(node, type) {
      if(Array.isArray(node)) {
        node.forEach(value => inspect(value, type));
      } else if(node && node.kind) {
        var text = node.kind == 'Text' && node.values && node.values[9];
        if(typeof text == 'string' && text.trim() && !text.includes('%name')) {
          if(!result.has(text)) {
            result.set(text, new Set());
          }
          result.get(text).add(type);
        }
        inspect(node.values, type);
      }
    }
    for(const [type, metadata] of Object.entries(graphics)) {
      for(const icon of (metadata.icons || []).concat(custom[type] || [])) {
        if(typeof icon.annotation == 'string' && icon.annotation.trim().startsWith('{')) {
          inspect(PRDC_OMJSL_ANNOTATIONS.parseAnnotation(icon.annotation), type);
        }
      }
    }
    return result;
  }

}
var next_paint_id = 0;
const text_measurements = new WeakMap();
exports.parseAnnotation = PRDC_OMJSL_ANNOTATIONS.parseAnnotation;
exports.renderAnnotation = PRDC_OMJSL_ANNOTATIONS.renderAnnotation;
exports.bezierPath = PRDC_OMJSL_ANNOTATIONS.bezierPath;
exports.annotationTextSize = PRDC_OMJSL_ANNOTATIONS.annotationTextSize;
exports.collectIconTexts = PRDC_OMJSL_ANNOTATIONS.collectIconTexts;
