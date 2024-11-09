/**
 * @file JSLAB library color submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB color submodule.
 */
class PRDC_JSLAB_LIB_COLOR {
  
  /**
   * Constructs a color submodule object with access to JSLAB's color functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;

    /**
     * Color order
     * @type {Array}
     */
    this.colororder = ['#0072BD', '#D95319', '#EDB120', '#7E2F8E', '#77AC30', '#4DBEEE', '#A2142F'];
  
    var colors = {
      aliceblue: 'rgb(240, 248, 255)',
      antiquewhite: 'rgb(250, 235, 215)',
      aqua: 'rgb(0, 255, 255)',
      aquamarine: 'rgb(127, 255, 212)',
      azure: 'rgb(240, 255, 255)',
      beige: 'rgb(245, 245, 220)',
      bisque: 'rgb(255, 228, 196)',
      black: 'rgb(0, 0, 0)',
      blanchedalmond: 'rgb(255, 235, 205)',
      blue: 'rgb(0, 0, 255)',
      blueviolet: 'rgb(138, 43, 226)',
      brown: 'rgb(165, 42, 42)',
      burlywood: 'rgb(222, 184, 135)',
      cadetblue: 'rgb(95, 158, 160)',
      chartreuse: 'rgb(127, 255, 0)',
      chocolate: 'rgb(210, 105, 30)',
      coral: 'rgb(255, 127, 80)',
      cornflowerblue: 'rgb(100, 149, 237)',
      cornsilk: 'rgb(255, 248, 220)',
      crimson: 'rgb(220, 20, 60)',
      cyan: 'rgb(0, 255, 255)',
      darkblue: 'rgb(0, 0, 139)',
      darkcyan: 'rgb(0, 139, 139)',
      darkgoldenrod: 'rgb(184, 134, 11)',
      darkgray: 'rgb(169, 169, 169)',
      darkgreen: 'rgb(0, 100, 0)',
      darkgrey: 'rgb(169, 169, 169)',
      darkkhaki: 'rgb(189, 183, 107)',
      darkmagenta: 'rgb(139, 0, 139)',
      darkolivegreen: 'rgb(85, 107, 47)',
      darkorange: 'rgb(255, 140, 0)',
      darkorchid: 'rgb(153, 50, 204)',
      darkred: 'rgb(139, 0, 0)',
      darksalmon: 'rgb(233, 150, 122)',
      darkseagreen: 'rgb(143, 188, 143)',
      darkslateblue: 'rgb(72, 61, 139)',
      darkslategray: 'rgb(47, 79, 79)',
      darkslategrey: 'rgb(47, 79, 79)',
      darkturquoise: 'rgb(0, 206, 209)',
      darkviolet: 'rgb(148, 0, 211)',
      deeppink: 'rgb(255, 20, 147)',
      deepskyblue: 'rgb(0, 191, 255)',
      dimgray: 'rgb(105, 105, 105)',
      dimgrey: 'rgb(105, 105, 105)',
      dodgerblue: 'rgb(30, 144, 255)',
      firebrick: 'rgb(178, 34, 34)',
      floralwhite: 'rgb(255, 250, 240)',
      forestgreen: 'rgb(34, 139, 34)',
      fuchsia: 'rgb(255, 0, 255)',
      gainsboro: 'rgb(220, 220, 220)',
      ghostwhite: 'rgb(248, 248, 255)',
      gold: 'rgb(255, 215, 0)',
      goldenrod: 'rgb(218, 165, 32)',
      gray: 'rgb(128, 128, 128)',
      green: 'rgb(0, 128, 0)',
      greenyellow: 'rgb(173, 255, 47)',
      grey: 'rgb(128, 128, 128)',
      honeydew: 'rgb(240, 255, 240)',
      hotpink: 'rgb(255, 105, 180)',
      indianred: 'rgb(205, 92, 92)',
      indigo: 'rgb(75, 0, 130)',
      ivory: 'rgb(255, 255, 240)',
      khaki: 'rgb(240, 230, 140)',
      lavender: 'rgb(230, 230, 250)',
      lavenderblush: 'rgb(255, 240, 245)',
      lawngreen: 'rgb(124, 252, 0)',
      lemonchiffon: 'rgb(255, 250, 205)',
      lightblue: 'rgb(173, 216, 230)',
      lightcoral: 'rgb(240, 128, 128)',
      lightcyan: 'rgb(224, 255, 255)',
      lightgoldenrodyellow: 'rgb(250, 250, 210)',
      lightgray: 'rgb(211, 211, 211)',
      lightgreen: 'rgb(144, 238, 144)',
      lightgrey: 'rgb(211, 211, 211)',
      lightpink: 'rgb(255, 182, 193)',
      lightsalmon: 'rgb(255, 160, 122)',
      lightseagreen: 'rgb(32, 178, 170)',
      lightskyblue: 'rgb(135, 206, 250)',
      lightslategray: 'rgb(119, 136, 153)',
      lightslategrey: 'rgb(119, 136, 153)',
      lightsteelblue: 'rgb(176, 196, 222)',
      lightyellow: 'rgb(255, 255, 224)',
      lime: 'rgb(0, 255, 0)',
      limegreen: 'rgb(50, 205, 50)',
      linen: 'rgb(250, 240, 230)',
      magenta: 'rgb(255, 0, 255)',
      maroon: 'rgb(128, 0, 0)',
      mediumaquamarine: 'rgb(102, 205, 170)',
      mediumblue: 'rgb(0, 0, 205)',
      mediumorchid: 'rgb(186, 85, 211)',
      mediumpurple: 'rgb(147, 112, 219)',
      mediumseagreen: 'rgb(60, 179, 113)',
      mediumslateblue: 'rgb(123, 104, 238)',
      mediumspringgreen: 'rgb(0, 250, 154)',
      mediumturquoise: 'rgb(72, 209, 204)',
      mediumvioletred: 'rgb(199, 21, 133)',
      midnightblue: 'rgb(25, 25, 112)',
      mintcream: 'rgb(245, 255, 250)',
      mistyrose: 'rgb(255, 228, 225)',
      moccasin: 'rgb(255, 228, 181)',
      navajowhite: 'rgb(255, 222, 173)',
      navy: 'rgb(0, 0, 128)',
      oldlace: 'rgb(253, 245, 230)',
      olive: 'rgb(128, 128, 0)',
      olivedrab: 'rgb(107, 142, 35)',
      orange: 'rgb(255, 165, 0)',
      orangered: 'rgb(255, 69, 0)',
      orchid: 'rgb(218, 112, 214)',
      palegoldenrod: 'rgb(238, 232, 170)',
      palegreen: 'rgb(152, 251, 152)',
      paleturquoise: 'rgb(175, 238, 238)',
      palevioletred: 'rgb(219, 112, 147)',
      papayawhip: 'rgb(255, 239, 213)',
      peachpuff: 'rgb(255, 218, 185)',
      peru: 'rgb(205, 133, 63)',
      pink: 'rgb(255, 192, 203)',
      plum: 'rgb(221, 160, 221)',
      powderblue: 'rgb(176, 224, 230)',
      purple: 'rgb(128, 0, 128)',
      red: 'rgb(255, 0, 0)',
      rosybrown: 'rgb(188, 143, 143)',
      royalblue: 'rgb(65, 105, 225)',
      saddlebrown: 'rgb(139, 69, 19)',
      salmon: 'rgb(250, 128, 114)',
      sandybrown: 'rgb(244, 164, 96)',
      seagreen: 'rgb(46, 139, 87)',
      seashell: 'rgb(255, 245, 238)',
      sienna: 'rgb(160, 82, 45)',
      silver: 'rgb(192, 192, 192)',
      skyblue: 'rgb(135, 206, 235)',
      slateblue: 'rgb(106, 90, 205)',
      slategray: 'rgb(112, 128, 144)',
      slategrey: 'rgb(112, 128, 144)',
      snow: 'rgb(255, 250, 250)',
      springgreen: 'rgb(0, 255, 127)',
      steelblue: 'rgb(70, 130, 180)',
      tan: 'rgb(210, 180, 140)',
      teal: 'rgb(0, 128, 128)',
      thistle: 'rgb(216, 191, 216)',
      tomato: 'rgb(255, 99, 71)',
      turquoise: 'rgb(64, 224, 208)',
      violet: 'rgb(238, 130, 238)',
      wheat: 'rgb(245, 222, 179)',
      white: 'rgb(255, 255, 255)',
      whitesmoke: 'rgb(245, 245, 245)',
      yellow: 'rgb(255, 255, 0)',
      yellowgreen: 'rgb(154, 205, 50)'
    };

