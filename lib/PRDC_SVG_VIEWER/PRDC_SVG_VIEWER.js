/**
 * @file SVG viewer library
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * @author Petar Cosic <pcosic@prdc.rs>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */


/**
 * Class for SVG viewer.
 */
class PRDC_SVG_VIEWER {

  /**
   * Create SVG viewer object.
   * @param {HTMLElement} svg - svg element.
   */
  constructor(svg_viewer_cont) {
    this.initialized = false;
    this.svg_viewer_cont = $(svg_viewer_cont);
    
    this.attach();
  }   

  /**
   * Recursively parse the SVG <g> elements that are Inkscape "layers"
   * (inkscape:groupmode="layer"), collecting them in a nested structure
   * so we can display them in a tree widget.
   * @param {SVGElement} node - The parent SVG element (or <g>).
   * @returns {Array} - An array of layer objects for jsTree (or similar).
   */
  parseLayers(node) {
    var layers = [];

    for(var child of node.children) {
      if(child.tagName && child.tagName.toLowerCase() === 'g') {
        var group_mode = child.getAttribute('inkscape:groupmode');
        var label = child.getAttribute('inkscape:label') 
                      || child.id 
                      || 'Unnamed Layer';
        var children_layers = this.parseLayers(child);

        child.style.display = "inline";
      
        if(group_mode === 'layer') {
          layers.push({
            text: label,
            children: children_layers,
            state: {
              selected: true
            },
            data: { node_ref: child }
          });
        } else {
          if(children_layers.length > 0) {
            layers.push({
              text: label,
              children: children_layers,
              state: {
                selected: true
              },
              data: { node_ref: child }
            });
          }
        }
      }
    }
    return layers;
  }

  /**
   * Builds the jsTree (or any nested tree) data structure from the parsed layers
   * and initializes the tree in the layer popup container.
   */
  buildLayerTree() {
    this.layers_data = this.parseLayers(this.d3_svg_g.node());
    this.tree_cont = this.svg_viewer_cont.find('.prdc-svg-viewer-layers-popup-data');
    
    // Initialize jsTree
    this.tree = this.tree_cont.jstree({
      'core': {
        'data': this.layers_data,
        "themes": {
          "name": "default",
          "responsive": true,
          'icons': false,
          'dots': false
        }
      },
      "checkbox" : {
        "keep_selected_style": false
      },
      "plugins" : [ "checkbox" ]
    });

    this.tree_cont.on('changed.jstree', (e, data) => {
      if(!data.node) return;
      var node_ref = data.node.data.node_ref;
      if(!node_ref) return;
      
      var is_checked = data.node.state.selected;
      
      if(is_checked) {
        node_ref.style.display = "inline";
        
        data.node.parents.forEach(parent_id => {
          if (parent_id === '#') return;
          const parent_node = data.instance.get_node(parent_id);
          if (parent_node && parent_node.data && parent_node.data.node_ref) {
            parent_node.data.node_ref.style.display = "inline";
          }
        });
        data.node.children_d.forEach(childId => {
          const child_node = data.instance.get_node(childId);
          if (child_node && child_node.data && child_node.data.node_ref) {
            child_node.data.node_ref.style.display = "inline";
          }
        });
      } else {
        node_ref.style.display = "none";
        
        data.node.children_d.forEach(childId => {
          const child_node = data.instance.get_node(childId);
          if (child_node && child_node.data && child_node.data.node_ref) {
            child_node.data.node_ref.style.display = "none";
          }
        });
      }
    });
  }  

  /**
   * TODO
   */
  attach() {
    var obj = this;
    this.svg = this.svg_viewer_cont.find('svg');
    if(this.svg.length > 0 && !this.initialized) {
      this.initialized = true;
    
      // Create controls
      var controls = `
<div class="prdc-svg-viewer-controls">
  <div class="prdc-svg-viewer-control-zoom-plus"></div>
  <div class="prdc-svg-viewer-control-zoom-minus"></div>
  <div class="prdc-svg-viewer-control-autoscale"></div>
  <div class="prdc-svg-viewer-control-reset"></div>
  <div class="prdc-svg-viewer-control-layers"></div>
</div>
<div class="prdc-svg-viewer-layers-popup">
  <div class="popup-triangle"></div>
  <div class="prdc-svg-viewer-layers-popup-cont panel">
    <div class="prdc-svg-viewer-layers-popup-data"></div>
  </div>
</div>`;
      this.svg_viewer_cont.prepend(controls);
    
      this.d3_svg = d3.select(this.svg[0]);
      
      // Zoom and pan actions
      const parent_node = this.d3_svg.node();
      this.d3_svg_g = this.d3_svg.append("g");
      this.d3_svg.selectAll("g")
         .filter(function() { return this !== obj.d3_svg_g.node() &&
            this.parentNode === parent_node; })
         .each(function() {
           obj.d3_svg_g.node().appendChild(this);
         });
     
      this.svg_zoom = d3.zoom()
        .on('zoom', function(e) {
          obj.d3_svg_g.attr('transform', e.transform);
        });

      this.svg_viewer_cont.find('.prdc-svg-viewer-control-zoom-plus').on('click', function() {
        obj.d3_svg
          .transition()
          .call(obj.svg_zoom.scaleBy, 2);
      });
      this.svg_viewer_cont.find('.prdc-svg-viewer-control-zoom-minus').on('click', function() {
        obj.d3_svg
          .transition()
          .call(obj.svg_zoom.scaleBy, 0.5);
      });
      this.svg_viewer_cont.find('.prdc-svg-viewer-control-autoscale').on('click', function() {
        obj.d3_svg
          .transition()
          .call(obj.svg_zoom.scaleTo, 1);
      });
      this.svg_viewer_cont.find('.prdc-svg-viewer-control-reset').on('click', function() {
        obj.d3_svg
          .transition()
          .call(obj.svg_zoom.transform, d3.zoomIdentity)
      });
      
      this.d3_svg.call(this.svg_zoom);
    
      if(!this.svg_viewer_cont.hasClass('no-layers')) {
      // Setup the popup for layers
        this.layers_popup = new PRDC_POPUP(this.svg_viewer_cont.find('.prdc-svg-viewer-control-layers')[0],
          this.svg_viewer_cont.find('.prdc-svg-viewer-layers-popup')[0]);
        
        // Build the layer tree
        this.buildLayerTree();
      }
    }
  }
}

var svg_viewers = [];

$(document).ready(function() { 
  const svg_viewer_conts = document.querySelectorAll('.prdc-svg-viewer');
  svg_viewer_conts.forEach(function(svg_viewer_cont) {
    var new_svg_viewer = new PRDC_SVG_VIEWER(svg_viewer_cont);
    svg_viewers.push(new_svg_viewer);
    svg_viewer_cont.svg_viewer = new_svg_viewer;
  });
});