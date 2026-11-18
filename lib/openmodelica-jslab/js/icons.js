/**
 * @file OpenModelicaJSLAB icons integration
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  renderAnnotation
} = require('./annotations');
/**
 * Class for rendering reviewed block graphics.
 */
class PRDC_OMJSL_ICONS {

  /**
   * Draws reviewed custom graphics or compiler annotations into the supplied SVG.
   * @param {*} container Owning SVG element.
   * @param {*} component Component declaration and property bindings.
   * @param {*} width Width.
   * @param {*} height Height.
   * @param {*} metadata Reviewed compiler metadata.
   */
  static renderBlockIcon(container, component, width, height, metadata) {
    if(!built_in_types.has(component.type)) {
      if(metadata) {
        renderAnnotation(container, metadata, component, width, height);
      }
      return;
    }
    var namespace = 'http://www.w3.org/2000/svg';
    var prefix = 'omc-block-' + ++icon_id + '-';
    var svgElement = function(name, attributes, class_name) {
      var element = container.ownerDocument.createElementNS(namespace, name);
      Object.entries(attributes || {}).forEach(function([key, value]) {
        element.setAttribute(key, value);
      });
      if(class_name) {
        element.setAttribute('class', class_name);
      }
      return element;
    };
    var scale = Math.min(width, height) / 20;
    var icon = svgElement('g', {
      transform: 'scale(' + scale + ')'
    }, 'component-icon');
    var defs = svgElement('defs');
    defs.innerHTML = "\n              <linearGradient id=\"modelica-blue-cylinder\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n                <stop offset=\"0\" stop-color=\"#0068bd\"/><stop offset=\".22\" stop-color=\"#45b8ff\"/>\n                <stop offset=\".5\" stop-color=\"#0088e8\"/><stop offset=\".82\" stop-color=\"#0068bd\"/><stop offset=\"1\" stop-color=\"#003d72\"/>\n              </linearGradient>\n              <radialGradient id=\"modelica-blue-sphere\" cx=\"35%\" cy=\"28%\" r=\"72%\">\n                <stop offset=\"0\" stop-color=\"#8fd7ff\"/><stop offset=\".36\" stop-color=\"#168fe0\"/><stop offset=\"1\" stop-color=\"#00518f\"/>\n              </radialGradient>\n              <linearGradient id=\"modelica-steel-cylinder\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n                <stop offset=\"0\" stop-color=\"#777\"/><stop offset=\".18\" stop-color=\"#f4f4f4\"/>\n                <stop offset=\".5\" stop-color=\"#c8c8c8\"/><stop offset=\".82\" stop-color=\"#f7f7f7\"/><stop offset=\"1\" stop-color=\"#686868\"/>\n              </linearGradient>\n              <radialGradient id=\"modelica-steel-sphere\" cx=\"35%\" cy=\"28%\" r=\"72%\">\n                <stop offset=\"0\" stop-color=\"#fff\"/><stop offset=\".46\" stop-color=\"#d7d7d7\"/><stop offset=\"1\" stop-color=\"#858585\"/>\n              </radialGradient>\n            ".replace(/id="modelica-/g, 'id="' + prefix);
    icon.appendChild(defs);
    var type = component.type;
    var add = function(name, attributes, class_name) {
      var element = svgElement(name, attributes, class_name);
      var fill = {
        'icon-steel': 'steel-cylinder',
        'icon-steel-solid': 'steel-sphere',
        'icon-body-cylinder': 'blue-cylinder',
        'icon-body-sphere': 'blue-sphere'
      }[class_name];
      if(fill) {
        element.style.fill = 'url(#' + prefix + fill + ')';
      }
      icon.appendChild(element);
      return element;
    };
    if(/\.World$/.test(type)) {
      add('path', {
        d: 'M -8 7 V -6 M -8 7 H 7'
      }, 'icon-world-axis');
      add('path', {
        d: 'M -10 -5.5 L -8 -9 L -6 -5.5 Z M 6.5 5 L 10 7 L 6.5 9 Z'
      }, 'icon-world-axis-fill');
      add('path', {
        d: 'M 1 -7 V 2.5'
      }, 'icon-world-gravity');
      add('path', {
        d: 'M -.5 2 L 1 6 L 2.5 2 Z'
      }, 'icon-world-gravity-fill');
      var gravity_label = add('text', {
        x: 4.2,
        y: -.8
      }, 'icon-gravity-label');
      gravity_label.textContent = 'g';
      var x_label = add('text', {
        x: 7.2,
        y: 4.6
      }, 'icon-axis-label');
      x_label.textContent = 'x';
      var y_label = add('text', {
        x: -5.2,
        y: -6.5
      }, 'icon-axis-label');
      y_label.textContent = 'y';
    } else if(/\.Fixed$/.test(type)) {
      add('rect', {
        x: -9,
        y: -9,
        width: 18,
        height: 18
      }, 'icon-white-background');
      add('path', {
        d: 'M0-10V10M0 8L-10 2M0 4L-10-2M0 0L-10-6M0-4L-10-10M0 0H10'
      }, 'icon-line-strong');
    } else if(/\.Revolute$/.test(type)) {
      add('rect', {
        x: -10,
        y: -6,
        width: 7,
        height: 12,
        rx: 1
      }, 'icon-steel');
      add('rect', {
        x: 3,
        y: -6,
        width: 7,
        height: 12,
        rx: 1
      }, 'icon-steel');
      add('rect', {
        x: -3,
        y: -1.1,
        width: 6,
        height: 2.2
      }, 'icon-steel-solid');
      add('rect', {
        x: -1,
        y: -10,
        width: 2,
        height: 5
      }, 'icon-steel');
      add('path', {
        d: 'M-3-5H3L1-7H-1Z'
      }, 'icon-steel-solid');
    } else if(/\.JointSSR$/.test(type)) {
      add('circle', {
        cx: -7,
        cy: 0,
        r: 3
      }, 'icon-steel-solid');
      add('circle', {
        cx: -7.05,
        cy: 0,
        r: 2.25
      }, 'icon-spherical-cup');
      add('rect', {
        x: -6.3,
        y: -3.3,
        width: 2.4,
        height: 6.6
      }, 'icon-white-mask');
      add('circle', {
        cx: -1,
        cy: 0,
        r: 3
      }, 'icon-steel-solid');
      add('circle', {
        cx: -1.05,
        cy: 0,
        r: 2.25
      }, 'icon-spherical-cup');
      add('rect', {
        x: -4.4,
        y: -3.1,
        width: 2.5,
        height: 6.1
      }, 'icon-white-mask');
      add('circle', {
        cx: -1.3,
        cy: 0,
        r: 1
      }, 'icon-black');
      add('circle', {
        cx: -7,
        cy: 0,
        r: 1
      }, 'icon-black');
      add('rect', {
        x: -6.2,
        y: -.6,
        width: 4.1,
        height: 1.2
      }, 'icon-steel');
      add('rect', {
        x: 1.9,
        y: -.6,
        width: 4.2,
        height: 1.2
      }, 'icon-steel');
      add('rect', {
        x: 6,
        y: -3,
        width: 1.6,
        height: 6
      }, 'icon-steel');
      add('rect', {
        x: 8.5,
        y: -3,
        width: 1.5,
        height: 6
      }, 'icon-steel');
      add('rect', {
        x: 7.6,
        y: -1,
        width: .9,
        height: 2
      }, 'icon-steel-solid');
      add('path', {
        d: 'M1.9 0V-8H0V-10M6.8-3V-8H8V-10M9.2-3V-4H9.7'
      }, 'icon-assembly-line');
    } else if(/\.Spherical$/.test(type)) {
      add('circle', {
        cx: 0,
        cy: 0,
        r: 7
      }, 'icon-steel-solid');
      add('circle', {
        cx: 0,
        cy: 0,
        r: 5
      }, 'icon-spherical-cup');
      add('rect', {
        x: 3,
        y: -7,
        width: 4.2,
        height: 14
      }, 'icon-white-mask');
      add('rect', {
        x: -10,
        y: -1,
        width: 3.2,
        height: 2
      }, 'icon-steel');
      add('rect', {
        x: 2.3,
        y: -1,
        width: 7.7,
        height: 2
      }, 'icon-steel');
      add('circle', {
        cx: 0,
        cy: 0,
        r: 2.5
      }, 'icon-steel-solid');
    } else if(/\.BodyShape$/.test(type)) {
      add('rect', {
        x: -10,
        y: -3,
        width: 20,
        height: 6,
        rx: 1
      }, 'icon-body-cylinder');
      add('circle', {
        cx: 0,
        cy: 0,
        r: 6
      }, 'icon-body-sphere');
    } else if(/\.FixedTranslation$/.test(type)) {
      add('rect', {
        x: -10,
        y: -0.6,
        width: 20,
        height: 1.2
      }, 'icon-black');
    } else if(/\.Body$/.test(type)) {
      add('rect', {
        x: -10,
        y: -3,
        width: 9.7,
        height: 6,
        rx: 1
      }, 'icon-body-cylinder');
      add('circle', {
        cx: 4,
        cy: 0,
        r: 6
      }, 'icon-body-sphere');
    } else if(/\.Position$/.test(type)) {
      add('rect', {
        x: -10,
        y: -2,
        width: 20,
        height: 4
      }, 'icon-steel');
      add('path', {
        d: 'M-3-3.2H3M-3 3.2H3M0-5.2V-3.2M0 3.2V10'
      }, 'icon-line-strong');
    } else if(/\.TimeTable$/.test(type)) {
      add('path', {
        d: 'M-8-6.8V8M-9 7H8.2'
      }, 'icon-table-axis');
      add('path', {
        d: 'M-8-9L-8.8-6.8H-7.2ZM9-7L6.8-7.8V-6.2Z'
      }, 'icon-table-fill');
      add('rect', {
        x: -4.8,
        y: -7,
        width: 10,
        height: 12
      }, 'icon-table-paper');
      add('path', {
        d: 'M-4.8-4H5.2M-4.8-1H5.2M-4.8 2H5.2M.2-7V5'
      }, 'icon-table-grid');
    }
    container.appendChild(icon);
  }

}
const built_in_types = new Set([
  "Modelica.Blocks.Sources.TimeTable",
  "Modelica.Mechanics.Rotational.Sources.Position",
  "Modelica.Mechanics.MultiBody.World",
  "Modelica.Mechanics.MultiBody.Parts.Fixed",
  "Modelica.Mechanics.MultiBody.Parts.Body",
  "Modelica.Mechanics.MultiBody.Parts.BodyShape",
  "Modelica.Mechanics.MultiBody.Parts.FixedTranslation",
  "Modelica.Mechanics.MultiBody.Joints.Revolute",
  "Modelica.Mechanics.MultiBody.Joints.Spherical",
  "Modelica.Mechanics.MultiBody.Joints.Assemblies.JointSSR"
]);
var icon_id = 0;
exports.renderBlockIcon = PRDC_OMJSL_ICONS.renderBlockIcon;
exports.iconTypes = Array.from(built_in_types);
