window.MathJax = {
  tex: {
    macros: {
      bm: ["\\mathbfit{#1}", 1],   // \bm{X} → \mathbfit{X}
      norm: ["\\left\\lVert #1 \\right\\rVert", 1],
      abs:  ["\\left\\lvert #1 \\right\\rvert", 1],
      diff: ["\\,\\mathrm{d}#1", 1]
    }
  },
  startup: { 
    typeset: false 
  } 
};