    this.RE_RGB = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
    this.RE_RGBA = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)$/;
    this.RE_HSL = /^hsl\(\s*([\d\.]+)\s*,\s*([\d\.]+)%\s*,\s*([\d\.]+)%\s*\)$/;
    this.RE_HSLA = /^hsla\(\s*([\d\.]+)\s*,\s*([\d\.]+)%\s*,\s*([\d\.]+)%\s*,\s*([\d\.]+)\s*\)$/;
    this.RE_HEX = /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/; // 6 digit
    
    // Global object
    var Color = {
      create: function(str) {
        str = str.replace(/^\s*#|\s*$/g, '');
        str = str.toLowerCase();
        if(KEYWORDS[str]) str = KEYWORDS[str];

        var match;

        // RGB(A)
        if((match = str.match(RE_RGB) || str.match(RE_RGBA))) {
          return new Color.RGBA(
            parseInt(match[1], 10),
            parseInt(match[2], 10),
            parseInt(match[3], 10),
            parseFloat(match.length === 4 ? 1 : match[4])
          );
        }

        // HSL(A)
        if((match = str.match(RE_HSL) || str.match(RE_HSLA))) {
          return new Color.HSLA(
            parseFloat(match[1]),
            parseFloat(match[2]),
            parseFloat(match[3]),
            parseFloat(match.length === 4 ? 1 : match[4])
          );
        }

        // Hex
        if(str.length === 3) {
          // Hex 3 digit -> 6 digit
          str = str.replace(/(.)/g, '$1$1');
        }
        if((match = str.match(RE_HEX))) {
          return new Color.RGBA(
            parseInt(match[1], 16),
            parseInt(match[2], 16),
            parseInt(match[3], 16),
            1
          );
        }

        return null;
      },
      
      luminance: function(color) {
        if(color instanceof Color.HSLA) color = color.toRGBA();
        return 0.298912 * color.r + 0.586611 * color.g + 0.114478 * color.b;
      },

      greyscale: function(color) {
        var lum = Color.luminance(color);
        return new Color.RGBA(lum, lum, lum, this.a);
      },

      nagate: function(color) {
        if(color instanceof Color.HSLA) color = color.toRGBA();
        return new Color.RGBA(255 - color.r, 255 - color.g, 255 - color.b, color.a);
      },

      /**
       * @see http://sass-lang.com/docs/yardoc/Sass/Script/Functions.html#mix-instance_method
       */
      mix: function(color1, color2, weight) {
        if(color1 instanceof Color.HSLA) color1 = color1.toRGBA();
        if(color2 instanceof Color.HSLA) color2 = color2.toRGBA();
        if(isNull(weight) || obj.jsl.format.isUndefined(weight)) weight = 0.5;

        var w0 = 1 - weight;
        var w = w0 * 2 - 1;
        var a = color1.a - color2.a;
        var w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
        var w2 = 1 - w1;

        return new Color.RGBA(
          Math.round(color1.r * w1 + color2.r * w2),
          Math.round(color1.g * w1 + color2.g * w2),
          Math.round(color1.b * w1 + color2.b * w2),
          Math.round(color1.a * w0 + color2.a * weight)
        );
      }
    };

    /**
     * Color.RGBA
     */
    Color.RGBA = function(r, g, b, a) {
      if(isArray(r)) {
        g = r[1];
        b = r[2];
        a = r[3];
        r = r[0];
      } else if(isObject(r)) {
        g = r.g;
        b = r.b;
        a = r.a;
        r = r.r;
      }
      
      this.r = r || 0;
      this.g = g || 0;
      this.b = b || 0;
      this.a = !isNumber(a) ? 1 : a;
    };

    Color.RGBA.prototype = {        
      toHSLA: function() {
        var hsl = rgbToHsl(Math.round(this.r), Math.round(this.g), Math.round(this.b));
        return new Hsla(hsl[0], hsl[1], hsl[2], this.a);
      },
      
      toArray: function() {
        return [Math.round(this.r), Math.round(this.g), Math.round(this.b), this.a];
      },
      
      clone: function() {
        return new Color.RGBA(this);
      },
      
      toString: function() {
        return 'rgba(' + Math.round(this.r) + ', ' + Math.round(this.g) + ', ' + Math.round(this.b) + ', ' + this.a + ')';
      }
    };


    /**
     * Color.HSLA
     */
    Color.HSLA = function(h, s, l, a) {
      if(isArray(h)) {
        s = h[1];
        l = h[2];
        a = h[3];
        h = h[0];
      } else if(isObject(h)) {
        s = h.s;
        l = h.l;
        a = h.a;
        h = h.h;
      }
      
      this.h = h || 0;
      this.s = s || 0;
      this.l = l || 0;
      this.a = !isNumber(a) ? 1 : a;
    };

    Color.HSLA.prototype = {
      toRGBA: function() {
        var rgb = this.hslToRgb(this.h, this.s, this.l);
        return new Rgba(rgb[0], rgb[1], rgb[2], this.a);
      },
      
      toArray: function() {
        return [this.h, this.s, this.l, this.a];
      },
      
      clone: function() {
        return new Color.HSLA(this);
      },
      
      toString: function() {
        return 'hsla(' + this.h + ', ' + this.s + '%, ' + this.l + '%, ' + this.a + ')';
      }
    };
  }
 
  /**
   * Returns a color code based on the provided identifier.
   * @param {number|string|Array<number>} id - Identifier for the color. Can be a numeric index, a predefined color name, or an RGB array.
   * @return {string} The hex code of the color.
   */
  color(id) {
    var c = '#0072BD';
    if(typeof id == 'number') {
      c = colororder[id % 7];
    } else if(Array.isArray(id)) {
      if(id.length == 3) {
        c = rgb2hex(id);
      }
    } else {
      switch(id) {
        case 'y':
        case 'yellow':
          c = '#FFFF00';
          break;
        case 'm':
        case 'magenta':
          c = '#FF00FF';
          break;
        case 'c':
        case 'cyan':
          c = '#00FFFF';
          break;
        case 'r':
        case 'red':
          c = '#FF0000';
          break;
        case 'g':
        case 'green':
          c = '#00FF00';
          break;
        case 'b':
        case 'blue':
          c = '#0000FF';
          break;
        case 'w':
        case 'white':
          c = '#FFFFFF';
          break;
        case 'k':
        case 'black':
          c = '#000000';
          break;
      }
    }
    return c;
  }

  /**
   * Calculates a color on a gradient from green to red based on a value.
   * @param {number} value - A number between 0 and 1 indicating position on the gradient.
   * @param {number} [k=0.3] - A scaling factor to adjust the gradient effect.
   * @return {string} The hsl color string.
   */
  getColorG2R(value, k = 0.3){
    if(value < 0) {
      value = 0;
    } else if(value < k) {
      value = value/k;
    } else {
      value = 1;
    }
    var hue=(120*value).toString(10);
    return ["hsl(",hue,",100%,50%)"].join("");
  }

  /**
   * Calculates the gradient color between two colors based on a percentage.
   * @param {number} p - The percentage (0 to 1) between the two colors.
   * @param {Array<number>} rgb_beginning - The RGB values of the start color.
   * @param {Array<number>} rgb_end - The RGB values of the end color.
   * @return {Array<number>} The RGB values of the calculated gradient color.
   */
  colourGradientor(p, rgb_beginning, rgb_end){
    var w = p * 2 - 1;
    var w1 = (w + 1) / 2.0;
    var w2 = 1 - w1;

    var rgb = [parseInt(rgb_beginning[0] * w1 + rgb_end[0] * w2),
      parseInt(rgb_beginning[1] * w1 + rgb_end[1] * w2),
      parseInt(rgb_beginning[2] * w1 + rgb_end[2] * w2)];
    return rgb;
  }

  /**
   * Converts RGB color values to HEX.
   * @param {number} r - The red color value (0-255).
   * @param {number} g - The green color value (0-255).
   * @param {number} b - The blue color value (0-255).
   * @return {Array<number>} The HEX representation of the color.
   */
  rgb2hex(r, g, b) {
    // If the first argument is an array, unpack its values
    if(Array.isArray(r)) {
      [r, g, b] = r;
    }
    
    function toHex(c) {
      // Scale to 0-255 if the value is between 0 and 1
      c = (c <= 1) ? Math.round(c * 255) : Math.round(c);
      // Clamp the value between 0 and 255
      c = Math.min(255, Math.max(0, c));
      // Convert to hexadecimal and pad with zeros if necessary
      return c.toString(16).padStart(2, '0').toUpperCase();
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }
  
  /**
   * Converts RGB color values to HSL (Hue, Saturation, Lightness).
   * @param {number} r - The red color value (0-255).
   * @param {number} g - The green color value (0-255).
   * @param {number} b - The blue color value (0-255).
   * @return {Array<number>} The HSL representation of the color.
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l;

    l = (max + min) / 2;

    if(max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      switch (max) {
        case r: h = ((g - b) / d * 60 + 360) % 360; break;
        case g: h = (b - r) / d * 60 + 120; break;
        case b: h = (r - g) / d * 60 + 240; break;
      }
      s = l <= 0.5 ? d / (max + min) : d / (2 - max  - min);
    }

    return [h, s * 100, l * 100];
  }

  /**
   * Converts HSL color values to RGB.
   * @param {number} h - The hue value (0-360).
   * @param {number} s - The saturation value (0-100).
   * @param {number} l - The lightness value (0-100).
   * @return {Array<number>} The RGB representation of the color.
   */
  hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    var r, g, b;

    if(s === 0){
      r = g = b = l * 255;
    } else {
      var v2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var v1 = 2 * l - v2;
      r = Math.round(this.hueToRgb(v1, v2, h + 120) * 255);
      g = Math.round(this.hueToRgb(v1, v2, h) * 255);
      b = Math.round(this.hueToRgb(v1, v2, h - 120) * 255);
    }

    return [r, g, b];
  }

  /**
   * Helper function for converting a hue to RGB.
   * @param {number} v1 - Helper value 1.
   * @param {number} v2 - Helper value 2.
   * @param {number} vh - The hue value to convert.
   * @return {number} The RGB value for the hue.
   */
  hueToRgb(v1, v2, vh) {
    vh /= 360;
    if(vh < 0) vh++;
    if(vh > 1) vh--;
    if(vh < 1 / 6) return v1 + (v2 - v1) * 6 * vh;
    if(vh < 1 / 2) return v2;
    if(vh < 2 / 3) return v1 + (v2 - v1) * (2 / 3 - vh) * 6;
    return v1;
  }
}
    
exports.PRDC_JSLAB_LIB_COLOR = PRDC_JSLAB_LIB_COLOR;