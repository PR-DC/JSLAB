# JSLAB documentation

Version v1.0.4

## About JSLAB

Welcome to the **JSLAB** Documentation! This guide provides comprehensive information for users and contributors, detailing the features, usage, and contribution guidelines to ensure a consistent and high-quality codebase.

**Quick links:** [Website](https://pr-dc.com/jslab/), [Try it online](https://pr-dc.com/jslab/web/), [Discourse](https://discourse.jsl.pr-dc.com/), [Documentation](https://pr-dc.com/jslab/doc/), [Source code](https://github.com/PR-DC/JSLAB/), [Releases](https://github.com/PR-DC/JSLAB/releases), [Examples](https://github.com/PR-DC/JSLAB/tree/master/examples)

The **JavaScript Laboratory (JSLAB)** is an open-source environment designed for scientific computing, data visualization, and various other computer operations. Inspired by _GNU Octave_ and _Matlab_, **JSLAB** leverages the advantages of JavaScript, including its blazing speed, extensive examples, backing by some of the largest software companies globally, and the vast community of active programmers and software engineers.

![](resources/JSLAB_gui.png?v1)

The program was developed to fulfill the need for performing calculations in a programming language that allows for code reuse in later project stages. JavaScript was chosen for its speed, dynamic nature, interpretability, extensive library support, large existing codebase, backing by major software companies, and the ability to create both desktop and mobile applications.

**JSLAB** offers a streamlined, dual-window interface designed to boost productivity and foster innovation. The main window combines a versatile workspace with a sandbox terminal, allowing users to run, test, and iterate on code in real time. The dedicated editor window introduces the **.JSL file format**—a plain text format tailored for **JSLAB** scripts. With advanced linting and intelligent autocompletion, the editor makes it easy to write precise, reusable code with minimal errors.

### Try it online

Use JSLAB directly in your browser: [https://pr-dc.com/jslab/web/](https://pr-dc.com/jslab/web/)

### Why Choose JSLAB?

#### 🌟 Backed by Leading Investments

JavaScript is supported by major industry investments, ensuring continuous innovation and robust development. Our commitment to excellence makes **JSLAB** a trusted choice for professionals and organizations worldwide.

#### 🚀 Powered by JavaScript, Trusted by Giants

Join the ranks of top companies who leverage JavaScript for their mission-critical applications. With **JSLAB**, you benefit from the same reliable and scalable technology that powers some of the most advanced projects on Earth and beyond.

#### 👥 Thriving Community and Massive User Base

Become part of a vibrant and growing community of JavaScript developter. Extensive support network and active forums ensure you always have the resources and assistance you need to succeed.

#### 📈 Comprehensive Functionality Comparable to Leading Tools

**JSLAB** bridges the gap between JavaScript and specialized scientific tools. Enjoy functionalities equivalent to MATLAB, GNU Octave, Python, R, and Julia, all within a single, unified platform. Perform data analysis, machine learning, numerical computations, and more with ease.

#### 🎨 Seamless and Native GUI with HTML, CSS, and SVG

Design intuitive and visually appealing graphical user interfaces using native HTML, CSS, and SVG. Create interactive dashboards, custom visualizations, and responsive layouts without the need for additional frameworks.

#### 🔧 Extend with Native Modules via NPM and C++/C

Enhance **JSLAB**’s capabilities by integrating native modules from npm, built with C++ and C. Tap into a vast ecosystem of extensions and customize your environment to meet your specific needs, ensuring maximum performance and flexibility.

#### 🤖 AI Agents and MCP

Connect AI agents to the live JSLAB workspace through MCP. Agents can run calculations and scripts, inspect variables, check code, run test scripts and review plots while you follow their work in the desktop. See the MCP server section for setup and available tools.

#### Join the JSLAB Revolution Today!

Experience the seamless integration of powerful scientific computing and the flexibility of JavaScript. Whether you're developing complex algorithms, analyzing vast datasets, or creating innovative applications, **JSLAB** empowers you to achieve more.

### Citation

If you use **JSLAB** in research that leads to a publication, please cite the following conference paper:

Petrasinovic M., Raicevic N., Petrovic M., Grbovic A.: _JSLAB: An Open-Source JavaScript Environment for Scientific Computing and Visualization_, 4th EAI International Conference on Automation and Control in Theory and Practice (ARTEP 2026), Sromowce Niżne, Poland, 13-15 May 2026.

In BibTeX format:

@inproceedings{petrasinovic2026jslab,
  author = {Petrasinovic, M. and Raicevic, N. and Petrovic, M. and Grbovic, A.},
  title = {{JSLAB}: An Open-Source JavaScript Environment for Scientific Computing and Visualization},
  booktitle = {4th EAI International Conference on Automation and Control in Theory and Practice (ARTEP 2026)},
  address = {Sromowce Ni{\\v z}ne, Poland},
  year = {2026},
  month = may,
  note = {13--15 May 2026}
}

### License

Copyright (C) $JSLAB\_PUBLISH\_YEAR$ PR-DC info@pr-dc.com

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with this program. If not, see [https://www.gnu.org/licenses/](https://www.gnu.org/licenses/).

## About documentation

This documentation serves as a comprehensive guide for both users and contributors of the **JSLAB** Library. It covers an introduction to the project, detailed features, installation and setup instructions, user interface overview, practical examples, coding standards, build instructions, contribution guidelines, and mechanisms for providing feedback.

The documentation is structured to provide clear and detailed information, ensuring that both new users and seasoned contributors can effectively utilize and contribute to the **JSLAB** project.

## Coding style

### Documentation and Comments

Clear documentation is essential for maintaining and understanding the codebase. We utilize JSDoc for structured documentation and inline comments to clarify complex logic.

-   **JSDoc:** Use JSDoc comments to document files, classes, methods, parameters, and return values.
-   **Inline Comments:** Add comments to explain non-trivial code segments.

/\*\*
\* Constructs the JSLAB library environment.
\* @param {Object} config Configuration options.
\*/
constructor(config) {
  // Initialize properties
  this.config = config;
  // ... other initializations
}

### Naming Conventions

Names should be as descriptive as possible to enhance code readability and maintainability.

-   **Meaningful Names:** Choose self-explanatory names that clearly convey their purpose.
-   **Classes and Constants:** Use uppercase letters with underscores (e.g., `PRDC_JSLAB_LIB`, `CONSTANTS_LIKE_THIS`).
-   **Functions and Methods:** Use camelCase (e.g., `getFullFilePath`, `methodNamesLikeThis`).
-   **Variables:** Use lowercase letters with underscores (e.g., `new_file_path`, `variable_names_like_this`).
-   **Indexing:** Use concise names for indexing variables where necessary.

var variable\_names\_like\_this;
function functionNamesLikeThis() { }
class CLASS\_NAME\_LIKE\_THIS { }
methodNamesLikeThis() { }
const CONSTANTS\_LIKE\_THIS = 'value';


### Code Structure and Modularization

-   **Separation of Concerns:** Organize code into separate modules/files based on functionality.
-   **Object-Oriented Design:** Use ES6 classes to encapsulate related properties and methods.

const { PRDC\_JSLAB\_EVAL } = require('./jslab-eval');

class PRDC\_JSLAB\_LIB {
  constructor(config) {
  this.eval = new PRDC\_JSLAB\_EVAL(this);
  // ... other initializations
  }
}

### Error Handling

-   **Try-Catch Blocks:** Use try-catch to handle potential errors gracefully.
-   **Custom Errors:** Throw custom error objects for specific error scenarios.

try {
  return this.resolve(file\_path);
} catch {
  this.jsl.env.error('Path resolution failed.');
}

### State Management and Cleanup

-   **Resource Tracking:** Maintain arrays and objects to track active asynchronous operations.
-   **Cleanup Methods:** Implement methods to clear resources and reset the environment state.

### Configuration Management

-   **Centralized Configuration:** Use a dedicated class (`PRDC_APP_CONFIG`) to manage all configuration settings.
-   **Conditional Configurations:** Adjust settings based on the runtime environment or command-line arguments.

### Best Practices

-   **Consistent Formatting:** Use a consistent code formatter to maintain uniform code style.
-   **Meaningful Commit Messages:** Write clear and descriptive commit messages that explain the purpose of the changes.
-   **Modular Code:** Write reusable and modular code to enhance maintainability and scalability.
-   **Comprehensive Testing:** Implement thorough tests to ensure the reliability of your contributions.
-   **Character Encoding:** Code should be in UTF-8.
-   **Indentation:** Use two spaces for indentation instead of tabs.
-   **Trailing Spaces:** Do not include additional spaces at the end of lines.
-   **Space Before Curly Braces:** Always use a space before opening curly braces (`{`).
-   **Semicolons:** Always include semicolons at the end of statements.
-   **Logical Operators:** Always use spaces before and after logical operators.
-   **Unary Operators:** Unary operators applied to a single variable should not have spaces (e.g., `!y`).
-   **Unary Operators in Expressions:** Unary operators within expressions should have spaces before and after (e.g., `1 + 5`).
-   **Ternary Operators:** Always use spaces before and after ternary operators (e.g., `(x === undefined) ? 0 : 1`).
-   **Undefined Checks:** Variable definitions should be checked with strict equality against `undefined` (e.g., `x === undefined`).

var y = x > 5;

var x = !y;

var x = 1 + 5;
var str = 'x = ' + x + ' units';

var y = (x === undefined) ? 0 : 1;

x === undefined;

#### String

-   Always use single quotes for strings.

var text = 'String like this';

#### Objects

-   Create empty objects using `{}`.

var obj = { A: 1, B: 2, V: 3 };

#### Arrays

-   Create empty arrays using `[]`.

var arr = \[1, 2, 3\];

#### Control Structures and Loops

-   Do not use spaces after control statements (e.g., `if(x == 0)` instead of `if (x == 0)`).
-   Do not use spaces inside parentheses before and after expressions.

if(x == 0) {
  y = 5;
} else if(x == 1) {
  y = 10;
} else {
  y = 0;
}

switch(x) {
  case 0:
    y = 5;
    break;
  case 1:
    y = 10;
    break;
  default:
    y = 0;
}

for(let i = 0; i < cars.length; i++) {
  text += cars\[i\] + "
";
}

while(i < 10) {
  text += "The number is " + i;
  i++;
}

## Installation

You can install **JSLAB** by either downloading the latest stable release from GitHub or by building it from source. Choose the method that best fits your needs.

### Download the Latest Stable Release

-   Visit the **JSLAB** Releases Page on GitHub Repository: [https://github.com/PR-DC/JSLAB/releases](https://github.com/PR-DC/JSLAB/releases)
-   Download the appropriate installer and install program.
-   Try the examples from: [https://github.com/PR-DC/JSLAB/tree/master/examples](https://github.com/PR-DC/JSLAB/tree/master/examples)

### Build from Source

If you prefer to build **JSLAB** from source, follow the detailed [build instructions](#build-instructions) available in this documentation.

## Build instructions

### Prerequisites

In order to download necessary tools, clone the repository, and install dependencies via npm, you need network access.

-   **Node.js:** Ensure that Node.js is installed on your system. You can download it from the official website: [https://nodejs.org/](https://nodejs.org/)
-   **npm:** npm is typically installed alongside Node.js.
-   **Emscripten:** Install the SDK to compile the shared numerical and geometry backend. See [WebAssembly backend](#webassembly-backend) for setup instructions.
-   **node-gyp:** Included for compiling user extensions and third-party native dependencies. Required platform tools are described at [https://github.com/nodejs/node-gyp](https://github.com/nodejs/node-gyp).
-   **Git:** Suggested for cloning the repository. Download it from the official website: [https://git-scm.com/](https://git-scm.com/)

### Installation Steps

1.  Clone the JSLAB repository:

git clone git clone https://github.com/PR-DC/JSLAB.git

3.  Navigate to the project directory:

cd JSLAB

5.  Install the necessary dependencies:

npm install

7.  Start the application:

npm start

9.  Check examples from: [https://github.com/PR-DC/JSLAB/tree/master/examples](https://github.com/PR-DC/JSLAB/tree/master/examples)

## Getting Started

### Main Window

The image below shows the main window of the **JSLAB** program.

![](resources/JSLAB_main_window.svg?v1)

Within the main window, there are various shortcuts defined in the help window—for example, the CTRL + H shortcut opens the help window.

In the image above, the following elements of the main window are numbered:

1.  **Main Window Header**
    A menu with options for opening the code editor window, viewing help, accessing program information, and opening the program settings (such as language settings; currently, Serbian in both Latin and Cyrillic scripts and English are available).
2.  **Workspace Navigation**
    Icons for navigating through folders and opening a folder selection window. Besides the current workspace folder, you can save additional paths that will be used when running scripts.
3.  **Command Window**
    Located in the central right panel, this window displays messages from the workspace after code execution.
4.  **Command Input Field**
    Located at the bottom of the central right panel, this field is used to send commands to the workspace. As you type, suggestions for completing the command automatically appear based on the currently active workspace. You can also navigate through the history of entered commands. After typing a command and pressing ENTER, the command is executed in the workspace.
5.  **Status Bar**
    A bar at the bottom of the window displaying the current state of the workspace. In the bottom left corner, an icon changes color based on that state; clicking the icon displays a tooltip with information about what is currently active in the workspace.
6.  **Command History**
    Located in the lower part of the left central panel, this section allows you to track the sequence of executed commands and easily re-execute a command (by double-clicking on it).
7.  **Workspace Variables**
    In the central part of the left panel, this area displays the name, type, and class of each active global variable created by the user in the workspace.
8.  **File Browser**
    Located in the upper part of the left panel, this area shows folders and files, which can be directly opened within the editor.

> **Note:** The command window is ideal for entering a few commands. However, for more complex tasks, scripts are used.

* * *

### Editor Window

For **JSLAB** scripts, the `.jsl` extension is used to distinguish them from the standard `.js` extension for JavaScript. Scripts are executed by providing the script path as the sole argument to the `run` function. For writing or editing code in a script, it is best to use the built-in code editor (which can be opened with the editor command or the `edit()` function). The code editor window is shown in the image below.

![](resources/JSLAB_editor_window.svg?v1)

In the image above, the following elements of the code editor window are numbered:

1.  **Editor Window Header**
    At the very top of the window, there is a menu with options for creating new scripts, opening existing ones, saving open scripts, and directly executing scripts in the workspace.
2.  **Script Tabs**
    Located just below the header, these tabs allow you to switch between the active scripts being edited and to open or close scripts.
3.  **Script Text Editor**
    This is the area where the script code is displayed. As you type, suggestions for completing commands automatically appear based on the currently active workspace—similar to the command window. This text editor provides many advanced features for working with code, including syntax checking, suggestions, the ability to collapse certain code blocks, and highlighting of the current active line.

The editor also includes additional advanced features for code input, such as searching through the code and performing text replacements (the search popup can be opened by pressing CTRL + F).

Most importantly, code can be executed in two ways:

-   By entering commands in the command input field of the command window.
-   By running a script using the `run()` function or directly from the editor window.

* * *

### Programming

Programming in **JSLAB** is based on the full feature set of **JavaScript** and **Node.js**, combined with **HTML** and **CSS** for building graphical user interfaces (GUI). The application also provides a range of **built-in functions** that simplify certain tasks—like plotting with the `plot()` function. All implemented functions and classes are documented for easy reference.

#### Accessing Documentation

Multiple approaches are available to view documentation directly from **JSLAB**:

-   **Built-in help functions:** `help()`, `doc()`, `documentation()`, `helpSearch()`, `docSearch()`, `documentationSearch()`
-   **HTML documentation:** Openable via the `openDoc()` or `openDocumentation()` functions
-   **Function source code:** See the implementation of a built-in function with `source("functionName")` (e.g., `source("plot")`)

#### Working with Scripts and Examples

**JSLAB** scripts typically use a `.jsl` extension to distinguish them from standard `.js` files. You can run scripts from the command window with `run("scriptPath")`, or open them in the built-in editor (using the editor command or the `edit("scriptName.jsl")` function).

For bundled example scripts:

-   **List examples:** `getExamples()`
-   **Open a specific example:** `openExample("exampleName")`
-   **Open the examples folder:** `openExamplesFolder()`
-   **Navigate to the examples folder:** `goToExamplesFolder()`

#### Resetting the Environment

-   **Reset workspace (sandbox):** `resetSandbox()` clears current workspace variables.
-   **Reset the entire application:** `resetApp()` returns the application to its initial state.

#### Advanced Chromium Tools

Since **JSLAB** is built on **Chromium**, you can leverage its powerful developer tools for debugging and performance analysis:

-   `openDevTools()`: Open Developer Tools
-   `openWindowDevTools()`: Open Window Developer Tools

The **Performance** tab in the developer tools is particularly useful for optimizing your scripts, helping to identify potential slow-downs and bottlenecks.

## Examples

For latest examples, visit our **Discourse **at [https://discourse.jsl.pr-dc.com](https://discourse.jsl.pr-dc.com).

### Animated 2D Plot

A 2D plot animation like this is essential for visualizing real-time data changes, enabling dynamic tracking of evolving values and providing immediate insight into trends or fluctuations as they happen.

![](resources/JSLAB_2D_plot_animated.gif?v1)

// JavaScript Example
var N\_buffer = 500;
var t = toc();
var x = createFilledArray(N\_buffer, null); x\[0\] = t;
var y = createFilledArray(N\_buffer, null); y\[0\] = sin(t);
var p = plot({x: x, y: y});
xlabel("x");
ylabel("sin(x)");
title("Simple 2-D Plot");

await p.ready;
setInterval(function() {
  var t1 = toc();
  x.push(t1);
  y.push(sin(t1\*2));
  if(x.length > N\_buffer) {
    x.shift();
    y.shift();
  }
  p.update({x: \[x\], y: \[y\]}, 0);
}, 33);

### 3D Plot with Vectors

3D plots are essential for illustrating spatial relationships and complex vector interactions, allowing for a deeper understanding of data across three dimensions.

![](resources/JSLAB_3D_plot.png?v1)

// JavaScript Example
var x = \[0, 0, 0, 1, 0\];
var y = \[0, 0, 0, 1, 0\];
var z = \[0, 0, 0, 1, 0\];

var u = \[1, 0, 0, 1, -1\];
var v = \[0, 1, 0, 1, 0\];
var w = \[0, 0, 1, 1, 0\];

var head\_scale = 0.2;
var head\_angleFactor = 0.4;

var vectors = createVectors3D(x, y, z, u, v, w, head\_scale, head\_angleFactor, {color: "#0f0", width: 6});

figure(1);
plot(\[
  vectors.line, vectors.head
\], {'showLegend': false, 'font': {family: 'LatinModern', size: 14}});
xlabel("x");
ylabel("y");
zlabel("z");
xlim(\[-1, 3\]);
ylim(\[-1, 3\]);
zlim(\[-1, 3\]);

### 3D Graphics

3D graphics are vital for creating immersive visualizations that bring complex structures and spatial relationships to life, enabling a more intuitive understanding and interaction with digital models in fields like simulation, design, and data analysis.

![](resources/JSLAB_3D_graphics.png?v1)

// JavaScript Example
var win = await openWindow3D();
win.document.title = "Test 3D Window - JSLAB | PR-DC";
var THREE = win.THREE;

const width = win.innerWidth, height = win.innerHeight;

// init
const camera = new THREE.PerspectiveCamera( 70, width / height, 0.01, 10 );
camera.position.z = 1;

const scene = new THREE.Scene();

const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
const material = new THREE.MeshNormalMaterial();

const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( width, height );
renderer.setAnimationLoop( animate );
win.document.body.appendChild( renderer.domElement );

// Handle window resizing
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = win.innerWidth / win.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(win.innerWidth, win.innerHeight);
}

function animate( time ) {
  mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;

  renderer.render( scene, camera );
}

### Parallel Execution

Parallel execution is critical for handling computationally intensive tasks, as it allows multiple operations to run simultaneously, significantly reducing processing time and improving efficiency by utilizing all available CPU cores.

// JavaScript Example
var computeSquare = (i) => i \* i;

// Run parallel execution
var results = await parallel.parfor(0, 20, 1,
  parallel.getProcessorsNum(), {}, undefined, computeSquare);
disp(results);

### Vector and Matrix Operations

Vector and matrix operations are fundamental for efficiently performing complex mathematical computations in fields like physics, engineering, and computer graphics, enabling quick transformations, optimizations, and solutions in multidimensional spaces.

// JavaScript Example
var v1 = vec.new(1, 2, 3);
var v2 = vec.new(\[4, 8, 6\]);
const v\_cross = v1.cross(v2);

var A = mat.new(\[
    \[1, 2\],
    \[3, 4\]
\]);
const b = mat.new(\[
    \[5\],
    \[11\]
\]);
const x = A.linsolve(b);
disp('Solution to linear system A \* x = b:');
disp(x);

### Symbolic Math

Symbolic math computations are essential for achieving high precision in mathematical modeling, automating algebraic simplifications, and enabling dynamic formula manipulation, which enhances the accuracy and functionality of tools in scientific, engineering, and educational software.

![](resources/JSLAB_symbolic.png?v1)

// JavaScript Example
var le, x, E, Iz;
var p, P, invP, N, d2N;
var k\_int, k\_e\_stretching, k\_e\_torsion;
var xi = range(0, 1, 0.01);

await sym.load();
\[le, x, E, Iz\] = sym.syms(\['le', 'x', 'E', 'Iz'\]);

P = sym.mat(\[
  \[1, 0, 0, 0\],
  \[0, 1, 0, 0\],
  \[1, le, sym.pow(le, 2), sym.pow(le, 3)\],
  \[0, 1, sym.mul(2, le), sym.mul(3, sym.pow(le, 2))\]
\]);
p = sym.mat(\[\[1, x, sym.pow(x, 2), sym.pow(x, 3)\]\]);

invP = sym.inv(P);
N = sym.mul(p, invP);
d2N = sym.diff(N, 'x', 2);

k\_int = sym.mul(E, Iz, sym.intg(sym.mul(sym.transp(d2N), d2N), x, \[0, le\]));

Ni = sym.subs(sym.subs(N, le, 1), x, xi).toNumeric();
var N\_flat = Ni.flat();

sym.showLatex(N);
sym.showLatex(k\_int);

### FreeCAD Link

Integration with FreeCAD is essential for enabling automated, precise 3D modeling workflows within applications, allowing complex geometries, structures, and engineering designs to be generated, modified, and visualized programmatically, which significantly enhances productivity in design and simulation processes.

![](resources/JSLAB_FreeCADLink.png?v1)

// JavaScript Example
var nodes = \[
  \[0, 0, 0\],
  \[0, 10, 0\],
  \[10, 10, 0\],
  \[10, 0, 0\],
  \[0, 0, 10\],
  \[0, 10, 10\],
  \[10, 10, 10\],
  \[10, 0, 10\]
\];
var D = createFilledArray(nodes.length, 3);

var lines = \[\];
for(var i = 0; i < 4; i++) {
  var j = i+1;
  if(i == 3) {
    j = 0;
  }
  lines.push(\[...nodes\[i\], ...nodes\[j\]\]);
  lines.push(\[...nodes\[i+4\], ...nodes\[j+4\]\]);
  lines.push(\[...nodes\[i\], ...nodes\[i+4\]\]);
}
var d = createFilledArray(lines.length, 1);

// Generate JSON
var nodesFile = pwd + 'out/nodes.json';
var data = {
  'Coordinates': nodes,
  'Diameters': D
};
writeFile(nodesFile, stringify(data));
var data = {
  'Coordinates': lines,
  'Diameters': d
};
var beamsFile = pwd + 'out/beams.json';
writeFile(beamsFile, stringify(data));

// Run FreeCADLink
await freecad\_link.start(exe, {
  port: port,
  host: host,
  timeout: timeout,
  startup\_timeout: startup\_timeout
}); // Start FreeCAD program

await freecad\_link.newDocument(part);
await freecad\_link.callScript('MakeNodes', nodesFile, timeout);
await freecad\_link.callScript('MakeBeams', beamsFile, timeout);
await freecad\_link.callScript('MakeFusion', \[\], timeout);
await freecad\_link.saveAs(model, timeout);
//await freecad\_link.quit(); // Close program

deleteFile(nodesFile);
deleteFile(beamsFile);

### OpenModelica Link

Integration with OpenModelica is crucial for enabling advanced simulation and analysis of complex dynamic systems directly within applications, allowing engineers to model, test, and optimize system behavior seamlessly, which enhances efficiency in design and validation processes.

// JavaScript Example
await om\_link.start(exe); // Start OpenModelica program
disp(await om\_link.sendExpression('getVersion()'));

disp(await om\_link.sendExpression("model a end a;"));
disp(await om\_link.sendExpression('loadFile("'+model+'")'));
disp(await om\_link.sendExpression("getClassNames()"));
disp(await om\_link.sendExpression("simulate(BouncingBall)"));
await om\_link.close();****

## Contributing

### Setting Up the Development Environment

Follow the detailed [build instructions](#build-instructions) available in this documentation.

### Making Changes

Follow the [coding style and best practices](#coding-style) available in this documentation.

### Submitting Changes

1.  Create a new branch for your feature or bugfix:

git checkout -b feature/your-feature-name

3.  Make your changes and commit them with clear messages:

git commit -m "Add feature X to improve Y"

5.  Push your branch to your forked repository:

git push origin feature/your-feature-name

7.  Submit a Pull Request (PR) detailing your changes.

### Testing

Before submitting a PR, ensure that all tests pass and add new tests for any new functionality you introduce.

### Reviewing Process

All PRs are subject to review by the maintainers. Be prepared to make revisions based on feedback to align with project standards.

### Best Practices

-   **Consistent Formatting:** Use a consistent code formatter (e.g., Prettier) to maintain uniform code style.
-   **Meaningful Commit Messages:** Write clear and descriptive commit messages that explain the purpose of the changes.
-   **Modular Code:** Write reusable and modular code to enhance maintainability and scalability.
-   **Comprehensive Testing:** Implement thorough tests to ensure the reliability of your contributions.

## Feedback

Your feedback is invaluable in improving the **JSLAB** application. Whether you encounter bugs, have feature requests, or need assistance, please reach out through the following channels:

-   **GitHub Issues:** Report bugs or suggest features by opening an issue in the GitHub repository.
-   **Discourse:** Write a New Topic at [https://discourse.jsl.pr-dc.com/](https://discourse.jsl.pr-dc.com/)
-   **Email:** Contact us directly at [info@pr-dc.com](mailto:info@pr-dc.com) or main author at [mpetrasinovic@pr-dc.com](mailto:mpetrasinovic@pr-dc.com).

We encourage active participation and appreciate all forms of feedback that help us enhance the functionality and usability of **JSLAB**.

## Command-line interface

JSLAB provides a Windows terminal interface for interactive calculations and automated .jsl scripts. It starts a dedicated Electron session with the main and editor windows hidden and uses the same persistent workspace, evaluator, scientific modules and WebAssembly backend as the desktop application. Each CLI process owns its session; it does not attach to or change an existing desktop workspace.

### Start the CLI

The Windows installer registers the installation directory in PATH: system-wide for an all-users installation, or in the user PATH for a per-user installation. Open a new PowerShell or Command Prompt window and run:

```powershell
jslab
```

Packaged applications include the CLI runtime; a separate Node.js installation is not required. Portable and unpacked applications include jslab.cmd beside the executable. Run that launcher directly or add its directory to PATH. From a source checkout with dependencies and WASM bundles prepared, run:

```powershell
npm run cli
npm run cli -- -e "6 * 7"
```

To register the source checkout's jslab command through npm, use npm link --ignore-scripts. The source CLI requires Node.js and the checkout's installed Electron dependency. The Windows launcher is generated during packaging; PATH registration is handled directly by the NSIS installer without a PowerShell helper.

### Interactive commands

Running jslab opens the REPL. Running jslab script.jsl in a terminal executes that script first, then opens the same REPL with the script's variables, working directory and figures preserved. Script errors are reported and the REPL remains available for inspection. Use --batch to execute a script and exit. The --json and -e options and redirected standard input also run without a REPL.

Enter JavaScript and JSLAB functions at the jslab> prompt. Variables remain available until the workspace is cleared or the CLI exits. Unfinished blocks, expressions, comments and template literals continue at the ... prompt. Top-level await is supported.

| Command | Action |
| --- | --- |
| .help | Show terminal commands. |
| .exit or .quit | Close the session and exit. |
| .clear | Clear the workspace. |
| .workspace | List workspace variables. |
| .load path | Run a .jsl script in the current workspace. Quote paths containing spaces. |
| .cd directory | Change the working directory. |
| .pwd | Show the working directory. |

Ctrl+C clears unfinished input or interrupts a running operation. Interruption does not require loop checkpoints and preserves completed workspace assignments. Press Ctrl+C again while the same operation is still running to close the owned runtime. Ctrl+C at an empty prompt and Ctrl+D close the session.

History is stored in JSLAB/cli-history.json under APPDATA on Windows. Use --no-history to disable storage or --history-file to choose another path. Closing the CLI stops its owned runtime; the runtime also exits if the CLI process disappears. Temporary session profiles are removed on normal exit.

### Plots and figure windows

CLI plots use real interactive JSLAB figure windows with the normal plotting controls. The main and editor windows stay hidden. Enter plotting commands in the REPL or include them in the startup script:

```javascript
plot([0, 1, 2], [0, 1, 4]);
xlabel('Time');
ylabel('Value');
title('CLI plot');
```

After a startup script finishes, its figures stay open while the REPL is active. You can update plots, open more figures or close a figure without leaving the prompt. Exiting the CLI closes its owned figure windows.

Batch execution closes the runtime and its figures when the script finishes. Export figures before exit when using --batch, --json, -e or redirected input:

```javascript
plot([0, 1, 2], [0, 1, 4]);
await printFigure('result.png');
```

### Scripts and pipelines

```powershell
jslab -e "trapz([0, 1, 2])"
jslab .\analysis.jsl -- "input data.csv" --verbose
jslab --batch .\analysis.jsl
jslab --cwd C:\data .\analysis.jsl
jslab --json -e "roots([1, 0, -1])"
Get-Content -Raw .\analysis.jsl | jslab -
jslab --timeout 30 .\analysis.jsl
```

Arguments after -- are available as the workspace array argv. The initial working directory is the invoking terminal's directory unless --cwd is supplied. Script paths are resolved from the invoking directory. A script runs in the current workspace directory; its location does not automatically change that directory. The .load and .cd terminal commands resolve relative paths from the current workspace directory.

A positional argument is a .jsl script path. Use -e or --eval to evaluate code and exit. PowerShell accepts single or double quotes for the code argument; Command Prompt uses double quotes for arguments containing spaces.

Without code or a script argument, redirected standard input is executed as one script. The explicit - argument also reads standard input. Standard input is used for program source in this mode, rather than interactive data entry.

### Options and exit codes

| Option | Meaning |
| --- | --- |
| -e or --eval code | Evaluate code and exit. |
| --batch | Run a script and exit without opening the REPL. |
| --cwd directory | Set the initial working directory. |
| --timeout seconds | Limit each operation; default is unlimited. |
| --json | Emit a structured batch result with success, value preview, output and errors. |
| --no-history | Disable interactive history. |
| --history-file path | Choose the interactive history file. |
| -v or --version | Print the version without starting Electron. |
| -h or --help | Print usage without starting Electron. |

Batch exit codes are 0 for success, 1 for evaluation or runtime failure, 2 for invalid invocation, 124 for timeout and 130 for terminal interruption. Interactive evaluation and startup-script errors are reported and the prompt remains available. A normal REPL exit returns 0. JSON mode implies batch execution and emits the result on stdout; command-line validation errors go to stderr.

The CLI uses the local automation execution path. Code and scripts are limited to 512000 characters, captured output to 200 entries and 64000 characters, and returned value previews are bounded. Truncation is reported. Use file exports for large results. Captured output is displayed when an operation completes. Figures and explicitly requested graphical tools can open windows; the CLI still requires a working Electron graphical environment. It runs with the user's file, process and device permissions.

## WebAssembly backend

Desktop and browser JSLAB use the same compiled C++ numerical and AlphaShape implementations through WebAssembly. The numerical backend provides roots, trapz and cumtrapz. The geometry backend provides shape construction, alpha selection, boundary facets, triangulation, point classification, nearest-neighbor queries and mesh simplification.

There are no application-owned Node-API computational addons or JavaScript numerical fallback implementations. Required compiled bundles must be present before the workspace starts. Missing or incompatible bundles produce a startup error.

### Build the compiled modules

Install Node.js, npm, Git and an activated Emscripten SDK before installing JSLAB from source. Emscripten 7.0.0 was used to validate this backend. The build script checks EMSDK, then bin/emsdk inside the repository, and also accepts EMCC and EMXX overrides.

For a repository-local SDK:

```sh
git clone https://github.com/emscripten-core/emsdk.git bin/emsdk
python bin/emsdk/emsdk.py install 7.0.0
python bin/emsdk/emsdk.py activate 7.0.0
npm install
```

The installation script extracts the bundled C++ libraries and builds both WASM modules. To rebuild them after changing C++ code:

```sh
npm run build-native-wasm
```

Generated bundles and their manifest are written to lib/native-wasm. They are generated build artifacts, excluded from Git and included in packaged applications. End users of packaged releases do not need Emscripten. Build, packaging and web-distribution scripts compile these modules before preparing their output.

### Runtime organization

- cpp/native-module-core.h and cpp/alpha-shape-3d-core.h contain the computational implementations.
- cpp/native-module-wasm.cpp and cpp/alpha-shape-3d-wasm.cpp expose the compiled operations.
- js/sandbox/jslab-wasm-loader.js initializes one pair of modules per sandbox or worker.
- js/sandbox/jslab-wasm-native.js validates numeric inputs and owns temporary WASM buffers.
- js/sandbox/jslab-wasm-alpha-shape.js owns shape instances and routes file exports through the host environment.
- Desktop and browser environments provide host services. Subprocess enumeration stays in the desktop environment.

The public numerical and geometry function names remain unchanged. The workspace starts only after both compiled modules have initialized. Early desktop IPC messages are replayed after initialization, and parallel workers initialize their own compiled modules before accepting tasks.

### Resource ownership and numerical behavior

Temporary numerical buffers are freed even when a calculation fails. Geometry helpers release their shape objects in finally blocks. Code that directly creates a low-level AlphaShape instance must call dispose() or delete() when finished; finalization is only a backup.

Geometry errors are reported as JavaScript errors. Coplanar input is rejected for three-dimensional shape construction. OFF exports use the environment file API so desktop files and browser storage follow their normal host behavior.

The build enables WASM SIMD. CGAL uses conservative interval arithmetic under round-to-nearest with an exact arithmetic backend that does not require the desktop GMP/MPFR DLLs. Numerical result and geometry regression tests run against the compiled modules.

WASM and native speed depend on input size, binding overhead and the algorithm. Integration benchmarks can benefit from bulk array transfer; geometry may be slower than an optimized native build. Treat development timings as workload-specific measurements.

### Native dependencies and extension support

Serial, USB and terminal dependencies may still use third-party native addons. The compile module and its local node-gyp dependency remain available for users building their own extensions. Replacing the application computational backend does not remove those capabilities.

## MCP server

The JSLAB Model Context Protocol (MCP) server lets AI agents execute code in a running desktop session, inspect workspace variables, analyze scripts, read function documentation and export figures. Calculations and plots appear in the same JSLAB session used by the user. The workspace persists between calls.

### Start a shared session

Install the project dependencies using the normal JSLAB installation procedure. The MCP adapter requires Node.js 18 or later, separately from the Node.js runtime included in Electron.

From the repository root, start JSLAB with agent access enabled:

```powershell
npm start -- --mcp
```

For an installed desktop application, pass `--mcp` to its executable. Agent access is disabled when this argument is absent. The browser version does not support this desktop bridge.

JSLAB creates a session descriptor named `jslab-mcp-<pid>.json` in the operating system temporary directory. The descriptor contains a random authentication token and the port of a bridge listening exclusively on `127.0.0.1`. JSLAB removes its descriptor during normal shutdown. Treat the descriptor as a local credential and do not commit or share it.

### Connect an agent

Configure the MCP client to launch the adapter directly with Node.js. Use absolute paths, including an absolute path to `node.exe` if Node.js is absent from the client's PATH. For a repository at `C:\github\JSLAB`, a client using the common `mcpServers` JSON format can use:

```json
{
  "mcpServers": {
    "jslab": {
      "command": "node",
      "args": ["C:\\github\\JSLAB\\js\\mcp\\server.js"]
    }
  }
}
```

The adapter uses MCP over stdio. Its stdout is reserved for protocol messages; diagnostics go to stderr. Launch `node js/mcp/server.js` directly from clients, since npm startup messages can interfere with stdio. `npm run mcp` is provided for terminal use.

The adapter automatically selects a session when exactly one live shared session exists. If several sessions exist, inspect `list_sessions`, then configure the adapter with an explicit process ID:

```json
"args": ["C:\\github\\JSLAB\\js\\mcp\\server.js", "--pid", "12345"]
```

Alternatively, use `--session-file` followed by the descriptor's absolute path. These selection options are mutually exclusive. An explicit selection also keeps the adapter attached to the intended session. For a packaged installation, the adapter is in the application's `resources/app/js/mcp/server.js`; its dependencies must remain alongside the application files.

### Available tools

| Tool | Purpose |
| --- | --- |
| `list_sessions` | List live shared desktop sessions without exposing credentials. |
| `get_session_status` | Read the session PID, application version, readiness, busy state and active execution ID. |
| `get_runtime_info` | Read runtime versions, platform, working directory and configured module names. |
| `evaluate_code` | Execute JavaScript in the persistent JSLAB workspace. |
| `run_file` | Execute an absolute `.jsl` file path. |
| `run_test_file` | Execute a `.jsl` test script that throws or asserts on failure. |
| `check_code` | Run ESLint syntax checks and selected correctness rules without executing the file. |
| `list_workspace` | List up to 1000 user variables with their JavaScript types and class names. |
| `read_variable` | Read a bounded value preview without invoking accessor variables or custom inspection. |
| `list_figures` | List open figure IDs and the active figure. |
| `export_figure` | Export an existing figure using an absolute output path. |
| `get_help` | Read function documentation by name, `lib.function`, or category. |
| `get_execution` | Poll an execution or retrieve its completed result. |
| `interrupt_execution` | Interrupt JavaScript and clean up registered resources; preserve workspace values. |

`evaluate_code`, `run_file` and `run_test_file` accept an optional absolute `cwd`. It changes the shared working directory and remains in effect after the call. A script's location does not automatically become its working directory. Script execution uses JSLAB's evaluator, including its code rewriting, workspace persistence and source error handling. Input scripts and code are limited to 512000 bytes or characters respectively.

`check_code` returns `value.diagnostics` with ESLint severity and source positions. A successful analysis operation may contain error diagnostics: inspect the returned diagnostic list. At most 200 diagnostics are returned, with `diagnostics_truncated` indicating omitted entries. It checks standard JavaScript module syntax and selected rules; it does not validate every JSLAB function or run the code.

`run_test_file` runs assertion-based `.jsl` scripts. It reports execution success or failure and captured output; it does not discover test suites or calculate individual assertion counts. For example:

```javascript
var values = [1, 2, 3];
if(values.reduce((a, b) => a + b, 0) !== 6) {
  throw new Error('Unexpected sum');
}
console.log('Sum test passed');
```

Figure export supports PNG, SVG, PDF, JPEG, WebP, HTML and JSON. PNG, JPEG and WebP files up to 4 MiB are also returned as MCP image content. The destination directory must already exist. Export overwrites the destination file using JSLAB's normal export behavior.

### Execution results and interruption

Sandbox operations receive an `execution_id`. The adapter waits up to 10 seconds by default. Set `wait_ms` between 0 and 10000 to return sooner. A typical completed response has this structure:

```json
{
  "execution_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "started_at": 0,
  "duration_ms": 12,
  "result": {
    "success": true,
    "value": { "preview": "6", "cwd": "C:\\work\\" },
    "output": [],
    "output_truncated": false,
    "error": null
  }
}
```

A response with `status: "running"` means execution continues. Call `get_execution` with its ID before submitting more work. The session retains its most recent 20 execution records. Resetting the sandbox fails an active execution; restarting the application discards execution records.

Only one sandbox operation runs at a time. Overlapping agent operations and GUI code submissions receive a busy response. Session status, execution polling and interruption remain available while code runs. A lost connection or a client timeout does not cancel execution: inspect status before retrying a command with side effects.

Ctrl+C and `interrupt_execution` terminate JavaScript through the main-process debugger without loop checkpoints. Acknowledgement means interruption was requested; poll the execution until completion. The workspace and completed assignments survive, while the interrupted function stack is discarded. Interruption does not roll back partially modified objects.

Registered cleanup runs after the interrupted stack has unwound, in a separate evaluation. Timers, animation/idle callbacks, JSLAB workers and registered subprocesses are stopped. Use `jsl.addForCleanup(object, callback)` to register resource cleanup; asynchronous callbacks are awaited, cleanup failures are returned as `cleanup_errors`, and the remaining cleanup still runs. JavaScript `finally` blocks are not a substitute for this registration because V8 termination can bypass them. Arbitrary external operations and promises are not automatically reversible or cancellable. Blocking native calls may delay interruption; sandbox reset is the last resort and discards the workspace.

Execution controls are in the Editor beside the source. Its existing Run action becomes Pause while code is running and Continue while paused. Compact icons provide Step over (F10), Step into (F11), Step out (Shift+F11), and Stop. The icons appear during execution and disappear when it ends. The call stack opens in a resizable split below the Editor source when execution pauses. The Editor bug icon shows or hides it; the Command Window bug icon opens the Editor with this split visible. Hiding the split does not resume execution or change the selected frame. Its Advanced section contains exception preferences, child-worker selection when workers exist, live editing, frame restart and browser workspace reset; historical async calls are also collapsed there. User-facing stacks omit JSLAB runtime frames. Finishing a step does not open internal files. While paused, selecting a call frame shows its locals in the existing Workspace. Use the normal Workspace inspection action and variable inspector to inspect or edit those locals; the Command Window also evaluates expressions in that frame. Descriptor previews do not invoke getters. Old inspector controls reject edits after a frame change or resume. Debugging stays inside the existing Editor window on desktop and in the browser. The split uses the existing panel resizer and remembers its height. `debugger;`, `breakpoint;`, `debug;` and `pause;` create real debugger pauses rather than modal dialogs. `stoppoint;` requests interruption. `logpoint;` and `updatepoint;` refresh the workspace without polling interruption flags.

| Debugger tool | Purpose |
| --- | --- |
| `get_debug_state` | Read state, stack frames and scope object handles. |
| `pause_execution` | Request a pause at the next JavaScript statement. |
| `resume_execution` | Continue, or pass `action: "stepOver"`, `"stepInto"` or `"stepOut"`. |
| `inspect_debug_object` | Read a scope/object by `object_id` without invoking accessors. |
| `evaluate_debug_expression` | Evaluate `expression` in `frame_index`; side effects require `allow_side_effects: true`. |
| `set_breakpoint` | Set an original-source `path` and one-based `line`, optional `condition`, and `enabled` state. |
| `remove_breakpoint` | Remove a logical breakpoint by returned `id`. |
| `clear_breakpoints` | Clear line breakpoints and exception stops. |
| `set_exception_pause` | Choose `none`, `uncaught` by user code, or `all` exceptions. |
| `select_debug_target` | Select a paused worker `session_id`, or omit it to select the main sandbox. |
| `update_debug_script` | Validate (`dry_run`) or apply saved/source code while paused; active-frame editing requires `allow_top_frame_editing`. |
| `restart_debug_frame` | Restart the selected `frame_index`; earlier side effects can execute again. |

Read debugger state after a pause request to confirm suspension. Paused frame and scope handles expire when execution resumes. Worker pauses are coordinated and acknowledged independently; they do not form an instantaneous snapshot. Native calls and external processes are not frozen by a JavaScript pause. Opening sandbox DevTools is allowed while idle; close it to restore JSLAB's debugger controller before running another calculation.

Click a line number to add a source breakpoint. A compact breakpoint gutter appears to the left of the line numbers and disappears after the last breakpoint is removed. Click a marker to remove it; Shift-click opens its condition and enabled-state editor. The paused source opens automatically and its current line is highlighted. Desktop settings survive application restarts; browser settings survive page reloads. A disabled breakpoint remains saved. Conditions are JavaScript expressions evaluated in the breakpoint's scope, and can have side effects.

The command window accepts `dbstop in "file.jsl" at 12 if index === 3`, `dbstop if error`, `dbstop if caught error`, `dbclear all`, `dbclear("file.jsl", 12)`, `dbclear if error`, `dbstatus`, `dbstack`, `dbcont`, `dbstep in`, `dbstep over`, `dbstep out`, `dbup`, `dbdown`, and `dbquit`. These host commands remain available while execution is paused. Script code can use `await dbstop(path, line, condition, enabled)`, `await dbstop('error')`, `await dbstop('caught error')`, `await dbclear(path, line)`, `await dbclear()`, and `await dbstatus()`. `keyboard;` is an alias for a debugger pause.

An exception stop pauses before the instrumented function's scope is released; caught-error mode also stops in user catch handlers. Error reporting after an exception has unwound remains separate from this debugger feature. Browser frames backed by retained lexical closures can be selected for inspection and deliberate modification, including recursive and available async caller frames. Frames without a retained closure are displayed but cannot be inspected. Engine-created async ancestry is not a complete history of all prior calls.

See `examples/exampleInterruption.jsl` and `examples/exampleDebugger.jsl`.

The web edition uses one persistent scientific Worker workspace for commands, editor execution, variable inspection, figures and debugging. Browser objects stay on the responsive UI thread; synchronous references expose DOM properties, methods and constructors to scientific code, while callbacks return asynchronously to their original Worker closures. Browser promises can be awaited. Registered event listeners are removed on interruption without replacing the application document. A callback cannot synchronously return a Worker value to a native browser caller, and delayed event callbacks cannot cancel an event already dispatched. Browser hosting must use HTTPS (or localhost) and send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. The web build includes an `_headers` file for compatible static hosts; configure these headers explicitly on other servers. Resources loaded from other origins must also satisfy the browser's embedding policy. Without isolation the application explicitly falls back to the legacy iframe runtime, without Worker debugger guarantees.

Browser child Workers have their own initialized scientific runtime and debugger target. Select a target to inspect and modify its retained locals or step its code; Continue resumes suspended targets and Stop terminates owned children. Child message handlers receive user messages separately from private debugger messages.

The web debugger inserts synchronous source checkpoints automatically, including inside otherwise empty loops. User scripts do not call `checkStop`, and ordinary functions stay synchronous. A pause retains the current function's lexical scope for inspection and deliberate console evaluation. Select available caller frames in the stack or use `dbup`/`dbdown`. Object inspection uses bounded own-property descriptors and displays accessors without invoking their getters. Ctrl+C also cancels awaited timers and instrumented background callbacks. Browser native/Wasm calls that do not return to JavaScript require **Reset**, which terminates the Worker and discards that workspace.

For native work that must be cancellable while retaining parent variables, use `await runInterruptible(function, args, options)`. It runs a function in an owned desktop process or browser child Worker and copies arguments/results. The function can use that runtime's scientific commands but must not depend on caller closures. `options.timeout_ms` and `options.signal` provide a timeout and explicit AbortSignal; Ctrl+C also cancels owned jobs. For example, `await runInterruptible(values => new Float64Array(Array.from(values, x => x * 2)), [new Float64Array([1, 2, 3])])`. Hard cancellation discards only the isolated runtime. It cannot roll back files, device effects or other external work already performed. Desktop sessions allow up to four such jobs concurrently.

The Editor debugger areas show bounded asynchronous scheduling ancestry, separately from inspectable live scopes. Desktop captures up to 128 history entries; browser scheduling history is also bounded. Historical locals are unavailable after their frames have disappeared. Desktop **Apply saved source** uses V8 live editing and reports engine restrictions instead of silently restarting execution. **Restart frame** is explicit because side effects can repeat. Browser **Apply saved functions** replaces ordinary function definitions for future calls without rerunning top-level initializers; executing frames retain their original code and locals. Browser frame restart and arbitrary active-code replacement are unavailable through ordinary page APIs.

JSLAB retains its shared source rewriter for persistent workspace properties, `clear`, script/module adaptation and expression results. DevTools' native REPL supports persistent lexical declarations and top-level await, but those declarations do not have JSLAB's deletable workspace-property semantics, and normal web pages cannot access the Chrome debugging protocol. Source maps translate generated locations back to original scripts, including selected-line offsets and functions retained from earlier evaluations.

Failed agent executions include structured `error_details`: `name`, `message`, `kind`, original `location` (`path`, one-based `line` and `column`), `frames`, and `stack`. Nested `run` calls and CommonJS module failures preserve their originating file and caller frames. Syntax errors, awaited rejections and primitive thrown values use the same reporting path. Detached callback/rejection errors are reported independently and do not complete an unrelated evaluation.

Run desktop debugger/error integration checks with `node js/dev/run-debugger-tests.js --sandbox-suite`; this starts an isolated JSLAB desktop session and tests its MCP interface. Run browser checks with `node js/dev/run-web-gui-tests.js`.

Results contain bounded textual previews rather than a lossless serialization of arbitrary objects. Output captures JSLAB display, warning and error methods, including the JSLAB console. Capture ends when the requested operation completes; detached asynchronous work can continue afterward. Output is limited to 200 messages and 64000 characters, and previews to 16000 characters. Inspect selected variables or save large results to files when needed.

### Agent guidance and access

The server exposes `jslab://agent-guide` from [AGENTS.md](../AGENTS.md) and `jslab://mcp-guide` from this documentation section. Agents should start with session status, consult `get_help` for unfamiliar functions, execute small steps, and inspect output and figures before continuing.

Enabling access authorizes code execution with the desktop user's existing JSLAB permissions, including file, process, network and device access. The loopback bridge authenticates each request and rejects browser-origin requests. MCP is an interface to the existing runtime, not an additional execution sandbox. Close the shared session and restart without `--mcp` to disable access.

If no session is found, check that JSLAB was started with `--mcp` under the same user and temporary-directory environment as the adapter. If multiple sessions are found, select one explicitly. If a selected session has exited, restart JSLAB and update its PID or descriptor path. Stale descriptors from crashes are ignored during automatic discovery.

## Code references

### Global functions and properties

#### basic

##### `dbstop(path, [line], [condition], [enabled])`

Sets a conditional source breakpoint or enables an error breakpoint.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | Script path, 'error', or 'caught error'. |
| `line` | `number` | One-based line. Optional. Default: `1`. |
| `condition` | `string` | Condition evaluated in the paused scope. Optional. Default: `''`. |
| `enabled` | `boolean` | Breakpoint enabled state. Optional. Default: `true`. |

**Returns:** `Promise.<Object> | Object` Updated debugger configuration.

##### `dbclear([path], [line])`

Clears one breakpoint or all line/error breakpoints.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | Script path or 'all'. Optional. Default: `'all'`. |
| `line` | `number` | One-based line. Optional. |

**Returns:** `Promise.<Object> | Object` Updated debugger configuration.

##### `dbstatus()`

Returns current line and exception breakpoint settings.

**Returns:** `Promise.<Object> | Object` Debugger state and breakpoint configuration.

##### `ans`

Stores the result of the last evaluated expression.

##### `clear()`

Clears all defined variables in the current context.

##### `clc()`

Clears the console screen.

##### `cls()`

Clears the console screen. Alias for `clc`.

##### `beep()`

Plays the operating system beep sound.

**Returns:** `boolean` True when the beep request was accepted.

##### `version`

Returns the current version of the JSLAB.

##### `platform`

Returns the platform on which JSLAB is running.

##### `jsl_file_name`

Returns the file name of the current JSLAB script.

##### `info()`

Provides information about the current environment.

##### `settings()`

Accesses or modifies the user settings for JSLAB.

##### `cmd_help()`

Provides help information for JSLAB commands.

##### `editor()`

Accesses the code editor interface within JSLAB.

##### `pwd`

Returns the current working directory.

##### `breakpoint()`

Sets a breakpoint in the code for debugging.

##### `debug_flag`

Returns the current debug flag status.

##### `debug`

Enables or disables debug mode.

##### `pause()`

Pauses the execution of the current script.

##### `stoppoint()`

Sets a stop point in the script execution.

##### `logpoint()`

Sets a log point to record information during execution.

##### `updatepoint()`

Updates specific points in the script during execution.

##### `endPoint()`

Marks the endpoint of a script or process.

##### `run(script_path, lines, [silent], [force_run])`

Runs a script from a specified path, optionally focusing on specific lines and controlling output visibility.

| Parameter | Type | Description |
| --- | --- | --- |
| `script_path` | `string` | The path to the script to run. |
| `lines` | `Array.<number>` | An array of line numbers to run or focus on within the script. |
| `silent` | `boolean` | Whether to suppress output from the script execution. Optional. Default: `false`. |
| `force_run` | `Boolean` | If true, forces the script to run even if stop conditions are met. Optional. Default: `false`. |

##### `jslFileName()`

Retrieves the file name of the currently active JSL script.

**Returns:** `string` The file name of the JSL script.

##### `clearStorage()`

Clears the application's local storage.

##### `savePath(new_path)`

Saves a path to the application's list of saved paths.

| Parameter | Type | Description |
| --- | --- | --- |
| `new_path` | `string` | The path to save. |

##### `removePath(saved_path)`

Removes a previously saved path from the application's list of saved paths.

| Parameter | Type | Description |
| --- | --- | --- |
| `saved_path` | `string` | The path to remove. |

##### `addpath(args)`

Adds one or more paths to the search path list.
Alias compatible with MATLAB/Octave `addpath`.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | Path entries to add. |

**Returns:** `Array.<string>` Updated search path entries.

##### `rmpath(args)`

Removes one or more paths from the search path list.
Alias compatible with MATLAB/Octave `rmpath`.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | Path entries to remove. |

**Returns:** `Array.<string>` Updated search path entries.

##### `path(args)`

Retrieves or sets the active search path list.
Compatible with MATLAB/Octave `path`.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | Path entries to set. |

**Returns:** `Array.<string>` Active search path entries.

##### `ls([target])`

Lists contents of a folder or wildcard target.
Compatible with MATLAB/Octave `ls`.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `string` | Folder, file, or wildcard. Optional. |

**Returns:** `Array.<string>` Entry names.

##### `dir([target])`

Lists directory entries with metadata.
Compatible with MATLAB/Octave `dir`.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `string` | Folder, file, or wildcard. Optional. |

**Returns:** `Array.<Object>` Directory entries.

##### `isfile(path_in)`

Returns true when the path resolves to a file.
Compatible with MATLAB `isfile`.

| Parameter | Type | Description |
| --- | --- | --- |
| `path_in` | `string` | Path or symbol. |

**Returns:** `boolean`

##### `isfolder(path_in)`

Returns true when the path resolves to a folder.
Compatible with MATLAB `isfolder`.

| Parameter | Type | Description |
| --- | --- | --- |
| `path_in` | `string` | Path or folder symbol. |

**Returns:** `boolean`

##### `exist(name, [kind])`

Checks existence with MATLAB-compatible return codes.
`1` variable, `2` file, `5` built-in, `7` directory, `0` missing.
Supports typed queries: `'var'`, `'file'`, `'dir'|'folder'`, `'builtin'`.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Symbol or path. |
| `kind` | `string` | Optional query kind. Optional. |

**Returns:** `number` Existence code.

##### `which(name)`

Resolves a file/module using the active search path.
Compatible with MATLAB/Octave `which`.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | File/module name. |

**Returns:** `string | boolean` Resolved absolute path, or false if not found.

##### `who(names)`

Lists workspace variable names.
Compatible with MATLAB/Octave `who`.

| Parameter | Type | Description |
| --- | --- | --- |
| `names` | `string` | Optional names to filter. |

**Returns:** `Array.<string>` Variable names.

##### `whos(names)`

Lists workspace variable descriptors (name/type/class).
Compatible with MATLAB/Octave `whos`.

| Parameter | Type | Description |
| --- | --- | --- |
| `names` | `string` | Optional names to filter. |

**Returns:** `Array.<Array.<string>>` Workspace descriptor rows.

##### `cd(new_path)`

Changes the current working directory to the specified path.

| Parameter | Type | Description |
| --- | --- | --- |
| `new_path` | `string` | The new path to set as the current working directory. |

##### `workspace()`

Retrieves the current workspace.

**Returns:** `Object` The current workspace object.

##### `updateWorkspace()`

Updates the workspace display based on the current state.

##### `updateFileBrowser()`

Updates the file browser display based on the current state.

##### `diary([mode_or_file])`

Controls command window transcript logging.
`diary()` toggles logging, `diary('on')` enables, `diary('off')` disables,
and `diary('<file>')` enables logging to the specified file (append mode).

| Parameter | Type | Description |
| --- | --- | --- |
| `mode_or_file` | `string \| boolean` | Mode token or log file path. Optional. |

**Returns:** `boolean` True when command was accepted.

##### `error(msg)`

Displays an error message.

| Parameter | Type | Description |
| --- | --- | --- |
| `msg` | `string` | The error message to display. |

##### `disp(msg)`

Displays a general message.

| Parameter | Type | Description |
| --- | --- | --- |
| `msg` | `string` | The message to display. |

##### `dispMonospaced(msg)`

Displays a general message with monospaced font.

| Parameter | Type | Description |
| --- | --- | --- |
| `msg` | `string` | The message to display. |

##### `warn(msg)`

Displays a warning message.

| Parameter | Type | Description |
| --- | --- | --- |
| `msg` | `string` | The warning message to display. |

##### `edit([filepath])`

Opens a specified file in an editor or opens the editor to a default or previously specified file.

| Parameter | Type | Description |
| --- | --- | --- |
| `filepath` | `string` | Path to the file to be opened in the editor. Optional. |

##### `getExamples()`

Returns a list of all example scripts available within a predefined directory.

**Returns:** `Array.<string>` An array of paths to the example scripts.

##### `openExample(filename)`

Opens a specified example script in the editor window.

| Parameter | Type | Description |
| --- | --- | --- |
| `filename` | `string` | Name of the example file to open. |

##### `openExamplesFolder()`

Opens examples folder in File Explorer

##### `goToExamplesFolder()`

Opens examples folder in File Explorer

##### `showMessageBox(options)`

Displays a synchronous message box to the user and waits for their response.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `Object` | Configuration options for the message box. |

**Returns:** `number` The index of the button clicked by the user.

##### `saveObject(value, [options])`

Serializes a single value with class/reference metadata.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | Value to serialize. |
| `options` | `Object` | Serialization options. Optional. Default: `{}`. |

**Returns:** `Object` Serialized payload.

##### `loadObject(payload, [options])`

Restores a single serialized value payload.

| Parameter | Type | Description |
| --- | --- | --- |
| `payload` | `Object` | Serialized object payload. |
| `options` | `Object` | Deserialization options. Optional. Default: `{}`. |

**Returns:** `Promise.<*>` Restored value.

##### `loadClass(class_name, class_path)`

Attempts to load a class definition into the workspace.

| Parameter | Type | Description |
| --- | --- | --- |
| `class_name` | `string` | Class name. |
| `class_path` | `string` | Class source path. |

**Returns:** `Promise.<boolean>` True if class was loaded.

##### `save(file_path, args)`

Saves specified variables to a file using workspace serializer.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `string` | Path where variables will be saved. |
| `args` | `string` | Variables to save. If omitted or 'all', saves all workspace variables. |

##### `load(args)`

Loads variables from a specified file into the specified scope or the default script context.
Supports current JSLAB workspace format and legacy plain JSON object files.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | A single filename or a scope and filename to specify where to load the variables. |

##### `getCompletions(data)`

Retrieves completion suggestions based on the current context and input.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array` | Data containing the start of the string to complete, context, and keywords. |

**Returns:** `Array.<string>` An array of completion suggestions.

##### `getObjectByProp(obj, prop, val)`

Retrieves an object by matching a specific property value.

| Parameter | Type | Description |
| --- | --- | --- |
| `obj` | `Object` | The object to search through. |
| `prop` | `string` | The property name to match. |
| `val` | `*` | The value to match against the property. |

**Returns:** `Object | null` The found object with key and value, or null if not found.

##### `getObjectsByProp(obj, prop, val)`

Retrieves multiple objects from a parent object by matching a specific property value.

| Parameter | Type | Description |
| --- | --- | --- |
| `obj` | `Object` | The parent object to search through. |
| `prop` | `string` | The property name to match. |
| `val` | `*` | The value to match against the property. |

**Returns:** `Object` An object containing all matched key-value pairs.

##### `strcmp(x, y)`

Compares two strings lexicographically.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `string` | The first string. |
| `y` | `string` | The second string. |

**Returns:** `number` The result of the comparison.

##### `compareVersions(a, b)`

Compare two version strings (e.g. "1.4.2", "v2.0.0-beta.1").

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `string` | First version. |
| `b` | `string` | Second version. |

**Returns:** `number` -1 if a < b, 0 if equal, 1 if a > b.

##### `checkForUpdate()`

Checks if there is available update

**Returns:** `boolean` True if there is available update; otherwise, false.

##### `unrequire(module)`

Unloads a previously required module from the cache.

| Parameter | Type | Description |
| --- | --- | --- |
| `module` | `string` | The module to unrequire. |

##### `resetApp()`

Resets app.

##### `resetSandbox()`

Resets the sandbox environment to its initial state.

##### `openDevTools()`

Opens the developer tools for the sandbox environment in the current context.

**Returns:** `void`

##### `installModule(path, [show_output])`

Installs a module located at the specified path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The path to the module. |
| `show_output` | `boolean` | Whether to show output in the command window. Optional. Default: `true`. |

##### `addForCleanup(obj, fun)`

Registers an object for cleanup with a specified cleanup function.

| Parameter | Type | Description |
| --- | --- | --- |
| `obj` | `Object` | The object to be registered for cleanup. |
| `fun` | `function` | The function to execute during cleanup. |

#### compile

##### `compileNapi(path, [show_output])`

Compiles a N-API module located at the specified path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The path to the N-API module. |
| `show_output` | `boolean` | Whether to show output in the command window. Optional. Default: `true`. |

**Returns:** `Array` An array containing the result of the compilation and targets.

##### `compileWasm(path, [show_output])`

Compiles a WebAssembly module from C/C++ or Rust sources using the available toolchain.
The method automatically selects `emcc` for native sources and `wasm-pack` when a Cargo.toml is present.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | Path to a source file or directory containing sources. |
| `show_output` | `boolean` | Whether to display the compiler output. Optional. Default: `false`. |

**Returns:** `Array` Tuple `[success, wasm_path|undefined]`.

#### docs

##### `helpToJSON([name], [type])`

Retrieves documentation in JSON format based on the provided name and type.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the documentation item. Optional. |
| `type` | `string` | The type of the documentation (e.g., 'category'). Optional. |

**Returns:** `string | undefined` The JSON string of the documentation or undefined if not found.

##### `help(name, type)`

Retrieves documentation based on the provided name and type.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the documentation item. |
| `type` | `string` | The type of the documentation. |

**Returns:** `string | undefined` The JSON string of the documentation or undefined if not found.

##### `doc(name, type)`

Retrieves documentation based on the provided name and type.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the documentation item. |
| `type` | `string` | The type of the documentation. |

**Returns:** `string | undefined` The JSON string of the documentation or undefined if not found.

##### `documentation(name, type)`

Retrieves documentation based on the provided name and type.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the documentation item. |
| `type` | `string` | The type of the documentation. |

**Returns:** `string | undefined` The JSON string of the documentation or undefined if not found.

##### `helpSearch(query)`

Searches the documentation for methods that match all words in the given query, regardless of order.

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | `string` | The search query containing keywords to match within the documentation. |

**Returns:** `Array.<Object>` Array of matching documentation entries, each entry containing `type` and `category` properties.

##### `docSearch(query)`

Searches the documentation for methods that match all words in the given query, regardless of order.

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | `string` | The search query containing keywords to match within the documentation. |

**Returns:** `Array.<Object>` Array of matching documentation entries, each entry containing `type` and `category` properties.

##### `documentationSearch(query)`

Searches the documentation for methods that match all words in the given query, regardless of order.

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | `string` | The search query containing keywords to match within the documentation. |

**Returns:** `Array.<Object>` Array of matching documentation entries, each entry containing `type` and `category` properties.

##### `lookfor(query)`

Searches documentation by keyword and prints matching symbols.
MATLAB-compatible alias for documentation search.

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | `string` | Search query. |

**Returns:** `Array.<string>` Matching summary lines.

##### `source(name)`

Opens the source file and navigates to the specified line based on the provided name.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the source to locate. |

##### `docGraph(name)`

Showing graph of function.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the function. |

#### inspector

##### `inspectVariable(variable_name, [options], [options.max_rows], [options.max_cols], [options.max_chars], [options.filter], [options.filter_expr], [options.sort_by], [options.sort_dir])`

Displays a spreadsheet-like inspector for a workspace variable in the command window.

| Parameter | Type | Description |
| --- | --- | --- |
| `variable_name` | `string` | Variable name in workspace. |
| `options` | `Object` | Optional rendering options. Optional. Default: `{}`. |
| `options.max_rows` | `number` | Maximum rows to render. Optional. Default: `200`. |
| `options.max_cols` | `number` | Maximum columns to render. Optional. Default: `30`. |
| `options.max_chars` | `number` | Maximum characters shown in a single cell. Optional. Default: `120`. |
| `options.filter` | `string` | Case-insensitive substring row filter. Optional. |
| `options.filter_expr` | `string` | JavaScript expression filter using row object. Optional. |
| `options.sort_by` | `string` | Sort column key. Optional. |
| `options.sort_dir` | `string` | Sort direction. Optional. Default: `'asc'`. |

**Returns:** `boolean` True when rendered.

##### `inspectSetVariable(variable_name, path, expression)`

Sets variable value at path using a JavaScript expression from inspector.

| Parameter | Type | Description |
| --- | --- | --- |
| `variable_name` | `string` | Workspace variable name. |
| `path` | `Array` | Property/index path. |
| `expression` | `string` | JavaScript expression representing new value. |

**Returns:** `boolean` True if updated.

##### `inspectTableAction(variable_name, action, [payload])`

Executes table inspector actions that change table structure/content.

| Parameter | Type | Description |
| --- | --- | --- |
| `variable_name` | `string` | Workspace variable name. |
| `action` | `string` | Action name. |
| `payload` | `Object` | Action payload. Optional. Default: `{}`. |

**Returns:** `boolean` True when action is completed.

#### math

##### `Pi`

Pi number.

##### `d2r`

Coefficient for converting degrees to radians.

##### `r2d`

Coefficient for converting radians to degrees.

##### `eps`

Floating-point relative accuracy

##### `EPS`

Floating-point relative accuracy

##### `seedRandom(args)`

Seeds the random number generator with the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `any` | Arguments used to seed the random generator. |

**Returns:** `any` The result from the seeded random generator.

##### `interp(x, y, xq, mode)`

Performs linear interpolation on a set of data points.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array` | The x-values of the data points. |
| `y` | `Array` | The y-values of the data points, corresponding to each x-value. |
| `xq` | `Number \| Array` | The x-value(s) for which to interpolate a y-value. |
| `mode` | `String` | The mode of interpolation. Use 'extrap' for extrapolation. Default: `none`. |

**Returns:** `Number | Array` The interpolated y-value(s) at xq.

##### `gridGradient(x, y, z, [N_a])`

Computes the gradient of a 2D grid.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array` | X coordinates. |
| `y` | `Array` | Y coordinates. |
| `z` | `Array.<Array>` | 2D data array. |
| `N_a` | `number` | Neighborhood size. Optional. Default: `11`. |

**Returns:** `Array.<Array>` Gradient components [dz_x, dz_y].

##### `gridData(x, y, z, xq, yq, [method], [opts_in])`

Interpolates grid data using the specified method.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array` | X coordinates. |
| `y` | `Array` | Y coordinates. |
| `z` | `Array` | Data values. |
| `xq` | `Array` | Query X coordinates. |
| `yq` | `Array` | Query Y coordinates. |
| `method` | `string` | Interpolation method. Optional. Default: `"linear"`. |
| `opts_in` | `Object` | Optional settings. Optional. |

**Returns:** `Array.<Array>` Interpolated grid [xq, yq, zq].

##### `buildGridFromFlat(xFlat, yFlat, zFlat, [tolIn], [tolIn.tolX], [tolIn.tolY])`

Builds a rectilinear grid (xAxis, yAxis, Z[y][x]) from flattened grid arrays.
Ordering can be arbitrary. Values that are NaN/Inf are ignored.

| Parameter | Type | Description |
| --- | --- | --- |
| `xFlat` | `Array` | Flattened x coordinates (length N). |
| `yFlat` | `Array` | Flattened y coordinates (length N). |
| `zFlat` | `Array` | Flattened z values (length N). |
| `tolIn` | `Object` | Optional tolerance settings. Optional. |
| `tolIn.tolX` | `number` | Quantization tolerance for x axis detection. Optional. |
| `tolIn.tolY` | `number` | Quantization tolerance for y axis detection. Optional. |

**Returns:** `Object` Grid object: { xAxis, yAxis, Z, m, n, filled }.

##### `gridSolveYforXZ(x, y, z, x0, z0, [opts], [opts.extrap], [opts.eps], [opts.tolIn], [opts.minFill], [opts.allowMissing], [opts.minFillIfMissing])`

Finds y values where z(x0, y) == z0 on a rectilinear grid.
If z is a flat array, the function tries to rebuild a grid automatically.
Returns an array of solutions (can be empty or multiple).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array` | X axis (grid) OR flattened x coordinates. |
| `y` | `Array` | Y axis (grid) OR flattened y coordinates. |
| `z` | `Array \| Array.<Array>` | Z grid (2D) OR flattened z values. |
| `x0` | `number` | Known x. |
| `z0` | `number` | Known z. |
| `opts` | `Object` | Optional settings. Optional. |
| `opts.extrap` | `boolean` | Allow x0 outside x-range by clamping to edge. Optional. Default: `false`. |
| `opts.eps` | `number` | Tolerance for root detection. Optional. Default: `1e-12`. |
| `opts.tolIn` | `Object` | Optional tolerances for grid rebuild (passed to buildGridFromFlat). Optional. |
| `opts.minFill` | `number` | Minimum filled ratio to accept as grid. Optional. Default: `0.98`. |
| `opts.allowMissing` | `boolean` | If true, allow lower fill ratio. Optional. Default: `false`. |
| `opts.minFillIfMissing` | `number` | Minimum filled ratio when allowMissing is true. Optional. Default: `0.50`. |

**Returns:** `Array` Array of y solutions.

##### `gridSolveXforYZ(x, y, z, y0, z0, [opts], [opts.extrap], [opts.eps], [opts.tolIn], [opts.minFill], [opts.allowMissing], [opts.minFillIfMissing])`

Finds x values where z(x, y0) == z0 on a rectilinear grid.
If z is a flat array, the function tries to rebuild a grid automatically.
Returns an array of solutions (can be empty or multiple).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array` | X axis (grid) OR flattened x coordinates. |
| `y` | `Array` | Y axis (grid) OR flattened y coordinates. |
| `z` | `Array \| Array.<Array>` | Z grid (2D) OR flattened z values. |
| `y0` | `number` | Known Y. |
| `z0` | `number` | Known z. |
| `opts` | `Object` | Optional settings. Optional. |
| `opts.extrap` | `boolean` | Allow y0 outside y-range by clamping to edge. Optional. Default: `false`. |
| `opts.eps` | `number` | Tolerance for root detection. Optional. Default: `1e-12`. |
| `opts.tolIn` | `Object` | Optional tolerances for grid rebuild (passed to buildGridFromFlat). Optional. |
| `opts.minFill` | `number` | Minimum filled ratio to accept as grid. Optional. Default: `0.98`. |
| `opts.allowMissing` | `boolean` | If true, allow lower fill ratio. Optional. Default: `false`. |
| `opts.minFillIfMissing` | `number` | Minimum filled ratio when allowMissing is true. Optional. Default: `0.50`. |

##### `bilinearFunction(x, midPoint, midValue)`

Calculates the output of a bilinear function based on input value, midpoint, and mid-value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number` | The input value for the function. |
| `midPoint` | `number` | The midpoint of the function where the slope changes. |
| `midValue` | `number` | The value of the function at the midpoint. |

**Returns:** `number` The output value of the bilinear function.

##### `random([min], [max])`

Generates a random number between a specified range.

| Parameter | Type | Description |
| --- | --- | --- |
| `min` | `Number` | The lower bound of the range. Optional. Default: `0`. |
| `max` | `Number` | The upper bound of the range. Optional. |

**Returns:** `Number` A random number within the specified range.

##### `randInt([min], [max])`

Generates a random integer within a specified range.

| Parameter | Type | Description |
| --- | --- | --- |
| `min` | `Number` | The lower bound of the range. Optional. Default: `0`. |
| `max` | `Number` | The upper bound of the range. Optional. |

**Returns:** `Number` A random integer within the specified range.

##### `acosd(x)`

Computes the arc cosine of x, with the result in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The value to compute the arc cosine for. |

**Returns:** `Number` The arc cosine of x in degrees.

##### `acotd(x)`

Computes the arc cotangent of x, with the result in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The value to compute the arc cotangent for. |

**Returns:** `Number` The arc cotangent of x in degrees.

##### `acscd(x)`

Computes the arc cosecant of x, with the result in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The value to compute the arc cosecant for. |

**Returns:** `Number` The arc cosecant of x in degrees.

##### `asecd(x)`

Computes the arc secant of x, with the result in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The value to compute the arc secant for. |

**Returns:** `Number` The arc secant of x in degrees.

##### `asind(x)`

Computes the arc sine of x, with the result in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The value to compute the arc sine for. |

**Returns:** `Number` The arc sine of x in degrees.

##### `atand(x)`

Computes the arc tangent of x, with the result in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The value to compute the arc tangent for. |

**Returns:** `Number` The arc tangent of x in degrees.

##### `atan2d(y, x)`

Computes the arc tangent of the quotient of its arguments, with the result in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `y` | `Number` | The y coordinate. |
| `x` | `Number` | The x coordinate. |

**Returns:** `Number` The arc tangent of y/x in degrees.

##### `cosd(x)`

Computes the cosine of x, where x is in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The angle in degrees. |

**Returns:** `Number` The cosine of x in degrees.

##### `cotd(x)`

Computes the cotangent of x, where x is in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The angle in degrees. |

**Returns:** `Number` The cotangent of x.

##### `cscd(x)`

Computes the cosecant of x, where x is in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The angle in degrees. |

**Returns:** `Number` The cosecant of x.

##### `secd(x)`

Computes the secant of x, where x is in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The angle in degrees. |

**Returns:** `Number` The secant of x.

##### `sind(x)`

Computes the sine of x, where x is in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The angle in degrees. |

**Returns:** `Number` The sine of x.

##### `tand(x)`

Computes the tangent of x, where x is in degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Number` | The angle in degrees. |

**Returns:** `Number` The tangent of x.

##### `poly(A)`

Computes the characteristic polynomial of a matrix or the polynomial from roots.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | If `A` is a matrix (2D array), computes its characteristic polynomial.
                   If `A` is an array of roots, computes the polynomial with those roots. |

**Returns:** `Array` - Coefficients of the resulting polynomial.

##### `polyfit(x, y, n)`

Fits a polynomial of degree n to the given data points and returns the coefficients (highest degree first).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array.<number>` | The array of x-values. |
| `y` | `Array.<number>` | The array of y-values corresponding to each x-value. |
| `n` | `number` | The degree of the polynomial to fit. |

**Returns:** `Array.<number>` The coefficients of the fitted polynomial in descending order.

##### `polyval(p, x_in)`

Evaluates a polynomial with given coefficients at specified x-values.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `Array.<number>` | The coefficients of the polynomial in descending order. |
| `x_in` | `Array.<number>` | The array of x-values at which to evaluate the polynomial. |

**Returns:** `Array.<number>` The resulting y-values after evaluating the polynomial at x_in.

##### `roots(p)`

Computes the roots of a polynomial with the given coefficients.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `Array.<number>` | Array of polynomial coefficients, ordered from highest degree to constant term. |

**Returns:** `Array.<number>` Array of roots (real or complex) of the polynomial.

##### `polystr(p, [opts], [opts.x_symbol], [opts.y_symbol], [opts.precision], [opts.lang])`

Generates a string representation of a polynomial based on the provided coefficients and options.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `Array.<number>` | An array of polynomial coefficients, ordered from highest degree to constant term. |
| `opts` | `Object` | Optional settings for the polynomial string. Optional. |
| `opts.x_symbol` | `string` | The symbol to use for the variable x. Optional. Default: `'x'`. |
| `opts.y_symbol` | `string` | The symbol to use for the variable y. Optional. Default: `'y'`. |
| `opts.precision` | `number` | The number of decimal places for coefficients. Optional. Default: `7`. |
| `opts.lang` | `string` | The language format for the output ('tex', 'c', etc.). Optional. |

**Returns:** `string` The formatted polynomial string.

##### `polystrc(p, [opts])`

Generates a C language formatted string representation of a polynomial.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `Array.<number>` | An array of polynomial coefficients, ordered from highest degree to constant term. |
| `opts` | `Object` | Optional settings for the polynomial string. Optional. |

**Returns:** `string` The polynomial string formatted for C syntax.

##### `polystrtex(p, [opts])`

Generates a LaTeX formatted string representation of a polynomial.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `Array.<number>` | An array of polynomial coefficients, ordered from highest degree to constant term. |
| `opts` | `Object` | Optional settings for the polynomial string. Optional. |

**Returns:** `string` The polynomial string formatted for LaTeX.

##### `spikeFilter(x, dx_max, n)`

Filters out spikes in a sequence by replacing sudden large changes with the previous value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array.<number>` | The input sequence of numbers. |
| `dx_max` | `number` | The maximum allowed difference between consecutive elements before considering it a spike. |
| `n` | `number` | The maximum number of consecutive spikes to correct. |

**Returns:** `Array.<number>` The filtered sequence with spikes removed.

##### `magnitude(num)`

Calculates the magnitude (absolute value) of a complex number or a real number.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number \| Object` | A real number or an object with 'real' and 'imag' properties. |

**Returns:** `number` The magnitude of the number.

##### `compareComplex(a, b)`

Compares two numbers (real or complex) according to Octave's rules.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `number \| Object` | First number to compare. |
| `b` | `number \| Object` | Second number to compare. |

**Returns:** `number` -1 if a < b, 1 if a > b, 0 if equal.

##### `min(arr)`

Finds the minimum value in an array of numbers, which can include both real numbers and complex numbers.
Complex numbers are represented as objects with 'real' and 'imag' properties.
The comparison follows Octave's rules:
1. Compare magnitudes (absolute values) of the numbers.
2. If magnitudes are equal, compare real parts.
3. If real parts are equal, compare imaginary parts.

| Parameter | Type | Description |
| --- | --- | --- |
| `arr` | `Array.<(number\|Object)>` | An array of numbers or complex number objects. |

**Returns:** `number | Object` The minimum value found in the array.

##### `max(arr)`

Finds the maximum value in an array of numbers, which can include both real numbers and complex numbers.
Complex numbers are represented as objects with 'real' and 'imag' properties.
The comparison follows Octave's rules:
1. Compare magnitudes (absolute values) of the numbers.
2. If magnitudes are equal, compare real parts.
3. If real parts are equal, compare imaginary parts.

| Parameter | Type | Description |
| --- | --- | --- |
| `arr` | `Array.<(number\|Object)>` | An array of numbers or complex number objects. |

**Returns:** `number | Object` The maximum value found in the array.

##### `clamp(v, a, b)`

Clamps a value to the inclusive range [a, b].
Assumes a <= b.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `number` | The value to clamp. |
| `a` | `number` | The lower bound. |
| `b` | `number` | The upper bound. |

**Returns:** `number` The clamped value.

##### `real(input)`

Extracts the real part of a number or an array of numbers.
Handles mixed inputs containing both real numbers and complex numbers.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `number \| Object \| Array.<(number\|Object)>` | A number, complex number object, or array thereof. |

**Returns:** `number | Array.<number>` The real part(s) of the input.

##### `imag(input)`

Extracts the imaginary part of a number or an array of numbers.
Handles mixed inputs containing both real numbers and complex numbers.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `number \| Object \| Array.<(number\|Object)>` | A number, complex number object, or array thereof. |

**Returns:** `number | Array.<number>` The imaginary part(s) of the input.

##### `cumtrapz(args)`

Performs cumulative trapezoidal integration on the provided data.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `any` | Arguments required for cumulative trapezoidal integration. |

**Returns:** `any` The result of the cumulative trapezoidal integration.

##### `trapz(args)`

Performs trapezoidal integration on the provided data.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `any` | Arguments required for trapezoidal integration. |

**Returns:** `any` The result of the trapezoidal integration.

##### `mse(A, B)`

Compute the mean squared error (MSE) between two arrays.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The first array. |
| `B` | `Array.<number>` | The second array. |

**Returns:** `number` - The mean squared error between A and B.

##### `charpoly(matrix)`

Calculates the coefficients of the characteristic polynomial of a square matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `matrix` | `Array.<Array.<number>>` | A square matrix (2D array) for which the characteristic polynomial is computed. |

**Returns:** `Array.<number>` - An array of coefficients of the characteristic polynomial.

#### non_blocking

##### `runInterruptible(work_function, [args], [options])`

Runs scientific/native work outside the persistent workspace so it can be stopped safely.
The function receives copied arguments and must not depend on caller closures.

| Parameter | Type | Description |
| --- | --- | --- |
| `work_function` | `function` | Function to execute in an isolated scientific runtime. |
| `args` | `Array` | Structured-cloneable arguments. Optional. Default: `[]`. |
| `options` | `Object` | Optional timeout_ms and AbortSignal signal. Optional. Default: `{}`. |

**Returns:** `Promise.<*>` Copied result; parent variables survive task interruption.

##### `nbwhile(fn)`

Executes a given function in a non-blocking while loop.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `function` | A function that returns a boolean value; when false, the loop exits. |

##### `clearIntervalIf(timeout)`

Clears the specified interval if it exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeout` | `number \| undefined` | The interval ID to be cleared. |

**Returns:** `boolean` Always returns false.

##### `clearTimeoutIf(timeout)`

Clears the specified timeout if it exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeout` | `number \| undefined` | The timeout ID to be cleared. |

**Returns:** `boolean` Always returns false.

##### `resetTimeout(id, fun, dt)`

Reset timeout

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | `number` | timeout id. |
| `fun` | `number` | timeout function. |
| `dt` | `number` | timeout dt. |

**Returns:** `number` timeout id.

##### `initWorker(path)`

Initializes a new worker with the specified module path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The path to the module to configure the worker. |

**Returns:** `Worker` The initialized Worker instance.

#### path

##### `getDir(path)`

Extracts the directory of file.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `String` | The filesystem path from which to extract the directory. |

**Returns:** `String` The directory from the given path.

##### `getDirName(path)`

Extracts the name of the directory from a given filesystem path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `String` | The filesystem path from which to extract the directory name. |

**Returns:** `String` The name of the directory from the given path.

##### `pathSep()`

Retrieves the platform-specific path separator character.

**Returns:** `String` The path separator character used by the system.

##### `isAbsolutePath()`

Determines if the current path is absolute.

**Returns:** `boolean` True if the current path is absolute, false otherwise.

##### `pathJoin(paths)`

Joins all given path segments together using the platform-specific separator as a delimiter.

| Parameter | Type | Description |
| --- | --- | --- |
| `paths` | `string` | The path segments to join. |

**Returns:** `string` The combined path.

##### `pathFileName(path)`

Retrieves the file name from the provided file path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The complete file path. |

**Returns:** `string` The file name extracted from the path.

##### `pathBaseName(path)`

Returns the last portion of a path, similar to the Unix `basename` command.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The file path to process. |

**Returns:** `string` The last segment of the path.

##### `pathFileExt(path)`

Retrieves the file extension from the provided file path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The complete file path. |

**Returns:** `string` The file extension extracted from the path.

##### `pathExtName(path)`

Retrieves the file extension from the provided file path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The complete file path. |

**Returns:** `string` The file extension extracted from the path.

##### `pathResolve(path)`

Resolves a sequence of path segments into an absolute path using the environment's path resolver.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The path or sequence of paths to resolve. |

**Returns:** `string` - The resolved absolute path.

##### `pathRelative(from, to)`

Computes the relative path from one path to another.

| Parameter | Type | Description |
| --- | --- | --- |
| `from` | `string` | The starting path. |
| `to` | `string` | The target path. |

**Returns:** `string` - The relative path from the `from` path to the `to` path.

##### `pathNormalize(path)`

Normalizes a given path, resolving '..' and '.' segments using the environment's path normalizer.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The path to normalize. |

**Returns:** `string` - The normalized path.

##### `comparePaths(path1, path2)`

Compares two file paths after resolving them to their absolute forms to check if they refer to the same location.

| Parameter | Type | Description |
| --- | --- | --- |
| `path1` | `string` | The first file path to compare. |
| `path2` | `string` | The second file path to compare. |

**Returns:** `boolean` Returns true if both paths resolve to the same absolute path, otherwise false.

##### `getUniquePath(path)`

Generates a unique filesystem path by appending a number to the input path if the original path exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `String` | The base path for which a unique version is required. |

**Returns:** `String` A unique filesystem path based on the input path.

##### `getUniqueFilename(path, ext)`

Generates a unique filename by appending a number to the original path if it already exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The original file path. |
| `ext` | `string` | The original file extension. |

**Returns:** `string` A unique folder path.

#### windows

##### `active_window`

Current active window ID.

##### `open_windows`

Array of open windows.

##### `openWindow(file)`

Opens a new window with the specified file.

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | `string` | The path to the HTML file to open in the new window. |

**Returns:** `number` The identifier (wid) of the newly opened window.

##### `openWindowDevTools(wid)`

Opens the developer tools for a specified window by ID if it exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `string` | The window ID. |

**Returns:** `boolean` True if the developer tools were opened; otherwise, false.

##### `getWindowMediaSourceId(wid)`

Returns media source id for a specified window in the renderer process.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `string` | The window ID. |

**Returns:** `String | boolean` Media source id if there is window; otherwise, false.

##### `startWindowVideoRecording(wid, opts)`

Starts video recording of the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `string` | The window ID. |
| `opts` | `Object` | Optional settings. |

**Returns:** `Object | boolean` - Returns recorder object if there is window; otherwise, false.

##### `closeWindows(wid)`

Closes the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | Identifier for the window to close. |

##### `closeWindow(wid)`

Closes the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | Identifier for the window to close. |

##### `getWindow(wid)`

Retrieves the window object with the specified ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |

**Returns:** `Object | boolean` - The window object if found, otherwise false.

##### `getCurrentWindow()`

Retrieves current active window object.

**Returns:** `Object | boolean` - The window object if found, otherwise false.

##### `gcw()`

Retrieves current active window object.

**Returns:** `Object | boolean` - The window object if found, otherwise false.

##### `showWindow(wid)`

Shows the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window to show. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the show() method.

##### `hideWindow(wid)`

Hides the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window to hide. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the hide() method.

##### `focusWindow(wid)`

Brings the specified window to the foreground.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window to focus. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid.

##### `minimizeWindow(wid)`

Minimizes the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window to minimize. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the minimize() method.

##### `centerWindow(wid)`

Centers the specified window on the screen.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window to center. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the center() method.

##### `moveTopWindow(wid)`

Moves the specified window to the top of the window stack.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window to move to the top. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the moveTop() method.

##### `setWindowSize(wid, width, height)`

Sets the size of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |
| `width` | `number` | The new width of the window. |
| `height` | `number` | The new height of the window. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid.

##### `setWindowPos(wid, left, top)`

Sets the position of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |
| `left` | `number` | The new left position of the window. |
| `top` | `number` | The new top position of the window. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid.

##### `setWindowResizable(wid, state)`

Sets the resizable state of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |
| `state` | `boolean` | Whether the window should be resizable. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the setResizable() method.

##### `setWindowMovable(wid, state)`

Sets the movable state of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |
| `state` | `boolean` | Whether the window should be movable. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the setMovable() method.

##### `setWindowAspectRatio(wid, aspect_ratio)`

Sets the aspect ratio of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |
| `aspect_ratio` | `number` | The desired aspect ratio of the window. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the setAspectRatio() method.

##### `setWindowOpacity(wid, opacity)`

Sets the opacity of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |
| `opacity` | `number` | The desired opacity level (0 to 1). |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the setOpacity() method.

##### `setWindowFullscreen(wid, state)`

Sets the fullscreen state of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |
| `state` | `number` | The fullscreen state |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid, otherwise the result of the setFullscreen() method.

##### `setWindowTitle(wid, left, top)`

Sets the position of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |
| `left` | `number` | The new left position of the window. |
| `top` | `number` | The new top position of the window. |

**Returns:** `boolean | undefined` - Returns false if the window ID is invalid.

##### `getWindowSize(wid)`

Retrieves the size of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |

**Returns:** `Array | boolean` - An array [width, height] if the window exists, otherwise false.

##### `getWindowPos(wid)`

Retrieves the position of the specified window.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `number` | The ID of the window. |

**Returns:** `Array | boolean` - An array [left, top] if the window exists, otherwise false.

##### `printWindowToPdf(wid, options)`

Prints window to PDF format.

| Parameter | Type | Description |
| --- | --- | --- |
| `wid` | `string` | The window ID. |
| `options` | `Object` | Options for printing |

**Returns:** `Buffer` Generated PDF data.

##### `openDocumentation()`

Opens window with documentation

##### `openDoc()`

Opens window with documentation

##### `openDiscourse()`

Opens window with discourse

##### `openWebpage([url])`

Opens window with webpage

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | `String` | URL of webpage. Optional. |

**Returns:** `Promise.<Object>` A promise that resolves to the window context.

##### `openWindow3D([imports])`

Opens a new 3D window and imports specified modules.

| Parameter | Type | Description |
| --- | --- | --- |
| `imports` | `Array.<Object>` | An array of import objects specifying modules to import. Optional. Default: `[]`. |

**Returns:** `Promise.<Object>` A promise that resolves to the window object once imports are ready.

##### `openPlotlyjs()`

Opens a Plotly.js window and initializes the plot container.

**Returns:** `Promise.<Window>` The window object where Plotly.js is loaded and the plot container is available.

##### `openCanvas()`

Opens a window with canvas and D3 and initializes the canvas element.

**Returns:** `Promise.<Window>` The window object where D3 is loaded and the canvas element is available.

##### `openWindowBlank()`

Opens a new blank window.

**Returns:** `Promise.<Object>` A promise that resolves to the window object once it is ready.

##### `showMermaidGraph(graph_definition)`

Renders a Mermaid diagram in a new window.

| Parameter | Type | Description |
| --- | --- | --- |
| `graph_definition` | `string` | The Mermaid graph definition. |

**Returns:** `Promise.<Object>` A promise that resolves to the window context once the graph is rendered.

#### figures

##### `open_figures`

Array of open figures.

##### `active_figure`

Current active figure ID.

##### `figure(id)`

Opens or updates a figure with specified options.

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | `Number` | Identifier for the figure. |

**Returns:** `Number` The identifier of the opened or updated figure.

##### `getFigure(fid)`

Retrieves the figure object associated with the specified figure ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `string` | The identifier of the figure to retrieve. |

**Returns:** `Object | boolean` The figure object if found, otherwise `false`.

##### `getFigureWindow(fid)`

Retrieves the window of the figure object associated with the specified figure ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `string` | The identifier of the figure to retrieve. |

**Returns:** `Object | boolean` The figure object if found, otherwise `false`.

##### `getCurrentFigure()`

Retrieves current active figure object.

**Returns:** `Object | boolean` The figure object if found, otherwise `false`.

##### `gcf()`

Retrieves current active figure object.

**Returns:** `Object | boolean` The figure object if found, otherwise `false`.

##### `getPlot(fid)`

Retrieves the plot object for a specified figure ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `string` | The identifier of the figure to retrieve the plot for. |

**Returns:** `Object | boolean` The plot object if it exists, otherwise `false`.

##### `getAxes(fid)`

Retrieves the plot object for a specified figure ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `string` | The identifier of the figure to retrieve the plot for. |

**Returns:** `Object | boolean` The plot object if it exists, otherwise `false`.

##### `getCurrentPlot()`

Retrieves plot from current active figure object.

**Returns:** `Object | boolean` The figure object if found, otherwise `false`.

##### `gcp()`

Retrieves plot from current active figure object.

**Returns:** `Object | boolean` The figure object if found, otherwise `false`.

##### `getCurrentAxes()`

Retrieves plot from current active figure object.

**Returns:** `Object | boolean` The figure object if found, otherwise `false`.

##### `gca()`

Retrieves plot from current active figure object.

**Returns:** `Object | boolean` The figure object if found, otherwise `false`.

##### `focusFigure(fid)`

Brings the specified figure to the foreground.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `number` | The ID of the figure to focus. |

**Returns:** `boolean | undefined` - Returns false if the figure ID is invalid.

##### `setFigureSize(fid, width, height)`

Sets the size of a specified figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `number` | The ID of the figure. |
| `width` | `number` | The new width of the figure. |
| `height` | `number` | The new height of the figure. |

**Returns:** `boolean | undefined` - Returns false if the figure ID is invalid.

##### `setFigurePos(fid, left, top)`

Sets the position of a specified figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `number` | The ID of the figure. |
| `left` | `number` | The new left position of the figure. |
| `top` | `number` | The new top position of the figure. |

**Returns:** `boolean | undefined` - Returns false if the figure ID is invalid.

##### `setFigureTitle(fid, title)`

Sets the title of the specified figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `string` | The figure ID. |
| `title` | `string` | The new title for the figure. |

**Returns:** `boolean | *` The result of setting the title, or false if the figure does not exist.

##### `getFigureSize(fid)`

Retrieves the size of a specified figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `number` | The ID of the figure. |

**Returns:** `Array | boolean` - Returns an array [width, height] or false if the figure ID is invalid.

##### `getFigurePos(fid)`

Retrieves the position of a specified figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `number` | The ID of the figure. |

**Returns:** `Array | boolean` - Returns an array [left, top] or false if the figure ID is invalid.

##### `getFigureMediaSourceId(fid)`

Retrieves the media source id of a specified figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `number` | The ID of the figure. |

**Returns:** `String | boolean` - Returns Media soruce id or false if the figure ID is invalid.

##### `startFigureVideoRecording(fid, opts)`

Starts video recording of a specified figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `number` | The ID of the figure. |
| `opts` | `Object` | Optional settings. |

**Returns:** `Object | boolean` - Returns recorder object or false if the figure ID is invalid.

##### `closeFigure(fid)`

Closes a specified figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `number` | The ID of the figure to close. |

**Returns:** `boolean | undefined` - Returns false if the figure ID is invalid.

##### `close(id, [type])`

Closes a figure or window by its identifier.

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | `number \| string` | The identifier of the figure or window to close. Use "all" to close all. |
| `type` | `string` | The type of object to close ('figure' or 'window'). Optional. Default: `'figure'`. |

##### `saveFigureDialog(fid)`

Opens a dialog for saving a figure in various formats.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `String` | The figure identifier. |

##### `saveFigure(fid, figure_path, size)`

Saves a figure to a specified path in various formats.

| Parameter | Type | Description |
| --- | --- | --- |
| `fid` | `String` | The figure identifier. |
| `figure_path` | `String` | The path where the figure should be saved. |
| `size` | `Array` | Optional dimensions [width, height] to use if saving as a PDF. |

##### `legend(label)`

Sets the label for the x-axis of the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | The label for the x-axis. |

##### `xlabel(label)`

Sets the label for the x-axis of the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | The label for the x-axis. |

##### `ylabel(label)`

Sets the label for the y-axis of the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | The label for the y-axis. |

##### `zlabel(label)`

Sets the label for the z-axis of the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | The label for the z-axis. |

##### `title(label)`

Sets the title of the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | The title text. |

##### `xlim(lim)`

Sets the xlim of the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `lim` | `String` | x limits. |

##### `ylim(lim)`

Sets the ylim of the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `lim` | `String` | y limits. |

##### `zlim(lim)`

Sets the zlim of the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `lim` | `String` | z limits. |

##### `view(azimuth, elevation)`

Adjusts the view based on azimuth and elevation angles.

| Parameter | Type | Description |
| --- | --- | --- |
| `azimuth` | `number` | The azimuth angle. |
| `elevation` | `number` | The elevation angle. |

##### `zoom(factor)`

Adjusts the zoom based on zoom factor.

| Parameter | Type | Description |
| --- | --- | --- |
| `factor` | `number` | The zoom factor. |

##### `axis(style)`

Applies the specified style to the active figure's plot axis.

| Parameter | Type | Description |
| --- | --- | --- |
| `style` | `Object` | The style configuration to apply to the axis. |

##### `printFigure(filename, options)`

Prints the currently active figure to a file.

| Parameter | Type | Description |
| --- | --- | --- |
| `filename` | `String` | The name of the file where the figure should be printed. |
| `options` | `Object` | Printing options. |

##### `plot(traces, options)`

Plots data on the active figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `traces` | `Array` | Data traces to plot. |
| `options` | `Object` | Configuration options for plotting. |

**Returns:** `Number` The plot identifier.

##### `updatePlot(traces, N)`

Updates plot data by delegating to the `update` method.

| Parameter | Type | Description |
| --- | --- | --- |
| `traces` | `Object` | The trace data to be updated in the plot. |
| `N` | `number` | The data length or index for updating the plot. |

##### `updatePlotById(data)`

Updates plot data by id by delegating to the `updateById` method.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Object \| Array.<Object>` | Trace update object(s) to apply to the active plot. |

##### `hideFigureMenu()`

Hides figure menu.

##### `showFigureMenu()`

Shows figure menu.

##### `loadJsonFigure(file_path, id)`

Loads figure from JSON file

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Absolute or relative path to the JSON file of figure. |
| `id` | `Number` | Identifier for the figure. |

**Returns:** `Number` The identifier of the opened or updated figure.

#### time

##### `timezone`

Current timezone string.

##### `last_tic`

Last tic timestamp.

##### `tic()`

Starts a timer for measuring elapsed time. To be used with `toc` to measure time intervals.

##### `toc([tic])`

Calculates the wall-clock time elapsed since a specified start time or the last call to `tic()`, in seconds.

| Parameter | Type | Description |
| --- | --- | --- |
| `tic` | `number` | The start time in milliseconds from which to calculate elapsed time. If omitted, uses the last time recorded by `tic()`. Optional. |

**Returns:** `number` The elapsed time in seconds.

##### `tocms([tic])`

Calculates the wall-clock time elapsed since a specified start time or the last call to `tic()`, in seconds.

| Parameter | Type | Description |
| --- | --- | --- |
| `tic` | `number` | The start time in milliseconds from which to calculate elapsed time. If omitted, uses the last time recorded by `tic()`. Optional. |

**Returns:** `number` The elapsed time in milliseconds.

##### `getTimestamp()`

Gets the current Unix timestamp adjusted for a specified timezone.

**Returns:** `number` The current Unix timestamp as an integer.

##### `getTime()`

Gets the current time as a string adjusted for a specified timezone.

**Returns:** `string` The current time in 'HH:mm:ss' format.

##### `getFullTime()`

Gets the current time with milliseconds as a string adjusted for a specified timezone.

**Returns:** `string` The current time in 'HH:mm:ss.SSS' format.

##### `getDate()`

Gets the current date as a string adjusted for a specified timezone.

**Returns:** `string` The current date in 'dd.MM.yyyy.' format.

##### `getDateTime()`

Gets the current date and time as a string adjusted for a specified timezone.

**Returns:** `string` The current date and time in 'dd.MM.yyyy. HH:mm:ss' format.

##### `getDateTimeFull()`

Gets the current date and time with milliseconds as a string adjusted for a specified timezone.

**Returns:** `string` The current date and time in 'dd.MM.yyyy. HH:mm:ss.SSS' format.

##### `getDateTimeStr()`

Gets the current date and time as a string suitable for filenames, adjusted for a specified timezone.

**Returns:** `string` The current date and time in 'ddMMyyyy_HHmmss' format for use in filenames.

##### `setTimezone(tz)`

Sets the timezone to be used for time calculations and formatting. This method allows the application to adjust displayed times according to a specific timezone.

| Parameter | Type | Description |
| --- | --- | --- |
| `tz` | `String` | The timezone identifier (e.g., "America/New_York", "Europe/Paris") to be set for all time-related operations. |

#### array

##### `array(A)`

Converts an iterable or array-like object into a standard array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Iterable \| ArrayLike` | The iterable or array-like object to convert. |

**Returns:** `Array` A new array containing the elements from the input.

##### `end(A)`

Retrieves the last element from the provided array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array from which the last element is to be retrieved. |

**Returns:** `*` The last element of the array. If the array is empty, returns undefined.

##### `endi(A)`

Returns the index of the last element in the array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to evaluate. |

**Returns:** `number` The index of the last element.

##### `column(A, col)`

Retrieves a specific column from the provided matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The matrix array. |
| `col` | `number` | The column index to retrieve. |

**Returns:** `Array` The specified column as an array.

##### `row(A, row)`

Retrieves a specific row from the provided matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The matrix array. |
| `row` | `number` | The row index to retrieve. |

**Returns:** `Array` The specified row as an array.

##### `first(A, [N])`

Returns the first N elements from an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The input array. |
| `N` | `number` | The number of elements to return from the start. Optional. Default: `1`. |

**Returns:** `Array` - An array containing the first N elements.

##### `last(A, [N])`

Returns the last N elements from an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The input array. |
| `N` | `number` | The number of elements to return from the end. Optional. Default: `1`. |

**Returns:** `Array` - An array containing the last N elements.

##### `index(rows, cols, rows_max)`

Generates an array of indices based on rows and columns.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows` | `number \| Array.<number>` | The row index or array of row indices. |
| `cols` | `number \| Array.<number>` | The column index or array of column indices. |
| `rows_max` | `number` | The maximum number of rows. |

**Returns:** `Array.<number>` An array of calculated indices.

##### `indexOfAll(A, value)`

Finds all indices of a specified value in the array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to search. |
| `value` | `*` | The value to find. |

**Returns:** `Array.<number>` An array of indices where the value is found.

##### `indexOf(A, value)`

Returns the index of a value in an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | Array to search. |
| `value` | `*` | Value to locate. |

**Returns:** `number` Index of value or -1.

##### `indexOfMulti(A, search_elements, [from_index])`

Finds the index of a sequence of elements in the array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to search. |
| `search_elements` | `Array` | The sequence of elements to find. |
| `from_index` | `number` | The index to start the search from. Optional. Default: `0`. |

**Returns:** `number` The starting index of the found sequence, or -1 if not found.

##### `shuffleIndices(array)`

Shuffles indices of an array using the Fisher-Yates algorithm.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array` | Array whose indices are to be shuffled. |

**Returns:** `Array` Shuffled array of indices.

##### `setSub(A, indices, B)`

Sets a subset of array elements based on provided indices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The target array. |
| `indices` | `Array.<number>` | The indices at which to set values. |
| `B` | `Array` | The array of values to set. |

##### `setSubB(A, b, B)`

Sets a subset of array elements based on provided boolean indices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The target array to modify. |
| `b` | `Array.<boolean>` | A boolean array indicating which elements to set (true = set, false = skip). |
| `B` | `Array` | The array of values to set at the indices determined by `b`. |

##### `getSub(A, indices)`

Retrieves a subset of array elements based on provided indices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The source array. |
| `indices` | `Array.<number>` | The indices of elements to retrieve. |

**Returns:** `Array` An array containing the retrieved elements.

##### `getSubB(A, b)`

Retrieves a subset of array elements based on provided indices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The source array. |
| `b` | `Array.<boolean>` | A boolean array indicating which elements to retrieve. |

**Returns:** `Array` An array containing the retrieved elements.

##### `moveElement(A, from_index, to_index)`

Moves an element within the array from one index to another.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to modify. |
| `from_index` | `number` | The index of the element to move. |
| `to_index` | `number` | The target index where the element should be moved. |

**Returns:** `Array` The modified array with the element moved.

##### `removeElement(A, index)`

Removes an element from the array at the specified index.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to modify. |
| `index` | `number` | The index of the element to remove. |

**Returns:** `Array` The array after the element has been removed.

##### `removeElementByValue(A, value)`

Removes the first occurrence of a specified value from the array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to modify. |
| `value` | `*` | The value to remove. |

**Returns:** `Array` The array after the value has been removed.

##### `removeElementProp(A, B, [prop])`

Removes elements from array A that have properties listed in array B.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<Object>` | The array to filter. |
| `B` | `Array` | The array of properties or values to remove. |
| `prop` | `string` | The property name to check in objects within A. Optional. |

**Returns:** `Array` The filtered array.

##### `findIndexProp(A, property, value)`

Finds the index of the first object in the array where the specified property matches the given value.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<Object>` | The array to search. |
| `property` | `string` | The property name to compare. |
| `value` | `*` | The value to match. |

**Returns:** `number` The index of the matching object, or -1 if not found.

##### `setValueAt(A, indices, value)`

Sets a value at the specified multi-dimensional indices in the array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The target array. |
| `indices` | `Array.<number>` | An array of indices representing the position. |
| `value` | `*` | The value to set. |

**Returns:** `*` The value that was set.

##### `getValueAt(A, indices)`

Retrieves a value from the array at the specified multi-dimensional indices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The source array. |
| `indices` | `Array.<number>` | An array of indices representing the position. |

**Returns:** `*` The value at the specified indices, or undefined if out of bounds.

##### `setVal(A, indices, value)`

Alias for setValueAt.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The target array. |
| `indices` | `Array.<number>` | An array of indices representing the position. |
| `value` | `*` | The value to set. |

**Returns:** `*` The value that was set.

##### `getVal(A, indices)`

Alias for getValueAt.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The source array. |
| `indices` | `Array.<number>` | An array of indices representing the position. |

**Returns:** `*` The value at the specified indices, or undefined if out of bounds.

##### `arrayIntersect(A, B)`

Returns the intersection of two arrays.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | First array. |
| `B` | `Array` | Second array. |

**Returns:** `Array` Common elements.

##### `cloneArray(A)`

Creates a shallow copy of the provided array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to clone. |

**Returns:** `Array` A new array containing all elements from A.

##### `createArray(length, [dimensions])`

Creates an n-dimensional array.

| Parameter | Type | Description |
| --- | --- | --- |
| `length` | `number` | The size of the first dimension. |
| `dimensions` | `number` | Sizes of subsequent dimensions. Optional. |

**Returns:** `Array` The newly created n-dimensional array.

##### `createFilledArray(length, val, [dimensions])`

Creates an n-dimensional array filled with a specific value.

| Parameter | Type | Description |
| --- | --- | --- |
| `length` | `number` | The size of the first dimension. |
| `val` | `*` | The value to fill the array with. |
| `dimensions` | `number` | Sizes of subsequent dimensions. Optional. |

**Returns:** `Array` The filled n-dimensional array.

##### `fill(val, A, length)`

Fills the array with a specific value.

| Parameter | Type | Description |
| --- | --- | --- |
| `val` | `*` | The value to fill the array with. |
| `A` | `Array` | The array to fill. |
| `length` | `number` | The number of elements to fill. |

##### `NaNs(size)`

Creates an n-dimensional array filled with NaN.

| Parameter | Type | Description |
| --- | --- | --- |
| `size` | `number` | The size of each dimension. |

**Returns:** `Array` The NaN-filled n-dimensional array.

##### `zeros(size)`

Creates an n-dimensional array filled with zeros.

| Parameter | Type | Description |
| --- | --- | --- |
| `size` | `number` | The size of each dimension. |

**Returns:** `Array` The zero-filled n-dimensional array.

##### `ones(size)`

Creates an n-dimensional array filled with ones.

| Parameter | Type | Description |
| --- | --- | --- |
| `size` | `number` | The size of each dimension. |

**Returns:** `Array` The one-filled n-dimensional array.

##### `eye(size)`

Creates a 2-dimensional identity matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `size` | `number` | The size of the identity matrix. |

**Returns:** `Array` The identity matrix as a 2D array.

##### `scale(A, s)`

Scales an array by a scalar.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The array to scale. |
| `s` | `number` | The scalar value. |

**Returns:** `Array.<number>` The scaled array.

##### `linspace(x1, x2, [N])`

Creates a linearly spaced vector.

| Parameter | Type | Description |
| --- | --- | --- |
| `x1` | `number` | The start value. |
| `x2` | `number` | The end value. |
| `N` | `number` | The number of points. Optional. Default: `100`. |

**Returns:** `Array.<number>` The linearly spaced vector.

##### `range(args)`

Generates an array of numbers within a specified range.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | The start, end, and optional step for the range. |

**Returns:** `Array.<number>` An array containing numbers within the specified range.

##### `colon(x1, x2, dx)`

Generates a sequence of numbers from `x1` to `x2` with increments of `dx`.

| Parameter | Type | Description |
| --- | --- | --- |
| `x1` | `number` | The starting value of the sequence. |
| `x2` | `number` | The ending value of the sequence. |
| `dx` | `number` | The increment between values in the sequence. |

**Returns:** `Array.<number>` An array of numbers from `x1` to `x2` with step size `dx`.

##### `elementWise(func, arrays)`

Applies a function to corresponding elements of one or more arrays.

| Parameter | Type | Description |
| --- | --- | --- |
| `func` | `function` | The function to apply to the elements. |
| `arrays` | `Array` | One or more arrays to process. |

**Returns:** `Array` A new array with the function applied to each corresponding element.

##### `arrayfun(A, dim, fun)`

Applies a function to each element of an array or matrix along a specified dimension.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array \| Matrix` | The array or matrix to process. |
| `dim` | `number` | The dimension along which to apply the function. |
| `fun` | `function` | The function to apply to each element. |

**Returns:** `Array | Matrix` The result of applying the function to A.

##### `divideEl(x, y)`

Performs element-wise division on two arrays or matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The numerator array or matrix. |
| `y` | `Array \| Matrix` | The denominator array or matrix. |

**Returns:** `Array | Matrix` The result of the element-wise division.

##### `multiplyEl(x, y)`

Performs element-wise multiplication on two arrays or matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The first array or matrix. |
| `y` | `Array \| Matrix` | The second array or matrix. |

**Returns:** `Array | Matrix` The result of the element-wise multiplication.

##### `powEl(x, y)`

Raises elements of an array or matrix to the power of elements in another array or matrix, element-wise.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The base array or matrix. |
| `y` | `Array \| Matrix \| number` | The exponent array, matrix, or scalar. |

**Returns:** `Array | Matrix` The result of the element-wise exponentiation.

##### `dot(x, y, [cols])`

Calculates the dot product of two vectors or matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array.<number>` | The first input vector or flat array. |
| `y` | `Array.<number>` | The second input vector or flat array. |
| `cols` | `number` | Optional number of columns to reshape the inputs into matrices. Optional. |

**Returns:** `number | Array.<Array.<number>>` The resulting dot product, either as a scalar or a matrix.

##### `lZero(e)`

Determines if the element is greater than zero.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | `number` | The element to check. |

**Returns:** `boolean` True if greater than zero, otherwise false.

##### `b2i(arr)`

Converts a boolean array into an array of indices where the values are `true`.

| Parameter | Type | Description |
| --- | --- | --- |
| `arr` | `Array.<boolean>` | The input array of boolean values. |

**Returns:** `Array.<number>` An array of indices corresponding to `true` values in the input array.

##### `average(arr)`

Calculates the average value of an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `arr` | `Array.<number>` | The array to average. |

**Returns:** `number` The average value.

##### `averageEM(data, alpha)`

Calculates the Exponential Moving Average of the data.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array.<number>` | The data array. |
| `alpha` | `number` | The smoothing factor between 0 and 1. |

**Returns:** `Array.<number>` The Exponential Moving Average of the data.

##### `averageMoving(inputArray, windowSize)`

Applies a moving average filter to an input array while keeping the output array the same size.

| Parameter | Type | Description |
| --- | --- | --- |
| `inputArray` | `Array.<number>` | The array of numbers to filter. |
| `windowSize` | `number` | The size of the moving window (number of elements to average). |

**Returns:** `Array.<number>` The filtered array with the same length as the input array.

##### `movmean(inputArray, windowSize)`

Applies a moving average filter to an input array while keeping the output array the same size.

| Parameter | Type | Description |
| --- | --- | --- |
| `inputArray` | `Array.<number>` | The array of numbers to filter. |
| `windowSize` | `number` | The size of the moving window (number of elements to average). |

**Returns:** `Array.<number>` The filtered array with the same length as the input array.

##### `isequal(A1, A2)`

Determines if two arrays are equal.

| Parameter | Type | Description |
| --- | --- | --- |
| `A1` | `Array` | The first array. |
| `A2` | `Array` | The second array. |

**Returns:** `boolean` True if arrays are equal, otherwise false.

##### `neg(A)`

Negates the boolean values in an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<boolean>` | The array to negate. |

**Returns:** `Array.<boolean>` The negated array.

##### `all(A)`

Determines if all elements in an array evaluate to true.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<boolean>` | The array to check. |

**Returns:** `boolean` True if all elements are true, otherwise false.

##### `any(A)`

Determines if any element in an array evaluates to true.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<boolean>` | The array to check. |

**Returns:** `boolean` True if any element is true, otherwise false.

##### `arrayContains(arr, item)`

Checks if the array contains a specified item.

| Parameter | Type | Description |
| --- | --- | --- |
| `arr` | `Array` | The array to search. |
| `item` | `*` | The item to search for. |

**Returns:** `boolean` True if the item is found, otherwise false.

##### `hasDuplicates(array)`

Checks if an array contains any duplicate elements.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array` | The array to check for duplicates. |

**Returns:** `boolean` True if duplicates are found, false otherwise.

##### `removeDuplicates(arr)`

Removes duplicate values from an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `arr` | `Array` | The array from which duplicates are to be removed. |

**Returns:** `Array` An array containing only unique elements from the original array.

##### `fliplr(array)`

Reverses the order of elements in each row of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array` | The matrix array to flip horizontally. |

**Returns:** `Array` The horizontally flipped matrix.

##### `movelr(array, n)`

Moves the first `n` elements of the array to the end.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array` | The array to be modified. |
| `n` | `number` | The number of elements to move from the start to the end. |

**Returns:** `Array` The modified array with the first `n` elements moved to the end.

##### `plus(args)`

Adds multiple operands, which can be either scalars or arrays.
If multiple operands are arrays, they must be of the same length.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| Array.<number>` | The operands, scalar or arrays. |

**Returns:** `number | Array.<number>` The result of adding all operands.

##### `add(args)`

Adds multiple operands, which can be either scalars or arrays.
If multiple operands are arrays, they must be of the same length.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| Array.<number>` | The operands, scalar or arrays. |

**Returns:** `number | Array.<number>` The result of adding all operands.

##### `minus(args)`

Subtracts multiple operands from the first one, which can be either scalars or arrays.
If multiple operands are arrays, they must be of the same length.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| Array.<number>` | The operands, scalar or arrays. |

**Returns:** `number | Array.<number>` The result of subtracting all subsequent operands from the first one.

##### `subtract(args)`

Subtracts multiple operands from the first one, which can be either scalars or arrays.
If multiple operands are arrays, they must be of the same length.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| Array.<number>` | The operands, scalar or arrays. |

**Returns:** `number | Array.<number>` The result of subtracting all subsequent operands from the first one.

##### `cross3D(A, B, cols)`

Computes the cross product of two 3D vectors.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The first 3D vector. |
| `B` | `Array.<number>` | The second 3D vector. |
| `cols` | `number` | The number of columns (typically 1 for single vectors). Default: `1`. |

**Returns:** `Array.<number>` The cross product vector.

##### `inv(A, size)`

Computes the inverse of a matrix represented as a flat array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The input matrix in a flat array format. |
| `size` | `number` | The number of rows and columns in the matrix. |

**Returns:** `Array.<number> | false` The inverted matrix as a flat array, or `false` if the matrix is non-invertible.

##### `concatRow(cols_C, args)`

Concatenates multiple matrices row-wise.

| Parameter | Type | Description |
| --- | --- | --- |
| `cols_C` | `number` | The number of columns in the concatenated matrix. |
| `args` | `Array` | The matrices to concatenate. |

**Returns:** `Array` The concatenated matrix.

##### `concatCol(rows_C, args)`

Concatenates multiple matrices column-wise.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows_C` | `number` | The number of rows in the concatenated matrix. |
| `args` | `Array` | The matrices to concatenate. |

**Returns:** `Array` The concatenated matrix.

##### `concat(args)`

Concatenates multiple vectors.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `Array` | The vectors to concatenate. |

**Returns:** `Array` The concatenated vector.

##### `repRow(A, rows)`

Repeats a row vector multiple times.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The row vector to repeat. |
| `rows` | `number` | The number of times to repeat the row. |

**Returns:** `Array` The repeated row matrix.

##### `repCol(A, cols)`

Repeats a column vector multiple times.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The column vector to repeat. |
| `cols` | `number` | The number of times to repeat the column. |

**Returns:** `Array` The repeated column matrix.

##### `sumRow(A, rows, cols)`

Sums the elements of each row in a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The matrix array. |
| `rows` | `number` | The number of rows in the matrix. |
| `cols` | `number` | The number of columns in the matrix. |

**Returns:** `Array.<number>` An array containing the sum of each row.

##### `sumCol(A, rows, cols)`

Sums the elements of each column in a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The matrix array. |
| `rows` | `number` | The number of rows in the matrix. |
| `cols` | `number` | The number of columns in the matrix. |

**Returns:** `Array.<number>` An array containing the sum of each column.

##### `normRow(A, rows, cols)`

Calculates the Euclidean norm of each row in a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The matrix array. |
| `rows` | `number` | The number of rows in the matrix. |
| `cols` | `number` | The number of columns in the matrix. |

**Returns:** `Array.<number>` An array containing the norm of each row.

##### `normCol(A, rows, cols)`

Calculates the Euclidean norm of each column in a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The matrix array. |
| `rows` | `number` | The number of rows in the matrix. |
| `cols` | `number` | The number of columns in the matrix. |

**Returns:** `Array.<number>` An array containing the norm of each column.

##### `transpose(A, rows, cols)`

Transposes a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The matrix array to transpose. |
| `rows` | `number` | The number of rows in the original matrix. |
| `cols` | `number` | The number of columns in the original matrix. |

**Returns:** `Array.<number>` The transposed matrix array.

##### `transpose2D(A)`

Transposes a 2D matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<Array>` | Input matrix. |

**Returns:** `Array.<Array>` Transposed matrix.

##### `multiply(A, B, rows_A, cols_A, cols_B)`

Multiplies two matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The first matrix array. |
| `B` | `Array.<number>` | The second matrix array. |
| `rows_A` | `number` | The number of rows in matrix A. |
| `cols_A` | `number` | The number of columns in matrix A. |
| `cols_B` | `number` | The number of columns in matrix B. |

**Returns:** `Array.<number>` The resulting matrix array after multiplication.

##### `dotColumn(A, B, rows, cols)`

Performs element-wise dot product on columns of two matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The first matrix array. |
| `B` | `Array.<number>` | The second matrix array. |
| `rows` | `number` | The number of rows in each matrix. |
| `cols` | `number` | The number of columns in each matrix. |

**Returns:** `Array.<number>` An array containing the dot product of each column.

##### `diag(A, length)`

Creates a diagonal matrix from a given array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The array to form the diagonal. |
| `length` | `number` | The size of the square matrix. |

**Returns:** `Array.<number>` The diagonal matrix as a 1D array.

##### `linsolve(A, B, N)`

Solves a linear system of equations using LU decomposition.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The coefficient matrix. |
| `B` | `Array.<number>` | The constant terms. |
| `N` | `number` | The size of the matrix (NxN). |

**Returns:** `Array.<number>` The solution vector.

##### `reciprocal(A, length)`

Computes the reciprocal of each element in the array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The array of numbers. |
| `length` | `number` | The number of elements in the array. |

**Returns:** `Array.<number>` An array containing the reciprocals of the original elements.

##### `reshape(A, rows, cols)`

Reshapes an array into a new dimension.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to reshape. |
| `rows` | `number` | The number of rows in the new shape. |
| `cols` | `number` | The number of columns in the new shape. |

**Returns:** `Array` The reshaped array.

##### `maxi(A)`

Finds the maximum element in the array and its index, excluding NaN values.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The array to search. |

**Returns:** `Array` An array containing the max value and its index.

##### `mini(A)`

Finds the minimum element in the array and its index, excluding NaN values.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The array to search. |

**Returns:** `Array` An array containing the min value and its index.

##### `sorti(A)`

Sorts the array in ascending order with indices, excluding NaN values.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The array to sort. |

**Returns:** `Array` An array containing the sorted values and their original indices.

##### `weightedSum(ret, w1, v1, w2, v2)`

Computes the weighted sum of two vectors and stores the result in the `ret` array.

| Parameter | Type | Description |
| --- | --- | --- |
| `ret` | `Array.<number>` | The array to store the result. |
| `w1` | `number` | Weight for the first vector. |
| `v1` | `Array.<number>` | The first vector. |
| `w2` | `number` | Weight for the second vector. |
| `v2` | `Array.<number>` | The second vector. |

##### `condiff(A)`

Computes the consecutive differences of elements in an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The input array of numbers. |

**Returns:** `Array.<number>` An array containing the differences between consecutive elements of the input array.

##### `arrayRand(l, u, rows, cols, [randFun])`

Generates an array with random floating-point numbers within a specified range.

| Parameter | Type | Description |
| --- | --- | --- |
| `l` | `number` | The lower bound of the range. |
| `u` | `number` | The upper bound of the range. |
| `rows` | `number` | The number of rows. |
| `cols` | `number` | The number of columns. |
| `randFun` | `function` | The random function to use. Optional. Default: `Math.random`. |

**Returns:** `Array.<number>` An array filled with random numbers within the specified range.

##### `arrayRandi(lu, rows, cols, [randFun])`

Generates an array with random integer numbers within a specified range.

| Parameter | Type | Description |
| --- | --- | --- |
| `lu` | `Array.<number>` | An array containing the lower and upper bounds [lower, upper]. |
| `rows` | `number` | The number of rows. |
| `cols` | `number` | The number of columns. |
| `randFun` | `function` | The random function to use. Optional. Default: `Math.random`. |

**Returns:** `Array.<number>` An array filled with random integers within the specified range.

##### `normalizeVector(v)`

Normalizes a 3D vector.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `Array.<number>` | The vector to normalize. |

**Returns:** `Array.<number>` The normalized vector.

##### `dotVector(a, b)`

Computes the dot product of two 3D vectors.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array.<number>` | The first vector. |
| `b` | `Array.<number>` | The second vector. |

**Returns:** `number` The dot product of the vectors.

##### `angleVectors(a, b)`

Calculates the angle between two vectors.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array.<number>` | The first vector. |
| `b` | `Array.<number>` | The second vector. |

**Returns:** `number` The angle in radians between vectors a and b.

##### `skewVector(v)`

Creates a skew-symmetric matrix from a 3D vector.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `Array.<number>` | The vector to skew. |

**Returns:** `Array.<number>` The skew-symmetric matrix as a 1D array.

##### `meshgrid(args)`

Generates coordinate matrices from coordinate vectors for N dimensions.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `Array.<number>` | The coordinate vectors. |

**Returns:** `Array` The coordinate grids for each dimension.

##### `areEqual(A1, A2)`

Determines if two arrays are equal by comparing each element.

| Parameter | Type | Description |
| --- | --- | --- |
| `A1` | `Array` | The first array to compare. |
| `A2` | `Array` | The second array to compare. |

**Returns:** `boolean` True if the arrays are equal, otherwise false.

##### `dispMatrix(varname, A, rows, cols)`

Displays a matrix with a variable name.

| Parameter | Type | Description |
| --- | --- | --- |
| `varname` | `string` | The name of the variable. |
| `A` | `Array.<number>` | The matrix array. |
| `rows` | `number` | The number of rows in the matrix. |
| `cols` | `number` | The number of columns in the matrix. |

**Returns:** `string` The string representation of the matrix.

##### `dispRowVector(varname, A, length)`

Displays a row vector with a variable name.

| Parameter | Type | Description |
| --- | --- | --- |
| `varname` | `string` | The name of the variable. |
| `A` | `Array.<number>` | The row vector array. |
| `length` | `number` | The length of the row vector. |

**Returns:** `string` The string representation of the row vector.

##### `dispColumnVector(varname, A, length)`

Displays a column vector with a variable name.

| Parameter | Type | Description |
| --- | --- | --- |
| `varname` | `string` | The name of the variable. |
| `A` | `Array.<number>` | The column vector array. |
| `length` | `number` | The length of the column vector. |

**Returns:** `string` The string representation of the column vector.

#### color

##### `colororder`

Color order

##### `color(id)`

Returns a color code based on the provided identifier.

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | `number \| string \| Array.<number>` | Identifier for the color. Can be a numeric index, a predefined color name, or an RGB array. |

**Returns:** `string` The hex code of the color.

##### `getColorG2R(value, [k])`

Calculates a color on a gradient from green to red based on a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` | A number between 0 and 1 indicating position on the gradient. |
| `k` | `number` | A scaling factor to adjust the gradient effect. Optional. Default: `0.3`. |

**Returns:** `string` The hsl color string.

##### `colourGradientor(p, rgb_beginning, rgb_end)`

Calculates the gradient color between two colors based on a percentage.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `number` | The percentage (0 to 1) between the two colors. |
| `rgb_beginning` | `Array.<number>` | The RGB values of the start color. |
| `rgb_end` | `Array.<number>` | The RGB values of the end color. |

**Returns:** `Array.<number>` The RGB values of the calculated gradient color.

##### `rgb2hex(r, g, b)`

Converts RGB color values to HEX.

| Parameter | Type | Description |
| --- | --- | --- |
| `r` | `number` | The red color value (0-255). |
| `g` | `number` | The green color value (0-255). |
| `b` | `number` | The blue color value (0-255). |

**Returns:** `Array.<number>` The HEX representation of the color.

##### `rgbToHsl(r, g, b)`

Converts RGB color values to HSL (Hue, Saturation, Lightness).

| Parameter | Type | Description |
| --- | --- | --- |
| `r` | `number` | The red color value (0-255). |
| `g` | `number` | The green color value (0-255). |
| `b` | `number` | The blue color value (0-255). |

**Returns:** `Array.<number>` The HSL representation of the color.

##### `hslToRgb(h, s, l)`

Converts HSL color values to RGB.

| Parameter | Type | Description |
| --- | --- | --- |
| `h` | `number` | The hue value (0-360). |
| `s` | `number` | The saturation value (0-100). |
| `l` | `number` | The lightness value (0-100). |

**Returns:** `Array.<number>` The RGB representation of the color.

##### `hueToRgb(v1, v2, vh)`

Helper function for converting a hue to RGB.

| Parameter | Type | Description |
| --- | --- | --- |
| `v1` | `number` | Helper value 1. |
| `v2` | `number` | Helper value 2. |
| `vh` | `number` | The hue value to convert. |

**Returns:** `number` The RGB value for the hue.

#### conversion

##### `speak(msg)`

Converts text to speech using the Web Speech API.

| Parameter | Type | Description |
| --- | --- | --- |
| `msg` | `string` | The text message to be spoken. |

##### `num2str(num, precision)`

Converts a number to a string with specified precision.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The number to convert. |
| `precision` | `number` | The number of digits after the decimal point. Default: `2`. |

**Returns:** `string` The formatted string.

##### `changeExtension(path, ext_new)`

Changes the extension of a file path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The original file path. |
| `ext_new` | `string` | The new extension without the dot. |

**Returns:** `string` The file path with the new extension.

##### `removeExtension(path)`

Remove the extension of a file path.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | The original file path. |

**Returns:** `string` The file path without extension.

##### `ned2rpy(roll, pitch, yaw, [A])`

Transforms coordinates from NED (North, East, Down) frame to RPY (Roll, Pitch, Yaw) frame.

| Parameter | Type | Description |
| --- | --- | --- |
| `roll` | `number` | The roll angle in radians. |
| `pitch` | `number` | The pitch angle in radians. |
| `yaw` | `number` | The yaw angle in radians. |
| `A` | `Array.<number>` | Optional matrix to apply transformation to. Optional. |

**Returns:** `Array.<Array.<number>>` The transformation matrix.

##### `uint8ToString(data)`

Converts an array of uint8 numbers to a string.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Uint8Array` | The array of uint8 numbers. |

**Returns:** `string` The converted string.

##### `hex2dec(hex)`

Converts an array of hexadecimal strings to an array of decimal numbers.

| Parameter | Type | Description |
| --- | --- | --- |
| `hex` | `Array.<string>` | The array of hexadecimal strings. |

**Returns:** `Array.<number>` The array of decimal numbers.

##### `numToASCII(num)`

Converts a number to its ASCII character equivalent.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The number to convert. |

**Returns:** `string` The ASCII character.

##### `numToHexStr(num, dig, prefix)`

Converts a number to a hexadecimal string with a fixed number of digits.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The number to convert. |
| `dig` | `number` | The number of digits in the resulting string. Default: `4`. |
| `prefix` | `boolean` | Whether to add a '0x' prefix. Default: `false`. |

**Returns:** `string` The hexadecimal string.

##### `int8To2ASCII(num)`

Converts an int8 number to two ASCII characters.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The int8 number. |

**Returns:** `string` The two ASCII characters.

##### `int16To4ASCII(num)`

Converts an int16 number to four ASCII characters representing its hexadecimal value.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The int16 number to convert. |

**Returns:** `string` A string of four ASCII characters.

##### `uint8sToInt16(part1, part2)`

Combines two uint8 values into an int16 value.

| Parameter | Type | Description |
| --- | --- | --- |
| `part1` | `number` | The first uint8 value. |
| `part2` | `number` | The second uint8 value. |

**Returns:** `number` The combined int16 value.

##### `uint8sToInt32(part1, part2, part3, part4)`

Combines four uint8 values into an int32 value.

| Parameter | Type | Description |
| --- | --- | --- |
| `part1` | `number` | The first uint8 value. |
| `part2` | `number` | The second uint8 value. |
| `part3` | `number` | The third uint8 value. |
| `part4` | `number` | The fourth uint8 value. |

**Returns:** `number` The combined int32 value.

##### `uint8sToFloat(part1, part2, part3, part4)`

Converts four uint8 values into a floating-point number.

| Parameter | Type | Description |
| --- | --- | --- |
| `part1` | `number` | The first uint8 value. |
| `part2` | `number` | The second uint8 value. |
| `part3` | `number` | The third uint8 value. |
| `part4` | `number` | The fourth uint8 value. |

**Returns:** `number` The floating-point number.

##### `uint16ToInt16(num)`

Converts a uint16 value to an int16 value.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The uint16 value to convert. |

**Returns:** `number` The converted int16 value.

##### `uint8To2ASCII(num)`

Converts a uint8 number to two ASCII characters.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The uint8 number to convert. |

**Returns:** `string` A string containing two ASCII characters representing the hexadecimal value.

##### `ms2time(ms)`

Converts milliseconds to a time string in mm:ss format.

| Parameter | Type | Description |
| --- | --- | --- |
| `ms` | `number` | The time in milliseconds. |

**Returns:** `string` The time string.

##### `dec2bin(x)`

Converts a decimal number to a binary string.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number` | The decimal number. |

**Returns:** `string` The binary string.

##### `dec2hex(x)`

Converts a decimal number to a hexadecimal string.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number` | The decimal number. |

**Returns:** `string` The hexadecimal string.

##### `dec2oct(x)`

Converts a decimal number to an octal string.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number` | The decimal number. |

**Returns:** `string` The octal string.

##### `round(number, [decimals], [string])`

Rounds a number to a specified number of decimal places.

| Parameter | Type | Description |
| --- | --- | --- |
| `number` | `number` | The number to round. |
| `decimals` | `number` | The number of decimal places. Optional. Default: `2`. |
| `string` | `boolean` | Whether to return the result as a string. Optional. Default: `false`. |

**Returns:** `number | string` The rounded number.

##### `roundIf(value, p)`

Rounds a number to a fixed number of decimal places if it is a number.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` | The value to round. |
| `p` | `number` | The number of digits after the decimal point. |

**Returns:** `number` The rounded number with a fixed number of decimal places, or the original value if it is not a number.

##### `roundIfPrec(value, p)`

Rounds a number to a fixed number of decimal places if it is a number.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` | The value to round. |
| `p` | `number` | The number of digits after the decimal point. |

**Returns:** `number` The rounded number with a fixed number of decimal places, or the original value if it is not a number.

##### `bitString(n)`

Converts a uint8_t number to a bit string.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number` | The number to convert. |

**Returns:** `string` A bit string representing the number.

##### `getBitFlags(map, name_column, val)`

Generates a set of flags from a bitfield based on a mapping.

| Parameter | Type | Description |
| --- | --- | --- |
| `map` | `Object` | The mapping of bit positions to flag names. |
| `name_column` | `string` | The column name in the mapping that contains the flag names. |
| `val` | `number` | The bitfield value. |

**Returns:** `Object` An object with keys as flag names and values indicating the presence (1) or absence (0) of each flag.

##### `getEnumVal(enum_object, prop, val)`

Retrieves the enumeration value based on a property match.

| Parameter | Type | Description |
| --- | --- | --- |
| `enum_object` | `Object` | The enumeration object to search. |
| `prop` | `string` | The property name to match. |
| `val` | `*` | The property value to match. |

**Returns:** `number` The enumeration key as a number, or the index if not found.

##### `invertEnum(enum_object, [prop])`

Inverts an enumeration, swapping keys and values, optionally based on a specific property of the enumeration values.

| Parameter | Type | Description |
| --- | --- | --- |
| `enum_object` | `Object` | The enumeration object to invert. |
| `prop` | `string` | An optional property name to use from the enumeration values. Optional. |

**Returns:** `Object` The inverted enumeration object.

##### `arrayToHexStr(A, [prefix])`

Converts an array of numbers to a string of hexadecimal values, optionally prefixed with "0x".

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<number>` | The array to convert. |
| `prefix` | `boolean` | Whether to add a "0x" prefix to each hex value. Optional. Default: `true`. |

**Returns:** `string` A string of hexadecimal values.

##### `arrayToASCII(array)`

Converts an array of numbers to an ASCII string.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array.<number>` | The array of numbers to convert. |

**Returns:** `string` The ASCII string representation of the array.

##### `extend(objects)`

Extends an object with properties from additional objects.

| Parameter | Type | Description |
| --- | --- | --- |
| `objects` | `Object` | The objects to merge into the target object. |

**Returns:** `Object` The extended object.

##### `normalizeRC(rc, [deadzone])`

Normalizes the value of a radio control (RC) input.

| Parameter | Type | Description |
| --- | --- | --- |
| `rc` | `number` | The RC input value. |
| `deadzone` | `number` | The deadzone value below which the output is set to zero. Optional. Default: `0`. |

**Returns:** `number` The normalized value.

##### `toRC(val, [deadzone])`

Converts a value to its equivalent RC (Radio Control) signal value, accounting for an optional deadzone.

| Parameter | Type | Description |
| --- | --- | --- |
| `val` | `number` | The input value to convert. |
| `deadzone` | `number` | The deadzone value within which the RC signal should default to 1500. Optional. Default: `0`. |

**Returns:** `number` The converted RC signal value.

##### `checkValueUpdate(data)`

Checks if a value has been updated and updates the last value if it has.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Object` | An object containing the current value and the last value. |

**Returns:** `boolean` True if the value has been updated; false otherwise.

##### `resetValue(data)`

Resets the value and last value properties of an object.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Object` | The object whose value and last value properties will be reset. |

##### `adcToNewtons(adc_count, load_cell_capacity, [adc_resolution], [adc_gain], [adc_sensitivity], [adc_bipolar])`

Converts an ADC count to force in Newtons.

| Parameter | Type | Description |
| --- | --- | --- |
| `adc_count` | `number` | The raw ADC count value. |
| `load_cell_capacity` | `number` | The capacity of the load cell in Newtons. |
| `adc_resolution` | `number` | The ADC resolution in bits. Optional. Default: `24`. |
| `adc_gain` | `number` | The gain applied to the ADC. Optional. Default: `128`. |
| `adc_sensitivity` | `number` | The ADC sensitivity in mV/V. Optional. Default: `2`. |
| `adc_bipolar` | `boolean` | Indicates if the ADC is bipolar. Optional. Default: `true`. |

**Returns:** `number` The calculated force in Newtons.

##### `data2blobUrl(file_path_in)`

Converts file data from a given path to a blob URL.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path_in` | `string` | Relative path from the application's base path to the file. |

**Returns:** `string` A blob URL representing the file's data.

##### `trbl2xy(cont_width, cont_height, width, height, top, right, bottom, left)`

Converts top, right, bottom, and left margins into x and y coordinates.

| Parameter | Type | Description |
| --- | --- | --- |
| `cont_width` | `number` | Container width. |
| `cont_height` | `number` | Container height. |
| `width` | `number` | Element width. |
| `height` | `number` | Element height. |
| `top` | `number` | Top margin. |
| `right` | `number` | Right margin. |
| `bottom` | `number` | Bottom margin. |
| `left` | `number` | Left margin. |

**Returns:** `Array` Array containing x and y coordinates.

##### `simpleObj2Csv(data, [delimiter])`

Generates a CSV string from an simple object containing arrays of values.
Each key in the object represents a column in the CSV. This function handles uneven array lengths by filling missing values with an empty string.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Object` | The object containing arrays of data. Each key will be a column header. |
| `delimiter` | `string` | The delimiter to use for separating entries in the CSV (defaults to a comma). Optional. Default: `','`. |

**Returns:** `string` The generated CSV as a string, with each row representing an entry and each column representing data from the corresponding key in the input object.

##### `simpleArray2Csv(data, [delimiter])`

Converts a 2D array into a CSV string format.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array` | An array of arrays to be converted into CSV format. |
| `delimiter` | `string` | The delimiter to separate the values in the CSV. Optional. Default: `','`. |

**Returns:** `string` The formatted CSV string.

##### `latexToHtml(latex)`

Converts a subset of LaTeX/TeX math syntax into HTML/Unicode.

| Parameter | Type | Description |
| --- | --- | --- |
| `latex` | `string` | LaTeX/TeX input string. |

**Returns:** `string` HTML/Unicode string.

#### device

##### `checkDriver(driver_name)`

Checks if a specific driver is installed on the system.

| Parameter | Type | Description |
| --- | --- | --- |
| `driver_name` | `string` | Name of the driver to check. |

**Returns:** `boolean` True if the driver is found, false otherwise.

##### `checkDriverFTDI()`

Checks if the drivers for FTDI devices are installed.

**Returns:** `boolean` True if the drivers are found, false otherwise.

##### `checkDriverCP210x()`

Checks if the drivers for Silicon Labs CP210x USB to UART bridge are installed.

**Returns:** `boolean` True if the drivers are found, false otherwise.

##### `checkDriverCH340()`

Checks if the drivers for CH340 USB to serial converter are installed.

**Returns:** `boolean` True if the drivers are found, false otherwise.

##### `checkArduino()`

Check if Arduino CLI is available.

**Returns:** `boolean` True if available.

##### `compileArduino(dir)`

Compile Arduino project.

| Parameter | Type | Description |
| --- | --- | --- |
| `dir` | `string` | Project directory. |

**Returns:** `Object | boolean` Compilation result or false on error.

##### `uploadArduino(dir, [port])`

Upload Arduino project.

| Parameter | Type | Description |
| --- | --- | --- |
| `dir` | `string` | Project directory. |
| `port` | `string` | Optional port. Optional. |

**Returns:** `Object | boolean` Upload result or false on error.

##### `parseArduinoOutput(output)`

Parses Arduino output from stdout or stderr.

| Parameter | Type | Description |
| --- | --- | --- |
| `output` | `object` |  |

**Returns:** `object`

##### `getGamepads()`

Retrieves the current state of all connected gamepads.

**Returns:** `Array.<Object>` An array of connected gamepad objects.

##### `onGamepadConnected(callback)`

Registers a callback function to be called when a gamepad is connected.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | The function to execute when a gamepad connects. |

##### `onGamepadDisconnected(callback)`

Registers a callback function to be called when a gamepad is disconnected.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | The function to execute when a gamepad disconnects. |

##### `getGamepad(id, dt)`

Retrieves a specific gamepad by its ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | `number` | The index of the gamepad to retrieve. |
| `dt` | `number` | Data reading interval in milliseconds. |

**Returns:** `PRDC_JSLAB_DEVICE_GAMEPAD` The corresponding gamepad object.

##### `getWebcams()`

Retrieves a list of available webcam (video input) devices.

**Returns:** `Array.<Object>` A promise that resolves to an array of video input devices.

##### `getMicrophones()`

Retrieves a list of available microphone (audio input) devices.

**Returns:** `Array.<Object>` A promise that resolves to an array of audio input devices.

##### `getAudioOutputs()`

Retrieves a list of available audio output devices.

**Returns:** `Array.<Object>` A promise that resolves to an array of audio output devices.

##### `webcam(device_id)`

Opens a new window to display the webcam feed from the specified device.

| Parameter | Type | Description |
| --- | --- | --- |
| `device_id` | `string` | The unique identifier of the webcam device to use. |

**Returns:** `Promise.<WebcamResult>` An object containing the window instance, video element, and media stream.

##### `webcamCapture(opts, frameCallback, [editCallback])`

Initiates webcam video capture.

| Parameter | Type | Description |
| --- | --- | --- |
| `opts` | `Object` | Configuration options for webcam capture. |
| `frameCallback` | `function` | Callback invoked with each frame's image data buffer. |
| `editCallback` | `function` | Optional callback to edit each frame before processing. Optional. |

##### `getDesktopSources()`

Retrieves desktop sources from the current environment.

**Returns:** `Array.<DesktopSource>` An array of desktop sources.

##### `showDesktopSources()`

Displays the available desktop sources by generating and injecting HTML elements for each source.

**Returns:** `void`

##### `desktopCapture(opts, frameCallback, [editCallback])`

Initiates desktop screen capture.

| Parameter | Type | Description |
| --- | --- | --- |
| `opts` | `Object` | Configuration options for desktop capture. |
| `frameCallback` | `function` | Callback invoked with each frame's image data buffer. |
| `editCallback` | `function` | Optional callback to edit each frame before processing. Optional. |

##### `capture(opts, opts.id, opts.type, frameCallback, [editCallback])`

Captures media frames based on the provided options.

| Parameter | Type | Description |
| --- | --- | --- |
| `opts` | `Object` | Configuration options for capturing. |
| `opts.id` | `string` | The ID of the media source. |
| `opts.type` | `string` | Type of capture ('webcam' or 'desktop'). |
| `frameCallback` | `function` | Callback invoked with each frame's image data buffer. |
| `editCallback` | `function` | Optional callback to edit each frame before processing. Optional. |

**Returns:** `Object` An object containing control functions and resources for the capture session.

**Returns:** `function` return.stop - Function to stop the capture.

**Returns:** `CanvasRenderingContext2D` return.ctx - The 2D rendering context of the OffscreenCanvas.

**Returns:** `OffscreenCanvas` return.offscreenCanvas - The OffscreenCanvas used for rendering frames.

**Returns:** `MediaStreamTrack` return.videoTrack - The video track being captured.

**Returns:** `MediaStreamTrackProcessor` return.trackProcessor - The processor for the video track.

**Returns:** `ReadableStreamDefaultReader` return.reader - Reader for the media stream.

##### `getCameraResolutions(device_id)`

Gets supported camera resolutions for a specific device.

| Parameter | Type | Description |
| --- | --- | --- |
| `device_id` | `string` | The camera device ID. |

**Returns:** `Promise.<Array.<Object>>` Supported resolutions.

##### `showAudioWaveform(device_id, [fftSize])`

Displays an audio waveform on the canvas.

| Parameter | Type | Description |
| --- | --- | --- |
| `device_id` | `string` | The microphone device ID. |
| `fftSize` | `number` | FFT size for analysis. Optional. Default: `2048`. |

**Returns:** `Object` Controls to stop or reset the waveform.

##### `startVideoRecording(source, [opts])`

Records video from the specified canvas element, webcam deviceId, or desktop sourceId and returns a MediaRecorder augmented with an async stopRecording() that finalizes and saves the file.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `HTMLCanvasElement \| string` | Canvas element, webcam deviceId, or desktop sourceId to capture. |
| `opts` | `Object` | Optional settings: type ('canvas' \| 'webcam' \| 'desktop'), fps, mimeType, and videoBitsPerSecond. Optional. Default: `{}`. |

**Returns:** `MediaRecorder` - MediaRecorder that streams the capture and provides a helper to stop and save.

#### serial_device

##### `listSerialPorts()`

Retrieves all available serial ports.

**Returns:** `Promise.<Array>` Resolves with an array of serial port info.

##### `requestSerialPort()`

Prompts the browser to authorize a serial port if supported.

**Returns:** `Promise.<(Object|false)>`

##### `checkDeviceUSB(VID, PID)`

Checks if there is a USB device connected with the specified Vendor ID and Product ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `VID` | `string` | Vendor ID of the USB device. |
| `PID` | `string` | Product ID of the USB device. |

**Returns:** `boolean` True if the device is found, false otherwise.

##### `checkDeviceSTM([PID])`

Checks for a connected USB device by STM and an optional Product ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `PID` | `string` | Product ID of the USB device, default is for Virtual COM Port. Optional. Default: `'5740'`. |

**Returns:** `boolean` True if the device is found, false otherwise.

##### `checkDeviceCH340()`

Checks if there is a USB device connected using a CH340 chip.

**Returns:** `boolean` True if the device is found, false otherwise.

##### `connectSerialPorts(port, [baudrate], [opts])`

Opens a serial port.

| Parameter | Type | Description |
| --- | --- | --- |
| `port` | `string` | Port path. |
| `baudrate` | `number` | Baud rate. Optional. Default: `9600`. |
| `opts` | `object` | Additional options. Optional. Default: `{}`. |

**Returns:** `SerialPort` The opened SerialPort instance.

##### `chooseSerialPort()`

Opens a window to choose a serial port.

**Returns:** `Promise.<(string|false)>`

##### `chooseSerialOptions()`

Opens a window to choose serial options.

**Returns:** `Promise.<(string|false)>`

##### `openSerialTerminal(port_path, [baudrate], [opts])`

Opens a serial terminal.

| Parameter | Type | Description |
| --- | --- | --- |
| `port_path` | `string` | The identifier or path of the serial port to connect to. |
| `baudrate` | `number` | The communication speed in bits per second. Optional. Default: `9600`. |
| `opts` | `Object` | An optional configuration object for additional settings. Optional. Default: `{}`. |

**Returns:** `Promise.<Object>` A promise that resolves with the terminal context.

##### `chooseSerialTerminal([opts])`

Prompts the user to choose serial options and opens a serial terminal if a valid port is selected.

| Parameter | Type | Description |
| --- | --- | --- |
| `opts` | `Object` | An optional configuration object for additional settings. Optional. Default: `{}`. |

**Returns:** `Promise.<(Object|undefined)>` A promise that resolves with the terminal context if a serial port is chosen.

#### file_system

##### `readFile(file_path)`

Reads the content of a file at the specified path.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `string` | Path to the file. |

**Returns:** `Buffer | string | false` The content of the file or false in case of an error.

##### `getContentFromCharRange(filepath, range)`

Extract substring from file using range

| Parameter | Type | Description |
| --- | --- | --- |
| `filepath` | `string` | Path to file |
| `range` | `Array` | Character range [start, end] |

**Returns:** `string` - Extracted substring

##### `writeFile(file_path, data)`

Writes data to a specified file synchronously. This method should overwrite the file if it already exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `string` | The path to the file where data will be written. |
| `data` | `Buffer \| string` | The data to write to the file. |

**Returns:** `boolean` Returns true if the file was written successfully, false if an error occurred.

##### `deleteFile(file_path)`

Deletes a specified file synchronously.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `string` | The path to the file that should be deleted. |

**Returns:** `boolean` Returns true if the file was deleted successfully, false if an error occurred.

##### `readDir(folder)`

Reads the contents of a directory synchronously.

| Parameter | Type | Description |
| --- | --- | --- |
| `folder` | `string` | The path to the directory. |

**Returns:** `Array.<string> | false` An array of filenames or false in case of an error.

##### `deleteDir(file_path)`

Deletes a specified file synchronously.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `string` | The path to the file that should be deleted. |

**Returns:** `boolean` Returns true if the file was deleted successfully, false if an error occurred.

##### `moveFile(source, destination)`

Moves a file from source to destination.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `string` | The path to the source file. |
| `destination` | `string` | The path to the destination file. |

##### `copyFile(source, destination)`

Copies a file from source to destination.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `string` | The path to the source file. |
| `destination` | `string` | The path to the destination file. |

##### `filesInFolder(folder, ext)`

Lists files in a specified folder, optionally filtering by extension.

| Parameter | Type | Description |
| --- | --- | --- |
| `folder` | `string` | Path to the folder. |
| `ext` | `string` | File extension filter. |

**Returns:** `Array.<string> | void` Array of file paths matching the extension in the specified folder.

##### `allFilesInFolder(folder)`

Lists all files in a specified folder

| Parameter | Type | Description |
| --- | --- | --- |
| `folder` | `string` | Path to the folder. |

**Returns:** `Array.<string> | void` Array of file names.

##### `chooseFile(options)`

Opens a dialog for the user to choose a file, synchronously.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `Object` | Configuration options for the dialog. |

**Returns:** `string | Array.<string>` The selected file path(s) or an empty array if canceled.

##### `chooseFolder(options)`

Opens a dialog for the user to choose a folder, synchronously.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `Object` | Configuration options for the dialog. |

**Returns:** `string | Array.<string>` The selected folder path(s) or an empty array if canceled.

##### `getDefaultPath(type)`

Retrieves a default path based on a specified type.

| Parameter | Type | Description |
| --- | --- | --- |
| `type` | `string` | Type of the default path (e.g., 'root', 'documents'). |

**Returns:** `string` The default path for the specified type.

##### `openFolder(filepath)`

Opens the specified folder in the system's file manager.

| Parameter | Type | Description |
| --- | --- | --- |
| `filepath` | `string` | Path to the folder. |

##### `makeDirectory(directory)`

Creates a directory at the specified path if it does not already exist.
This method delegates the directory creation task to the environment's makeDirectory function.

| Parameter | Type | Description |
| --- | --- | --- |
| `directory` | `string` | The path where the directory will be created. |

**Returns:** `boolean` True if the directory was successfully created or already exists, false if an error occurred.

##### `mkdir(directory)`

Alias for makeDirectory. Creates a directory at the specified path if it does not already exist.
This method delegates the directory creation task to the environment's makeDirectory function.

| Parameter | Type | Description |
| --- | --- | --- |
| `directory` | `string` | The path where the directory will be created. |

**Returns:** `boolean` True if the directory was successfully created or already exists, false if an error occurred.

##### `openDir(filepath)`

Opens the specified directory in the system's file manager. Alias for `openFolder`.

| Parameter | Type | Description |
| --- | --- | --- |
| `filepath` | `string` | Path to the directory. |

##### `showFolder(filepath)`

Shows the specified folder in the system's file manager. Alias for `openFolder`.

| Parameter | Type | Description |
| --- | --- | --- |
| `filepath` | `string` | Path to the folder. |

##### `showDir(filepath)`

Shows the specified directory in the system's file manager. Alias for `openDir`.

| Parameter | Type | Description |
| --- | --- | --- |
| `filepath` | `string` | Path to the directory. |

##### `openProgramFolder()`

Opens the program's root folder in the system's file manager.

##### `showFileInFolder(filepath)`

Shows the specified file in its containing folder within the system's file manager.

| Parameter | Type | Description |
| --- | --- | --- |
| `filepath` | `string` | Path to the file. |

##### `showFileInDir(filepath)`

Shows the specified file in its containing directory within the system's file manager. Alias for `showFileInFolder`.

| Parameter | Type | Description |
| --- | --- | --- |
| `filepath` | `string` | Path to the file. |

##### `readcsv(filePath, delimiter)`

Reads a CSV file and returns a promise that resolves with the parsed data.

| Parameter | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | Path to the CSV file. |
| `delimiter` | `string` | Delimiter used in the CSV file (e.g., ',', ';', '\t'). Default: `,`. |

**Returns:** `Array.<Object>` - Parsed CSV data as an array of objects.

##### `checkFile(file)`

Checks if the specified file exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | `string` | The path to the file to check. |

##### `existFile(file)`

Checks if the specified file exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | `string` | The path to the file to check. |

##### `checkDirectory(directory)`

Checks if the specified directory exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `directory` | `string` | The path to the directory to check. |

##### `existDirectory(directory)`

Checks if the specified directory exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `directory` | `string` | The path to the directory to check. |

##### `copyDir(src, dest)`

Recursively copies a directory from the source path to the destination path.

| Parameter | Type | Description |
| --- | --- | --- |
| `src` | `string` | The source directory path. |
| `dest` | `string` | The destination directory path. |

##### `copyFolder(src, dest)`

Copies a folder from the source path to the destination path.

| Parameter | Type | Description |
| --- | --- | --- |
| `src` | `string` | The source folder path. |
| `dest` | `string` | The destination folder path. |

##### `cp(src, dest)`

Copies a directory from the source path to the destination path.

| Parameter | Type | Description |
| --- | --- | --- |
| `src` | `string` | The source directory path. |
| `dest` | `string` | The destination directory path. |

##### `copyDir7z(src, dest)`

Copies a 7z archive from the source path to the destination path, extracts it, and removes the archive.

| Parameter | Type | Description |
| --- | --- | --- |
| `src` | `string` | The source 7z archive path. |
| `dest` | `string` | The destination directory path. |

#### system

##### `open_terminals`

Array of open terminals.

##### `system(args)`

Executes a system command and returns the output.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Command arguments. |

**Returns:** `string | boolean` The output of the command as a string, or false if an error occurred.

##### `exec(args)`

Executes a system command.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Command arguments. |

##### `spawn(args)`

Executes a system command.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Command arguments. |

##### `spawnTerminal(args, onData, onExit)`

Spawns a new PTY-backed terminal session and registers it locally.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `Array` | Arguments forwarded to PTY spawn (e.g. [file, argv, options]). |
| `onData` | `function` | Callback invoked on terminal output (string). |
| `onExit` | `function` | Callback invoked when the terminal exits. |

**Returns:** `PRDC_JSLAB_SYSTEM_TERMINAL` Terminal wrapper instance.

##### `getTaskList()`

Retrieves a list of all running tasks on the system.

**Returns:** `Array` An array containing the tasklist output or [false, []] if an error occurred.

##### `isProgramRunning(program_name)`

Checks if a specific program is running and retrieves its process IDs.

| Parameter | Type | Description |
| --- | --- | --- |
| `program_name` | `string` | The name of the program to check. |

**Returns:** `Array` An array where the first element is a boolean indicating if the program is running,
                 and the second element is an array of process IDs if the program is running.

##### `killProcess(pid)`

Attempts to kill a process by its process ID.

| Parameter | Type | Description |
| --- | --- | --- |
| `pid` | `number` | The process ID of the process to kill. |

**Returns:** `string | boolean` The output of the kill command as a string, or false if an error occurred.

#### geography

##### `webmap(args)`

Initializes and returns a new 2D web map instance.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Arguments for configuring the web map. |

**Returns:** `Promise.<PRDC_JSLAB_GEOGRAPHY_MAP>` The initialized 2D web map instance.

##### `geoglobe(args)`

Initializes and returns a new 3D geoglobe instance.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Arguments for configuring the 3D geoglobe. |

**Returns:** `Promise.<PRDC_JSLAB_GEOGRAPHY_MAP_3D>` The initialized 3D geoglobe instance.

##### `calculateTilesBoundingBox(tile_coordinates)`

Calculates the bounding box and center from an array of tile coordinates.

| Parameter | Type | Description |
| --- | --- | --- |
| `tile_coordinates` | `Array.<Object>` | An array of objects with tile coordinates, each having properties `x`, `y`, and `z` for tile X and Y coordinates and zoom level, respectively. |

**Returns:** `Object` An object containing the bounds as an array of `[min_lat, min_lng]` and `[max_lat, max_lng]`, and the center as `[latitude, longitude]`.

##### `offsetLatLonEastNorth(lat, lon, east, north)`

Calculates a new latitude and longitude based on east and north offsets.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat` | `number` | The latitude of the starting point. |
| `lon` | `number` | The longitude of the starting point. |
| `east` | `number` | The east offset in meters. |
| `north` | `number` | The north offset in meters. |

**Returns:** `Array.<number>` An array containing the latitude and longitude of the calculated point.

##### `offsetLatLon(lat, lon, distance, bearing)`

Calculates a new latitude and longitude based on a starting point, distance, and bearing using the Haversine formula.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat` | `number` | The latitude of the starting point. |
| `lon` | `number` | The longitude of the starting point. |
| `distance` | `number` | The distance from the starting point in meters. |
| `bearing` | `number` | The bearing in degrees from north. |

**Returns:** `Array.<number>` An array containing the latitude and longitude of the calculated point.

##### `latLonDistance(lat1, lon1, lat2, lon2)`

Calculates the distance between two points on Earth using the Haversine formula.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat1` | `number` | The latitude of the first point. |
| `lon1` | `number` | The longitude of the first point. |
| `lat2` | `number` | The latitude of the second point. |
| `lon2` | `number` | The longitude of the second point. |

**Returns:** `number` The distance between the two points in meters.

##### `latLonAltDistance(lat1, lon1, alt1, lat2, lon2, alt2)`

Calculates the distance between two points on Earth including altitude difference using the Haversine formula.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat1` | `number` | The latitude of the first point. |
| `lon1` | `number` | The longitude of the first point. |
| `alt1` | `number` | The altitude of the first point in meters. |
| `lat2` | `number` | The latitude of the second point. |
| `lon2` | `number` | The longitude of the second point. |
| `alt2` | `number` | The altitude of the second point in meters. |

**Returns:** `number` The 3D distance between the two points in meters.

##### `checkNewLatLon(latlon)`

Checks if the latitude and longitude values have been updated.

| Parameter | Type | Description |
| --- | --- | --- |
| `latlon` | `Object` | An object containing the current and last values of latitude and longitude. |

**Returns:** `boolean` True if the latitude and/or longitude values have been updated; false otherwise.

##### `latLonAlt2cartesian(lat, lon, alt)`

Converts latitude, longitude, and altitude to Cartesian coordinates.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat` | `number \| Array.<number>` | Latitude in degrees or array of latitudes. |
| `lon` | `number \| Array.<number>` | Longitude in degrees or array of longitudes. |
| `alt` | `number \| Array.<number>` | Altitude in meters or array of altitudes. |

**Returns:** `Cesium.Cartesian3 | Array.<Cesium.Cartesian3>` Cartesian coordinate(s).

##### `latLonAltTransform(lat, lon, alt, dx, dy, dz)`

Transforms a local offset (dx, dy, dz) relative to a specified latitude, longitude, and altitude to a new latitude, longitude, and altitude.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat` | `number` | Latitude in degrees. |
| `lon` | `number` | Longitude in degrees. |
| `alt` | `number` | Altitude in meters. |
| `dx` | `number` | Local x offset in meters. |
| `dy` | `number` | Local y offset in meters. |
| `dz` | `number` | Local z offset in meters. |

**Returns:** `Object` Object containing the transformed latitude, longitude, and altitude.

##### `eastNorthUpTransform(position, dx, dy, dz)`

Transforms a local offset (dx, dy, dz) relative to a specified East, North, Up position to a new latitude, longitude, and altitude.

| Parameter | Type | Description |
| --- | --- | --- |
| `position` | `Cesium.Cartesian3` | East, North, Up position. |
| `dx` | `number` | Local x offset in meters. |
| `dy` | `number` | Local y offset in meters. |
| `dz` | `number` | Local z offset in meters. |

**Returns:** `Object` Object containing the transformed latitude, longitude, and altitude.

##### `computeHeadingPitchFromTo(from_cartesian, to_cartesian)`

Calculates the heading (yaw) and pitch angles from a starting Cartesian point to a target Cartesian point.
The angles are calculated in the local East-North-Up (ENU) frame of the starting point.

| Parameter | Type | Description |
| --- | --- | --- |
| `from_cartesian` | `Cesium.Cartesian3` | The Cartesian coordinates of the starting point. |
| `to_cartesian` | `Cesium.Cartesian3` | The Cartesian coordinates of the target point. |

**Returns:** `Object` An object containing the calculated heading (in radians from North, positive East) and pitch (in radians from the local horizontal, positive Up).

##### `mslToEllipsoidAlt(lat_deg, lon_deg, h_msl_meters)`

Converts altitude from Mean Sea Level (MSL) height to Ellipsoid height using the EGM96 geoid model.
The conversion can handle single values or arrays of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat_deg` | `number \| Array.<number>` | Latitude(s) in degrees. |
| `lon_deg` | `number \| Array.<number>` | Longitude(s) in degrees. |
| `h_msl_meters` | `number \| Array.<number>` | Altitude(s) in meters above MSL. |

**Returns:** `number | Array.<number>` Ellipsoid altitude(s) in meters.

##### `ellipsoidToMslAlt(lat_deg, lon_deg, h_ellipsoid_meters)`

Converts altitude from Ellipsoid height to Mean Sea Level (MSL) height using the EGM96 geoid model.
The conversion can handle single values or arrays of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat_deg` | `number \| Array.<number>` | Latitude(s) in degrees. |
| `lon_deg` | `number \| Array.<number>` | Longitude(s) in degrees. |
| `h_ellipsoid_meters` | `number \| Array.<number>` | Altitude(s) in meters above the Ellipsoid. |

**Returns:** `number | Array.<number>` MSL altitude(s) in meters.

##### `positionToEllipsoid(lat_deg, lon_deg, h_msl_meters)`

Converts a position (latitude, longitude, and MSL altitude) into a Cesium Cartesian3 coordinate using Ellipsoid height.
The MSL altitude is first converted to Ellipsoid altitude using the EGM96 geoid model.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat_deg` | `number \| Array.<number>` | Latitude(s) in degrees. |
| `lon_deg` | `number \| Array.<number>` | Longitude(s) in degrees. |
| `h_msl_meters` | `number \| Array.<number>` | Altitude(s) in meters above MSL. |

**Returns:** `Cesium.Cartesian3 | Array.<Cesium.Cartesian3>` Cartesian coordinate(s) in the WGS84 system.

#### networking

##### `CRC_TABLE_XMODEM`

XMODEM CRC table

##### `isOnline()`

Checks if the environment is currently online.

**Returns:** `boolean` `true` if online, otherwise `false`.

##### `crc16xmodem(byte_array)`

Calculates the CRC-16/XMODEM checksum of a byte array.

| Parameter | Type | Description |
| --- | --- | --- |
| `byte_array` | `Uint8Array` | The input data as a byte array. |

**Returns:** `number` The CRC-16/XMODEM checksum as a numeric value.

##### `getIP()`

Retrieves the primary IPv4 address of the current machine.

**Returns:** `string` The IP address if found, otherwise an empty string.

##### `pingAddressTCP(host, port, [timeout])`

Attempts to establish a TCP connection to the specified host and port to check reachability.

| Parameter | Type | Description |
| --- | --- | --- |
| `host` | `string` | The IP address or hostname to ping. |
| `port` | `number` | The port number to use for the connection. |
| `timeout` | `number` | The timeout in milliseconds before the attempt is considered failed. Optional. Default: `1000`. |

**Returns:** `Promise.<boolean>` A promise that resolves to `true` if the connection is successful, `false` otherwise.

##### `pingAddress(host, timeout)`

Executes a ping command to check if an IP address is reachable.

| Parameter | Type | Description |
| --- | --- | --- |
| `host` | `string` | The IP address or hostname to ping. |
| `timeout` | `number` | The timeout in milliseconds for the ping command. |

##### `pingAddressSync(host, timeout)`

Executes a ping command synchronized to check if an IP address is reachable.

| Parameter | Type | Description |
| --- | --- | --- |
| `host` | `string` | The IP address or hostname to ping. |
| `timeout` | `number` | The timeout in milliseconds for the ping command. |

##### `findFirstUnusedPort(port, min_port, max_port)`

Finds the first unused port within a specified range, checking sequentially from `port` to `max_port`.

| Parameter | Type | Description |
| --- | --- | --- |
| `port` | `number` | The starting port number to check. |
| `min_port` | `number` | The minimum port number in the range. |
| `max_port` | `number` | The maximum port number in the range. |

##### `ip2dec(ip, [subnets])`

Converts an IPv4 address to its decimal equivalent.

| Parameter | Type | Description |
| --- | --- | --- |
| `ip` | `string` | The IPv4 address in dot-decimal notation. |
| `subnets` | `number` | The number of subnets in the IP address, default is 4. Optional. Default: `4`. |

**Returns:** `number` The decimal equivalent of the IPv4 address.

##### `tcp(host, port, onConnectCallback)`

Creates a TCP client for communication with a specified host and port.

| Parameter | Type | Description |
| --- | --- | --- |
| `host` | `string` | The hostname or IP address to connect to. |
| `port` | `number` | The port number on the host to connect to. |
| `onConnectCallback` | `function` | A callback function that is called when the connection is successfully established. |

**Returns:** `PRDC_JSLAB_TCP_CLIENT` An instance of the TCP client with event handlers set up.

##### `tcpServer(host, port, onConnectCallback)`

Creates a TCP server to listen on a specified port.

| Parameter | Type | Description |
| --- | --- | --- |
| `host` | `string` | The hostname or IP address. |
| `port` | `number` | The port number. |
| `onConnectCallback` | `function` | A callback function that is called when the connection is successfully established. |

**Returns:** `PRDC_JSLAB_TCP_SERVER` An instance of the TCP server.

##### `udp(host, port)`

Creates a UDP client for sending data to a specified host and port.

| Parameter | Type | Description |
| --- | --- | --- |
| `host` | `string` | The hostname or IP address to connect to. |
| `port` | `number` | The port number to connect to. |

**Returns:** `PRDC_JSLAB_UDP` An instance of the UDP client.

##### `udpServer(port)`

Creates a UDP server to listen on a specified port.

| Parameter | Type | Description |
| --- | --- | --- |
| `port` | `number` | The port number to listen on. |

**Returns:** `PRDC_JSLAB_UDP_SERVER` An instance of the UDP server.

##### `videoCall(type, video_source_type, video_id, mic_id, tcp_host, tcp_port, opts)`

Initializes and returns a new video call instance.

| Parameter | Type | Description |
| --- | --- | --- |
| `type` | `string` | The call type ('server' or 'client'). |
| `video_source_type` | `string` | The video source type ('webcam' or 'desktop'). |
| `video_id` | `string` | The video device or source ID. |
| `mic_id` | `string` | The microphone device ID. |
| `tcp_host` | `string` | The TCP host address. |
| `tcp_port` | `number` | The TCP port number. |
| `opts` | `object` | Additional configuration options. |

**Returns:** `PRDC_JSLAB_VIDEOCALL` The created video call object.

#### format

##### `getContentType(filePath)`

Retrieves the MIME type based on the file extension.

| Parameter | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path to the file. |

**Returns:** `string` The corresponding MIME type.

##### `formatBytes(bytes, [decimals])`

Formats the given byte count into a readable string.

| Parameter | Type | Description |
| --- | --- | --- |
| `bytes` | `Number` | Number of bytes. |
| `decimals` | `Number` | Number of decimal places to include in the formatted string. Optional. Default: `2`. |

**Returns:** `String` Formatted bytes string with appropriate unit.

##### `formatBPS(bps, [decimals])`

Formats the given bits per second (bps) into a readable string.

| Parameter | Type | Description |
| --- | --- | --- |
| `bps` | `Number` | Number of bits per second. |
| `decimals` | `Number` | Number of decimal places to include in the formatted string. Optional. Default: `2`. |

**Returns:** `String` Formatted bits per second string with appropriate unit.

##### `formatPrefix(number, [decimals])`

Formats a number with metric prefixes (k, M, G, etc.) based on its value.

| Parameter | Type | Description |
| --- | --- | --- |
| `number` | `Number` | The number to format. |
| `decimals` | `Number` | Number of decimal places to include in the formatted string. Optional. Default: `2`. |

**Returns:** `String` Formatted number string with metric prefix.

##### `formatNum(number, [decimals])`

Formats a number to a specified number of decimal places.

| Parameter | Type | Description |
| --- | --- | --- |
| `number` | `Number` | The number to format. |
| `decimals` | `Number` | The number of decimal places. Optional. Default: `2`. |

**Returns:** `String` The formatted number as a string.

##### `formatFloatDigits(number, [digits])`

Formats a floating-point number to a fixed number of significant digits,
automatically adjusting decimal places depending on the integer part length.

| Parameter | Type | Description |
| --- | --- | --- |
| `number` | `number` | The number to format. |
| `digits` | `number` | The number of significant digits to produce. Optional. Default: `1`. |

**Returns:** `string` A string containing the formatted number.

##### `clip(number, control_number, clip_value, [direction])`

Clips a number to a specified value based on a condition.

| Parameter | Type | Description |
| --- | --- | --- |
| `number` | `number` | The number to clip. |
| `control_number` | `number` | The reference number for the clipping condition. |
| `clip_value` | `number` | The value to clip to. |
| `direction` | `boolean` | The direction of clipping (true for max, false for min). Optional. Default: `true`. |

**Returns:** `number` The clipped number.

##### `clipHeight(value, [min], [max])`

Clips a height value to a specified range.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` | The value to clip. |
| `min` | `number` | The minimum value of the range. Optional. Default: `0`. |
| `max` | `number` | The maximum value of the range. Optional. Default: `100`. |

**Returns:** `number` The clipped height value.

##### `fieldnames(obj)`

Retrieves the field names (keys) of the given object.

| Parameter | Type | Description |
| --- | --- | --- |
| `obj` | `Object` | The object from which to extract keys. |

**Returns:** `Array.<string>` An array containing the keys of the object.

##### `strrep(str, old_string, new_string)`

Replaces all occurrences of a specified substring within a string.

| Parameter | Type | Description |
| --- | --- | --- |
| `str` | `string` | The original string. |
| `old_string` | `string` | The substring to be replaced. |
| `new_string` | `string` | The substring to replace with. |

**Returns:** `string` The resulting string after replacements.

##### `clipVal(value, [min], [max])`

Clips a value to a specified range.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` | The value to clip. |
| `min` | `number` | The minimum value of the range. Optional. Default: `0`. |
| `max` | `number` | The maximum value of the range. Optional. Default: `100`. |

**Returns:** `number` The clipped value.

##### `toFixedIf(value, p)`

Rounds a number to a fixed number of decimal places, but only if it's a floating point number.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `Number` | The value to round. |
| `p` | `Number` | The number of decimal places to round to. |

**Returns:** `Number` The rounded number, or the original number if it wasn't a float.

##### `getCircularReplacer()`

Provides a replacer function for JSON.stringify() to prevent circular references.

**Returns:** `function` A replacer function that can be used with JSON.stringify to handle circular references.

##### `isNaN(value)`

Determines if the provided value is NaN.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is NaN, false otherwise.

##### `isObject(value, [ignore_array])`

Determines if the provided value is an object.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |
| `ignore_array` | `boolean` | Whether to consider arrays as not objects. Optional. Default: `false`. |

**Returns:** `boolean` True if the value is an object, false otherwise.

##### `isPlainObject(value)`

Determines if the provided value is a plain object.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is a plain object, false otherwise.

##### `isTypedArray(value)`

Determines if the provided value is a typed array.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is a typed array, false otherwise.

##### `isColumnLike(value)`

Determines if the provided value is array-like for column-style input.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is an array or typed array.

##### `ensureUniqueNames(names, [error_factory])`

Ensures that name list contains unique values.
Throws when a duplicate name is found.

| Parameter | Type | Description |
| --- | --- | --- |
| `names` | `Array.<string>` | Name list. |
| `error_factory` | `function` | Optional function that returns an Error for a duplicate name. Optional. |

**Returns:** `boolean` True when all names are unique.

##### `compareMixedValues(a, b)`

Compares mixed values for stable sorting.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `*` | First value. |
| `b` | `*` | Second value. |

**Returns:** `number` Comparison result.

##### `buildSortedIndices(length, getter, [direction])`

Builds stable sorted index order.

| Parameter | Type | Description |
| --- | --- | --- |
| `length` | `number` | Number of rows/items. |
| `getter` | `function` | Getter by index. |
| `direction` | `string` | Sort direction. Optional. Default: `'asc'`. |

**Returns:** `Array.<number>` Sorted indices.

##### `rangeIndices(n)`

Creates [0, ..., n - 1].

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number` | Length. |

**Returns:** `Array.<number>` Range indices.

##### `isMissingValue(value)`

Checks if value should be treated as missing.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | Candidate value. |

**Returns:** `boolean` True when value is missing.

##### `valueTypeLabel(value)`

Resolves type label for table-like display.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | Candidate value. |

**Returns:** `string` Type label.

##### `csvEscapeCell(value, [delimiter])`

Escapes CSV cell text.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | Cell value. |
| `delimiter` | `string` | Delimiter. Optional. Default: `','`. |

**Returns:** `string` Escaped CSV token.

##### `parseCsvLine(line, [delimiter])`

Parses a CSV line with quoted fields support.

| Parameter | Type | Description |
| --- | --- | --- |
| `line` | `string` | Input line. |
| `delimiter` | `string` | Delimiter. Optional. Default: `','`. |

**Returns:** `Array.<string>` Parsed fields.

##### `parseCsvText(text, [delimiter])`

Parses CSV-like text into rows.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` | CSV text. |
| `delimiter` | `string` | Delimiter. Optional. Default: `','`. |

**Returns:** `Array.<Array.<string>>` Parsed rows.

##### `detectDelimiter(text, [fallback])`

Detects CSV delimiter from the first non-empty line.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` | Input text. |
| `fallback` | `string` | Fallback delimiter. Optional. Default: `','`. |

**Returns:** `string` Detected delimiter.

##### `parseCsvScalar(text, [options])`

Converts textual CSV token into a typed scalar.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` | Raw text. |
| `options` | `Object` | Parse options. Optional. Default: `{}`. |

**Returns:** `*` Parsed scalar value.

##### `aggregateValues(values, method)`

Aggregates values using the selected method.

| Parameter | Type | Description |
| --- | --- | --- |
| `values` | `Array` | Input values. |
| `method` | `string` | Aggregation method. |

**Returns:** `*` Aggregated result.

##### `isNumber(value)`

Determines if the provided value is a number.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is a number, false otherwise.

##### `isString(value)`

Determines if the provided value is a string.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is a string, false otherwise.

##### `isEmptyString(str)`

Checks if a string is empty or contains only whitespace.

| Parameter | Type | Description |
| --- | --- | --- |
| `str` | `string` | The string to check. |

**Returns:** `boolean` - True if the string is empty or contains only whitespace, otherwise false.

##### `isEmptyObject(obj)`

Checks if a object is empty.

| Parameter | Type | Description |
| --- | --- | --- |
| `obj` | `string` | The object to check. |

**Returns:** `boolean` - True if the object is empty, otherwise false.

##### `isFunction(value)`

Determines if the provided value is a function.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check |

**Returns:** `boolean` True if the value is a function, false otherwise.

##### `isArray(value)`

Determines if the provided value is an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is an array, false otherwise.

##### `isNull(value)`

Determines if the provided value is null.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is null, false otherwise.

##### `isEmpty(array)`

Checks if an array is empty.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array` | The array to check. |

**Returns:** `boolean` True if the array is empty, false otherwise.

##### `isInfinity(value)`

Checks if the given value(s) are infinite.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| Array.<number>` | The value or array of values to check. |

**Returns:** `boolean | Array.<boolean>` - Returns true if infinite, otherwise false. Returns an array of booleans if input is an array.

##### `isNumeric(variable)`

Checks if a variable is numeric.

| Parameter | Type | Description |
| --- | --- | --- |
| `variable` | `*` | The variable to check. |

**Returns:** `boolean` True if the variable is numeric, false otherwise.

##### `hasKey(object, key)`

Checks if the specified object has the given key.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `Object` | The object to check for the presence of the key. |
| `key` | `string` | The key to check for in the object. |

**Returns:** `boolean` - True if the object has the key, false otherwise.

##### `isUndefined(value)`

Determines if the provided value is undefined.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to check. |

**Returns:** `boolean` True if the value is undefined, false otherwise.

##### `isUUID(str)`

Checks if a string is a valid UUID.

| Parameter | Type | Description |
| --- | --- | --- |
| `str` | `string` | The string to check. |

**Returns:** `boolean` True if the string is a valid UUID, false otherwise.

##### `normalizeAngle(angle)`

Normalizes an angle to the range of -180 to 180 degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `angle` | `number` | The angle to normalize. |

**Returns:** `number` The normalized angle.

##### `normalizeAngle360(angle)`

Normalizes an angle to the range of 0 to 360 degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `angle` | `number` | The angle to normalize. |

**Returns:** `number` The normalized angle.

##### `normalizeLat(latitude, precision)`

Normalizes latitude to the range of -90 to 90 degrees with specified precision.

| Parameter | Type | Description |
| --- | --- | --- |
| `latitude` | `number` | The latitude to normalize. |
| `precision` | `number` | The precision of the normalization. |

**Returns:** `number` The normalized latitude.

##### `normalizeLon(longitude, precision)`

Normalizes longitude to the range of -180 to 180 degrees with specified precision.

| Parameter | Type | Description |
| --- | --- | --- |
| `longitude` | `number` | The longitude to normalize. |
| `precision` | `number` | The precision of the normalization. |

**Returns:** `number` The normalized longitude.

##### `checkUndefined(val)`

Checks a value for undefined and returns an empty string if it is undefined, otherwise returns the value.

| Parameter | Type | Description |
| --- | --- | --- |
| `val` | `*` | The value to check. |

**Returns:** `*` The original value if not undefined, otherwise an empty string.

##### `prettyPrint(data)`

Pretty-prints data, converting it into a more readable format for display. Handles strings, objects, and other data types.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `*` | The data to pretty-print. |

**Returns:** `Array` An array containing the pretty-printed data as a string and a boolean indicating if the data was an object.

##### `stringify(object)`

Converts an object to a JSON string if it is an object, otherwise returns the object as is.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `*` | The object to stringify. |

**Returns:** `string | *` The JSON string representation of the object or the object itself if not an object.

##### `safeStringify(data, [depth_limit])`

Safely serializes an object into a JSON string, handling circular references and deep structures, with depth control.
It also escapes strings to prevent HTML injection.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Object` | The object to stringify. |
| `depth_limit` | `number` | The maximum depth to traverse in the object, beyond which the traversal is stopped. Optional. Default: `3`. |

**Returns:** `string` A JSON string representation of the object, with special handling for deep objects, circular references, and HTML escaping of strings.

##### `escapeHTML(string)`

Escapes special HTML characters in a string to prevent HTML injection.

| Parameter | Type | Description |
| --- | --- | --- |
| `string` | `string` | The string to escape. |

**Returns:** `string` - The escaped string with HTML characters replaced.

##### `escapeHTMLAttr(value)`

Escapes text for use in HTML attributes.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to escape. |

**Returns:** `string` Escaped attribute-safe text.

##### `escapeLatex(string)`

Escapes special LaTeX characters in a string to prevent LaTeX injection.

| Parameter | Type | Description |
| --- | --- | --- |
| `string` | `string` | The string to escape. |

**Returns:** `string` - The escaped string with LaTeX characters replaced.

##### `getUniqueKey(object, key)`

Produces a unique key name inside an object. If `key` already exists,
numerical suffixes are appended until uniqueness is achieved.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `Object` | The object to test for key collisions. |
| `key` | `string` | The proposed key name. |

**Returns:** `string` A unique key string not present in the object.

##### `randomString(num)`

Generates a random string of the specified length.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The desired length of the random string. |

**Returns:** `string` A random string.

##### `countDecimalPlaces(num)`

Calculates the number of decimal places in a number.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `number` | The number to evaluate. |

**Returns:** `number` The count of decimal places.

##### `replaceEditorLinks(text)`

Replaces file links in a text with HTML span elements.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` | The multiline error log text. |

**Returns:** `string` The updated text with file links replaced by HTML spans.

##### `numberValidator(n)`

Checks that an input contains a finite number

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `HTMLInputElement` | Target input element. |

**Returns:** `boolean` True when the value is valid.

##### `limitedNumberValidator(n, [min], [max])`

Checks that an input contains a finite number
and—if supplied—is within the inclusive range [min, max].

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `HTMLInputElement` | Target input element. |
| `min` | `number` | Minimum allowed value (optional). Optional. |
| `max` | `number` | Maximum allowed value (optional). Optional. |

**Returns:** `boolean` True when the value is valid.

##### `bold(s)`

Wraps a string with an HTML <b> tag for bold formatting.

| Parameter | Type | Description |
| --- | --- | --- |
| `s` | `string` | The string to wrap. |

**Returns:** `string` The bold-formatted HTML string.

##### `italic(s)`

Wraps a string with an HTML <i> tag for italic formatting.

| Parameter | Type | Description |
| --- | --- | --- |
| `s` | `string` | The string to wrap. |

**Returns:** `string` The italic-formatted HTML string.

##### `underline(s)`

Wraps a string with an HTML <u> tag for underline formatting.

| Parameter | Type | Description |
| --- | --- | --- |
| `s` | `string` | The string to wrap. |

**Returns:** `string` The underline-formatted HTML string.

##### `strike(s)`

Wraps a string with an HTML <s> tag for strikethrough formatting.

| Parameter | Type | Description |
| --- | --- | --- |
| `s` | `string` | The string to wrap. |

**Returns:** `string` The strikethrough HTML string.

##### `sub(s)`

Wraps a string in an HTML <sub> element (subscript).

| Parameter | Type | Description |
| --- | --- | --- |
| `s` | `string` | The string to wrap. |

**Returns:** `string` The subscript HTML string.

##### `sup(s)`

Wraps a string in an HTML <sup> element (superscript).

| Parameter | Type | Description |
| --- | --- | --- |
| `s` | `string` | The string to wrap. |

**Returns:** `string` The superscript HTML string.

##### `tableprint(args)`

Prints a formatted plain-text table and optionally exports a LaTeX table.

Columns are Arrays/TypedArrays (all same length). Options can be passed as parameter/value
pairs or as a final options object.

Options: VariableNames, RowNames, Format, Save ("no"|"plain"|"tex"), File, rlines, clines,
align, float, caption, label, escapeTeX.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `Array \| TypedArray \| Object \| string` | Table columns followed by options. |

**Returns:** `Object` Result object with `plain` and `tex` strings.

#### table

##### `table(args)`

Creates a table from columns.
Usage examples:
table(colA, colB, { VariableNames: ['A', 'B'] })
table({ A: colA, B: colB })
table(colA, colB, 'VariableNames', ['A', 'B'])

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Columns and options. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `timetable(row_times, args)`

Creates a timetable from row times and columns.
Usage examples:
timetable(times, colA, colB, { VariableNames: ['A', 'B'] })
timetable(times, { A: colA, B: colB })

| Parameter | Type | Description |
| --- | --- | --- |
| `row_times` | `Array \| TypedArray` | Row times. |
| `args` | `*` | Columns and options. |

**Returns:** `PRDC_JSLAB_TIMETABLE`

##### `array2table(A, [options])`

Creates a table from a 2D array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | 2D row-major array. |
| `options` | `Object` | Table options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `struct2table(rows, [options])`

Creates a table from an array of objects.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows` | `Array.<Object>` | Array of row objects. |
| `options` | `Object` | Table options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `table2array(T)`

Converts a table/timetable into a 2D array.

| Parameter | Type | Description |
| --- | --- | --- |
| `T` | `PRDC_JSLAB_TABLE \| PRDC_JSLAB_TIMETABLE` | Table-like object. |

**Returns:** `Array.<Array>`

##### `istable(value)`

Checks whether value is a table.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | Candidate value. |

**Returns:** `boolean`

##### `istimetable(value)`

Checks whether value is a timetable.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | Candidate value. |

**Returns:** `boolean`

##### `readtable(file_path, [options])`

Reads a delimited text file into a table.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `string` | File path. |
| `options` | `Object` | Read options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `readtimetable(file_path, [options])`

Reads a delimited text file into a timetable.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `string` | File path. |
| `options` | `Object` | Read options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TIMETABLE`

##### `table2csv(T, [options])`

Serializes table/timetable into CSV text.

| Parameter | Type | Description |
| --- | --- | --- |
| `T` | `PRDC_JSLAB_TABLE \| PRDC_JSLAB_TIMETABLE` | Table-like value. |
| `options` | `Object` | CSV options. Optional. Default: `{}`. |

**Returns:** `string`

##### `writetable(T, file_path, [options])`

Writes table/timetable to CSV/TSV file.

| Parameter | Type | Description |
| --- | --- | --- |
| `T` | `PRDC_JSLAB_TABLE \| PRDC_JSLAB_TIMETABLE` | Table-like value. |
| `file_path` | `string` | Output file path. |
| `options` | `Object` | Write options. Optional. Default: `{}`. |

**Returns:** `boolean`

##### `retime(TT, step, [method], [options])`

Retime timetable using fixed bucket step.

| Parameter | Type | Description |
| --- | --- | --- |
| `TT` | `PRDC_JSLAB_TIMETABLE` | Input timetable. |
| `step` | `number \| string` | Bucket step. |
| `method` | `string` | Aggregation method. Optional. Default: `'mean'`. |
| `options` | `Object` | Additional options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TIMETABLE`

##### `join(left, right, [options])`

Alias for innerjoin.

| Parameter | Type | Description |
| --- | --- | --- |
| `left` | `PRDC_JSLAB_TABLE` | Left table. |
| `right` | `PRDC_JSLAB_TABLE` | Right table. |
| `options` | `Object` | Join options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `innerjoin(left, right, [options])`

Performs inner join.

| Parameter | Type | Description |
| --- | --- | --- |
| `left` | `PRDC_JSLAB_TABLE` | Left table. |
| `right` | `PRDC_JSLAB_TABLE` | Right table. |
| `options` | `Object` | Join options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `outerjoin(left, right, [options])`

Performs outer join.

| Parameter | Type | Description |
| --- | --- | --- |
| `left` | `PRDC_JSLAB_TABLE` | Left table. |
| `right` | `PRDC_JSLAB_TABLE` | Right table. |
| `options` | `Object` | Join options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `groupsummary(T, groupvars, [method], [datavars])`

Groups rows and computes aggregates.

| Parameter | Type | Description |
| --- | --- | --- |
| `T` | `PRDC_JSLAB_TABLE` | Input table. |
| `groupvars` | `Array \| string` | Grouping variables. |
| `method` | `Array \| string` | Aggregation method(s). Optional. Default: `'mean'`. |
| `datavars` | `Array \| string` | Variables to aggregate. Optional. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `varfun(fun, T, [options])`

Applies a function to selected table variables.

| Parameter | Type | Description |
| --- | --- | --- |
| `fun` | `function \| string` | Function or aggregator name. |
| `T` | `PRDC_JSLAB_TABLE` | Input table. |
| `options` | `Object` | Options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `ismissing(value)`

Missing-value mask for scalar/array/table.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | Input value. |

**Returns:** `*`

##### `fillmissing(value, [method], [fill_value])`

Fills missing values for scalar/array/table.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | Input value. |
| `method` | `string` | Fill method. Optional. Default: `'constant'`. |
| `fill_value` | `*` | Constant replacement value. Optional. Default: `null`. |

**Returns:** `*`

#### render

##### `debounceIn(func, wait)`

Debounces a function, ensuring it's only invoked once at the beginning of consecutive calls during the wait period.

| Parameter | Type | Description |
| --- | --- | --- |
| `func` | `function` | The function to debounce. |
| `wait` | `number` | The period to wait before allowing another call, in milliseconds. |

**Returns:** `function` The debounced function.

##### `debounceInOut(func, wait)`

Debounces a function, calling it at the first and last of consecutive calls during the wait period.

| Parameter | Type | Description |
| --- | --- | --- |
| `func` | `function` | The function to debounce. |
| `wait` | `number` | The period to wait before allowing another call, in milliseconds. |

**Returns:** `function` The debounced function.

##### `debounceOut(func, wait)`

Debounces a function, ensuring it's only invoked once at the end of consecutive calls during the wait period.

| Parameter | Type | Description |
| --- | --- | --- |
| `func` | `function` | The function to debounce. |
| `wait` | `number` | The period to wait before allowing another call, in milliseconds. |

**Returns:** `function` The debounced function.

#### geometry

##### `spaceSearch()`

Creates an instance of PRDC_JSLAB_GEOMETRY_SPACE_SEARCH.

##### `boundaryFollow2D()`

Creates an instance of PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D.

##### `boundaryFollow3D()`

Creates an instance of PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D.

##### `findNearestPoints(points1, points2)`

Finds the nearest points in points2 for each point in points1.

| Parameter | Type | Description |
| --- | --- | --- |
| `points1` | `Array.<Array>` | Array of points. |
| `points2` | `Array.<Array>` | Reference points. |

**Returns:** `Array.<number>` Array of indices for nearest points.

##### `minDisksDistance3D(O1, n1, r1, O2, n2, r2)`

Finds the minimum Euclidean distance between two filled disks in 3D.
Overlapping disks have zero distance. Normals need not have unit length.
Throws for invalid inputs or if the error bound cannot be met.

| Parameter | Type | Description |
| --- | --- | --- |
| `O1` | `Array.<number>` | First center. |
| `n1` | `Array.<number>` | First nonzero normal. |
| `r1` | `number` | First nonnegative radius. |
| `O2` | `Array.<number>` | Second center. |
| `n2` | `Array.<number>` | Second nonzero normal. |
| `r2` | `number` | Second nonnegative radius. |

**Returns:** `Object` Distance bounds and closest points.

##### `pointLineDistance(P, A, i)`

Returns the shortest distance from point P to the line defined by (A, i)
and the closest point (P1) on that line.

| Parameter | Type | Description |
| --- | --- | --- |
| `P` | `Array.<number>` | point [Px, Py, Pz] |
| `A` | `Array.<number>` | a point on the line |
| `i` | `Array.<number>` | a unit direction vector of the line |

**Returns:** `Object` d   - shortest distance
  P1  - point on the line with the smallest distance to P

##### `pointSegmentDistance(p, a, b)`

Computes the shortest distance from a point to a line segment in 2D.

The point and segment endpoints are expected as objects with numeric
properties {x, y}. The result is the Euclidean distance to the closest
point on the segment.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `Object` | Query point. |
| `a` | `Object` | Segment start point. |
| `b` | `Object` | Segment end point. |

**Returns:** `number` The minimal distance from p to the segment a-b.

##### `lineCircleIntersection(P, i, O, r)`

Returns the intersection points of a circle (center O, radius r)
in a plane with a line passing through point P with direction i.

| Parameter | Type | Description |
| --- | --- | --- |
| `P` | `Array.<number>` | point on the line |
| `i` | `Array.<number>` | direction vector of the line (unit) |
| `O` | `Array.<number>` | center of the circle |
| `r` | `number` | circle radius |

**Returns:** `Object` flag = 0 -> intersection (two points)
  flag = 1 -> tangent (one point)
  flag = 2 -> no intersection

##### `planesIntersection(P1, n1, P2, n2)`

Returns the line (point P, direction i) that is the intersection
of two planes, or indicates if they are the same or parallel.

| Parameter | Type | Description |
| --- | --- | --- |
| `P1` | `Array.<number>` | a point in plane 1 |
| `n1` | `Array.<number>` | normal to plane 1 |
| `P2` | `Array.<number>` | a point in plane 2 |
| `n2` | `Array.<number>` | normal to plane 2 |

**Returns:** `Object` flag = 0 -> planes intersect
  flag = 1 -> planes are the same
  flag = 2 -> planes are parallel (no intersection)

##### `isPointOnLine(P, A, B)`

Checks if point P lies on the line segment A-B.
Returns 1 if on segment, 0 otherwise.

| Parameter | Type | Description |
| --- | --- | --- |
| `P` | `Array.<number>` |  |
| `A` | `Array.<number>` |  |
| `B` | `Array.<number>` |  |

**Returns:** `number` 1 (on segment), 0 (not on segment)

##### `linesOverlap(P1, P2, P3, P4)`

Returns the overlapping segment (if any) between two segments P1-P2 and P3-P4,
or indicates no overlap.

| Parameter | Type | Description |
| --- | --- | --- |
| `P1` | `Array.<number>` |  |
| `P2` | `Array.<number>` |  |
| `P3` | `Array.<number>` |  |
| `P4` | `Array.<number>` |  |

**Returns:** `Object`

##### `minPointsDistance3D(P1i, P2i)`

Finds the minimal 3D distance between all pairs of points in two arrays.

| Parameter | Type | Description |
| --- | --- | --- |
| `P1i` | `Array.<Array.<number>>` | Array of 3D points (e.g. [[x1, y1, z1], [x2, y2, z2], ...]). |
| `P2i` | `Array.<Array.<number>>` | Another array of 3D points. |

**Returns:** `Object` L  - The minimal distance found.
  P1 - The point in P1i corresponding to the minimal distance.
  P2 - The point in P2i corresponding to the minimal distance.

##### `triangle(p1, p2, p3)`

Creates a new triangle instance.

| Parameter | Type | Description |
| --- | --- | --- |
| `p1` | `Array` | First vertex. |
| `p2` | `Array` | Second vertex. |
| `p3` | `Array` | Third vertex. |

**Returns:** `PRDC_JSLAB_TRIANGLE` Triangle instance.

##### `delaunayTriangulation(points)`

Performs Delaunay triangulation on a set of points.

| Parameter | Type | Description |
| --- | --- | --- |
| `points` | `Array.<Array>` | Array of points. |

**Returns:** `Array.<PRDC_JSLAB_TRIANGLE>` Array of triangles.

##### `getRotationMatrix(a, b)`

Generates a rotation matrix to rotate from vector a to vector b.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array.<number>` | The initial unit vector. |
| `b` | `Array.<number>` | The target unit vector. |

**Returns:** `Array.<Array.<number>>` - The resulting rotation matrix.

##### `transform(coordinates, scale_factor, rotation_matrix, translation)`

Transforms coordinates by scaling, rotating, and translating them.

| Parameter | Type | Description |
| --- | --- | --- |
| `coordinates` | `Array.<Array.<number>>` | Array of coordinate points. |
| `scale_factor` | `number` | Factor by which to scale the coordinates. |
| `rotation_matrix` | `Array.<Array.<number>>` | Matrix used to rotate the coordinates. |
| `translation` | `Array.<number>` | Vector used to translate the coordinates. |

**Returns:** `Array.<Array.<number>>` - The transformed coordinates.

##### `createVectors3D(xi, yi, zi, ui, vi, wi, scale, angle_factor, opts)`

Creates 3D vectors for plotting based on provided parameters.

| Parameter | Type | Description |
| --- | --- | --- |
| `xi` | `Array.<number>` | X coordinates of vector origins. |
| `yi` | `Array.<number>` | Y coordinates of vector origins. |
| `zi` | `Array.<number>` | Z coordinates of vector origins. |
| `ui` | `Array.<number>` | X components of vectors. |
| `vi` | `Array.<number>` | Y components of vectors. |
| `wi` | `Array.<number>` | Z components of vectors. |
| `scale` | `number` | Scale factor for the vectors. Default: `0.3`. |
| `angle_factor` | `number` | Angle factor for arrowheads. Default: `0.4`. |
| `opts` | `Object` | Additional plotting options. |

**Returns:** `Object` - An object containing line and head trace data for plotting.

##### `createDisks3D(xi, yi, zi, ri, ui, vi, wi, opts)`

Creates 3D disks for plotting based on provided parameters.

| Parameter | Type | Description |
| --- | --- | --- |
| `xi` | `Array.<number>` | X coordinates of disk centers. |
| `yi` | `Array.<number>` | Y coordinates of disk centers. |
| `zi` | `Array.<number>` | Z coordinates of disk centers. |
| `ri` | `Array.<number>` | Radii of the disks. |
| `ui` | `Array.<number>` | X components of normal vectors (for disk orientation). |
| `vi` | `Array.<number>` | Y components of normal vectors (for disk orientation). |
| `wi` | `Array.<number>` | Z components of normal vectors (for disk orientation). |
| `opts` | `Object` | Additional plotting options. |

**Returns:** `Object` - An object containing line and area trace data for plotting.

##### `createPlanes3D(xi, yi, zi, width_i, height_i, ui, vi, wi, opts)`

Creates a rectangular planes in 3D space, oriented by a normal vector [u, v, w].

| Parameter | Type | Description |
| --- | --- | --- |
| `xi` | `Array.<number>` | X coordinates of planes centers. |
| `yi` | `Array.<number>` | Y coordinates of planes centers. |
| `zi` | `Array.<number>` | Z coordinates of planes centers. |
| `width_i` | `Array.<number>` | Width of the rectangle. |
| `height_i` | `Array.<number>` | Height of the rectangle. |
| `ui` | `Array.<number>` | X component of the plane's normal vector. |
| `vi` | `Array.<number>` | Y component of the plane's normal vector. |
| `wi` | `Array.<number>` | Z component of the plane's normal vector. |
| `opts` | `Object` | Additional plotting options (color, opacity, etc.). |

**Returns:** `Object` - An object containing line and area trace data for plotting.

##### `createLines3D(x1i, y1i, z1i, x2i, y2i, z2i)`

Creates a lines in 3D space.

| Parameter | Type | Description |
| --- | --- | --- |
| `x1i` | `Array.<number>` | X1 coordinates of lines. |
| `y1i` | `Array.<number>` | Y1 coordinates of lines. |
| `z1i` | `Array.<number>` | Z1 coordinates of lines. |
| `x2i` | `Array.<number>` | X2 coordinates of lines. |
| `y2i` | `Array.<number>` | Y2 coordinates of lines. |
| `z2i` | `Array.<number>` | Z2 coordinates of lines. |

**Returns:** `Object` - lines object.

##### `createPoints3D(xi, yi, zi)`

Creates a points in 3D space.

| Parameter | Type | Description |
| --- | --- | --- |
| `xi` | `Array.<number>` | X coordinates of points. |
| `yi` | `Array.<number>` | Y coordinates of points. |
| `zi` | `Array.<number>` | Z coordinates of points. |

**Returns:** `Object` - points object.

##### `createText3D(xi, yi, zi)`

Creates a points in 3D space.

| Parameter | Type | Description |
| --- | --- | --- |
| `xi` | `Array.<number>` | X coordinates of points. |
| `yi` | `Array.<number>` | Y coordinates of points. |
| `zi` | `Array.<number>` | Z coordinates of points. |

**Returns:** `Object` - points object.

##### `symRectangle(W, H, [Z])`

Creates a symmetrical rectangle in 3D space.

| Parameter | Type | Description |
| --- | --- | --- |
| `W` | `number` | Width of the rectangle. |
| `H` | `number` | Height of the rectangle. |
| `Z` | `number` | Z-coordinate for the rectangle plane. Optional. Default: `0`. |

**Returns:** `Array.<number>` - Array of vertex coordinates for the rectangle.

##### `circle(radius, segments)`

Helper method to generate points for a circle in the XY plane.

| Parameter | Type | Description |
| --- | --- | --- |
| `radius` | `number` | Radius of the circle. |
| `segments` | `number` | Number of segments for the circle. |

**Returns:** `Array.<Array.<number>>` - Array of points forming the circle.

##### `disk(radius, segments_a, segments_r)`

Helper method to generate points for a disk in the XY plane.

| Parameter | Type | Description |
| --- | --- | --- |
| `radius` | `number` | Radius of the disk. |
| `segments_a` | `number` | Number of angular segments for the disk. |
| `segments_r` | `number` | Number of radial segments for the disk. |

**Returns:** `Array.<Array.<number>>` - Array of points forming the disk.

##### `boundary3D(points, [shrink])`

Generates the boundary of a 3D shape based on points and a shrink factor.

| Parameter | Type | Description |
| --- | --- | --- |
| `points` | `Array.<Array.<number>>` | Array of points defining the shape. |
| `shrink` | `number` | Factor by which to shrink the boundary. Optional. Default: `0.5`. |

**Returns:** `Array` - An array containing boundary facets and the volume.

##### `writeOff(filename, vertices, faces)`

Writes geometry data to an OFF file.

| Parameter | Type | Description |
| --- | --- | --- |
| `filename` | `string` | The path to the OFF file. |
| `vertices` | `Array.<Array.<number>>` | Array of vertex coordinates. |
| `faces` | `Array.<Array.<number>>` | Array of face indices. |

##### `readOff(filename)`

Reads an OFF file and returns the vertices and faces.

| Parameter | Type | Description |
| --- | --- | --- |
| `filename` | `string` | The path to the OFF file. |

**Returns:** `Object` - An object containing vertices and faces arrays.

#### control

##### `tf(num, den, [Ts])`

Create a transfer function representation.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `Array.<number>` | Numerator coefficients of the transfer function. |
| `den` | `Array.<number>` | Denominator coefficients of the transfer function. |
| `Ts` | `number` | Sampling time, defaults to 0 for continuous-time systems. Optional. Default: `0`. |

**Returns:** `object` An object representing the transfer function { num, den, Ts }.

##### `ss(A, B, C, D, [Ts])`

Create a state-space representation.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array.<Array.<number>>` | System matrix. |
| `B` | `Array.<Array.<number>>` | Input matrix. |
| `C` | `Array.<Array.<number>>` | Output matrix. |
| `D` | `Array.<Array.<number>>` | Feedthrough matrix. |
| `Ts` | `number` | Sampling time, defaults to 0 for continuous-time systems. Optional. Default: `0`. |

**Returns:** `object` An object representing the state-space system { A, B, C, D, Ts }.

##### `tf2ss(num, den)`

Convert a transfer function to a state-space representation.

| Parameter | Type | Description |
| --- | --- | --- |
| `num` | `Array.<number>` | Numerator coefficients of the transfer function. |
| `den` | `Array.<number>` | Denominator coefficients of the transfer function. |

**Returns:** `object` State-space representation of the system.

##### `ss2tf(sys)`

Convert a state-space representation to a transfer function.

| Parameter | Type | Description |
| --- | --- | --- |
| `sys` | `object` | State-space system { A, B, C, D }. |

**Returns:** `object` Transfer function representation { num, den }.

##### `c2d(numc, denc, Ts)`

Convert a continuous-time transfer function to discrete-time.

| Parameter | Type | Description |
| --- | --- | --- |
| `numc` | `Array.<number>` | Continuous-time numerator coefficients. |
| `denc` | `Array.<number>` | Continuous-time denominator coefficients. |
| `Ts` | `number` | Sampling time. |

**Returns:** `object` Discrete-time transfer function representation { num, den }.

##### `lsim(sys, u, t)`

Simulate the time response of a discrete-time linear system.

| Parameter | Type | Description |
| --- | --- | --- |
| `sys` | `Array.<number>` | transfer function of system. |
| `u` | `Array.<number>` | Input signal array. |
| `t` | `Array.<number>` | Time vector array. |

**Returns:** `object` An object containing the response:
                  - y: Output signal array.
                  - t: Time vector array (same as input).

##### `step(sys, Tfinal)`

Simulates the system response over a specified time period.

| Parameter | Type | Description |
| --- | --- | --- |
| `sys` | `Object` | The system to simulate. |
| `Tfinal` | `number` | The final time for the simulation. |

**Returns:** `Object` The simulation result.

##### `tfest(t, u, y, np, nz, [method])`

Estimates a transfer function model using numerical optimization.

| Parameter | Type | Description |
| --- | --- | --- |
| `t` | `Array.<number>` | Time vector. |
| `u` | `Array.<number>` | Input signal vector. |
| `y` | `Array.<number>` | Output signal vector. |
| `np` | `number` | Number of poles. |
| `nz` | `number` | Number of zeros. |
| `method` | `string` | Optimization method ('NelderMead' or 'Powell'). Optional. Default: `'NelderMead'`. |

**Returns:** `Object` Estimated transfer function and mean squared error.

#### optim

##### `optimPowell(fnc, x0, [options])`

Minimizes an unconstrained function using a coordinate descent-like Powell algorithm.

| Parameter | Type | Description |
| --- | --- | --- |
| `fnc` | `function` | Function to be minimized. Accepts an array of size N and returns a scalar. |
| `x0` | `Array` | Initial guess for the parameters as an array of size N. |
| `options` | `Object` | Optional parameters:
  - eps: Convergence threshold (default: 1e-6)
  - alpha: Initial step size scaling factor (default: 0.001)
  - stepSize: Finite difference step size for gradient estimation (default: 1e-6)
  - maxIterations: Maximum number of iterations to prevent infinite loops (default: 1000) Optional. |

**Returns:** `Object` An object with two fields:
  - argument: The parameter array that minimizes the function.
  - fncvalue: The function value at the minimized parameters.

##### `optimNelderMead(f, x0, [parameters], [parameters.maxIterations], [parameters.nonZeroDelta], [parameters.zeroDelta], [parameters.minErrorDelta], [parameters.minTolerance], [parameters.rho], [parameters.chi], [parameters.psi], [parameters.sigma], [parameters.history])`

Performs optimization using the Nelder-Mead algorithm.

| Parameter | Type | Description |
| --- | --- | --- |
| `f` | `function` | The objective function to minimize. It should accept an array of numbers and return a scalar value. |
| `x0` | `Array.<number>` | An initial guess for the parameters as an array of numbers. |
| `parameters` | `Object` | Optional parameters to control the optimization process. Optional. |
| `parameters.maxIterations` | `number` | Maximum number of iterations to perform. Optional. Default: `x0.length * 200`. |
| `parameters.nonZeroDelta` | `number` | Scaling factor for non-zero initial steps in the simplex. Optional. Default: `1.05`. |
| `parameters.zeroDelta` | `number` | Initial step size for parameters that are initially zero. Optional. Default: `0.001`. |
| `parameters.minErrorDelta` | `number` | Minimum change in function value to continue iterations. Optional. Default: `1e-6`. |
| `parameters.minTolerance` | `number` | Minimum change in parameters to continue iterations. Optional. Default: `1e-5`. |
| `parameters.rho` | `number` | Reflection coefficient. Optional. Default: `1`. |
| `parameters.chi` | `number` | Expansion coefficient. Optional. Default: `2`. |
| `parameters.psi` | `number` | Contraction coefficient. Optional. Default: `-0.5`. |
| `parameters.sigma` | `number` | Reduction coefficient. Optional. Default: `0.5`. |
| `parameters.history` | `Array.<Object>` | Optional array to store the history of simplex states for analysis. Optional. |

**Returns:** `Object` An object containing:
  - `fx`: The minimum function value found.
  - `x`: The parameters corresponding to the minimum function value.

##### `optimConjugateGradient(f, initial, [params], [params.maxIterations], [params.history])`

Performs optimization using the Conjugate Gradient method.

| Parameter | Type | Description |
| --- | --- | --- |
| `f` | `function` | The objective function to minimize. It should accept an array of numbers and return a scalar value and its gradient. |
| `initial` | `Array.<number>` | An initial guess for the parameters as an array of numbers. |
| `params` | `Object` | Optional parameters to control the optimization process. Optional. |
| `params.maxIterations` | `number` | Maximum number of iterations to perform. Optional. Default: `initial.length * 20`. |
| `params.history` | `Array.<Object>` | Optional array to store the history of optimization steps for analysis. Optional. |

**Returns:** `Object` An object containing:
  - `fx`: The minimum function value found.
  - `x`: The parameters corresponding to the minimum function value.
  - `fxprime`: The gradient of the function at the minimum.

##### `optimGradientDescent(f, initial, [params], [params.maxIterations], [params.learnRate], [params.history])`

Performs optimization using the Gradient Descent method.

| Parameter | Type | Description |
| --- | --- | --- |
| `f` | `function` | The objective function to minimize. It should accept an array of numbers and return a scalar value and its gradient. |
| `initial` | `Array.<number>` | An initial guess for the parameters as an array of numbers. |
| `params` | `Object` | Optional parameters to control the optimization process. Optional. |
| `params.maxIterations` | `number` | Maximum number of iterations to perform. Optional. Default: `initial.length * 100`. |
| `params.learnRate` | `number` | Learning rate or step size for each iteration. Optional. Default: `0.001`. |
| `params.history` | `Array.<Object>` | Optional array to store the history of optimization steps for analysis. Optional. |

**Returns:** `Object` An object containing:
  - `fx`: The minimum function value found.
  - `x`: The parameters corresponding to the minimum function value.
  - `fxprime`: The gradient of the function at the minimum.

##### `optimGradientDescentLineSearch(f, initial, [params], [params.maxIterations], [params.learnRate], [params.c1], [params.c2], [params.history])`

Performs optimization using the Gradient Descent method with Wolfe Line Search.

| Parameter | Type | Description |
| --- | --- | --- |
| `f` | `function` | The objective function to minimize. It should accept an array of numbers and return a scalar value and its gradient. |
| `initial` | `Array.<number>` | An initial guess for the parameters as an array of numbers. |
| `params` | `Object` | Optional parameters to control the optimization process. Optional. |
| `params.maxIterations` | `number` | Maximum number of iterations to perform. Optional. Default: `initial.length * 100`. |
| `params.learnRate` | `number` | Initial learning rate or step size for the line search. Optional. Default: `1`. |
| `params.c1` | `number` | Parameter for the Armijo condition in Wolfe Line Search. Optional. Default: `1e-3`. |
| `params.c2` | `number` | Parameter for the curvature condition in Wolfe Line Search. Optional. Default: `0.1`. |
| `params.history` | `Array.<Object>` | Optional array to store the history of optimization steps for analysis, including line search details. Optional. |

**Returns:** `Object` An object containing:
  - `fx`: The minimum function value found.
  - `x`: The parameters corresponding to the minimum function value.
  - `fxprime`: The gradient of the function at the minimum.

##### `optimBisect(f, a, b, [parameters], [parameters.maxIterations], [parameters.tolerance])`

Performs root finding using the Bisection method.

| Parameter | Type | Description |
| --- | --- | --- |
| `f` | `function` | The function for which to find a root. It should accept a number and return a number. |
| `a` | `number` | The start of the interval. Must satisfy f(a) and f(b) have opposite signs. |
| `b` | `number` | The end of the interval. Must satisfy f(a) and f(b) have opposite signs. |
| `parameters` | `Object` | Optional parameters to control the root-finding process. Optional. |
| `parameters.maxIterations` | `number` | Maximum number of iterations to perform. Optional. Default: `100`. |
| `parameters.tolerance` | `number` | Tolerance for convergence. The method stops when the interval width is below this value. Optional. Default: `1e-10`. |

**Returns:** `number` The root found within the interval [a, b].

##### `fminsearch(f, x0, [parameters], [parameters.maxIterations], [parameters.nonZeroDelta], [parameters.zeroDelta], [parameters.minErrorDelta], [parameters.minTolerance], [parameters.rho], [parameters.chi], [parameters.psi], [parameters.sigma], [parameters.history])`

Performs search using the Nelder-Mead algorithm.

| Parameter | Type | Description |
| --- | --- | --- |
| `f` | `function` | The objective function to minimize. It should accept an array of numbers and return a scalar value. |
| `x0` | `Array.<number>` | An initial guess for the parameters as an array of numbers. |
| `parameters` | `Object` | Optional parameters to control the optimization process. Optional. |
| `parameters.maxIterations` | `number` | Maximum number of iterations to perform. Optional. Default: `x0.length * 200`. |
| `parameters.nonZeroDelta` | `number` | Scaling factor for non-zero initial steps in the simplex. Optional. Default: `1.05`. |
| `parameters.zeroDelta` | `number` | Initial step size for parameters that are initially zero. Optional. Default: `0.001`. |
| `parameters.minErrorDelta` | `number` | Minimum change in function value to continue iterations. Optional. Default: `1e-6`. |
| `parameters.minTolerance` | `number` | Minimum change in parameters to continue iterations. Optional. Default: `1e-5`. |
| `parameters.rho` | `number` | Reflection coefficient. Optional. Default: `1`. |
| `parameters.chi` | `number` | Expansion coefficient. Optional. Default: `2`. |
| `parameters.psi` | `number` | Contraction coefficient. Optional. Default: `-0.5`. |
| `parameters.sigma` | `number` | Reduction coefficient. Optional. Default: `0.5`. |
| `parameters.history` | `Array.<Object>` | Optional array to store the history of simplex states for analysis. Optional. |

**Returns:** `Object` An object containing:
  - `fx`: The minimum function value found.
  - `x`: The parameters corresponding to the minimum function value.

##### `fminbnd(func, a, b, [tol])`

Finds the minimum of a univariate function within a specified interval using a bracketing method.

| Parameter | Type | Description |
| --- | --- | --- |
| `func` | `function` | The function to minimize. Should accept a single number and return a number. |
| `a` | `number` | The lower bound of the interval. |
| `b` | `number` | The upper bound of the interval. |
| `tol` | `number` | The tolerance for convergence (optional). Optional. Default: `1e-5`. |

**Returns:** `Object` An object containing:
  - `fx`: The minimum function value found.
  - `x`: The x-value where the function attains its minimum within [a, b].

##### `rcmiga(problem, opts)`

Creates an instance of PRDC_JSLAB_LIB_OPTIM_RCMIGA.

| Parameter | Type | Description |
| --- | --- | --- |
| `problem` | `Object` | The optimization problem definition. |
| `opts` | `Object` | Configuration options for the algorithm. |

#### presentation

##### `openPresentation(file_path, type)`

Opens an existing presentation in a new window and returns its context.
In the opened presentation, press Ctrl+S to toggle the slide controls.
Press F9 to toggle the stopwatch overlay.
When the stopwatch is visible, right-click it for Start, Stop, and Reset,
drag it to move it, and drag any corner to resize it.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Absolute or relative path to the presentation directory. |
| `type` | `String` | Type of presentation. |

**Returns:** `Promise.<Window>` Resolves to the window context of the opened presentation.

##### `editPresentation(file_path, type)`

Opens the presentation editor for the specified project and returns its context.
The preview uses the same runtime controls as openPresentation,
including Ctrl+S for slide controls and F9 for the stopwatch.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Absolute or relative path to the presentation directory. |
| `type` | `String` | Type of presentation. |

**Returns:** `Promise.<Window>` Resolves to the window context of the editor window.

##### `updatePresentation(file_path)`

Updates generated presentation internal files to the latest JSLAB runtime.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Absolute or relative path to the presentation directory. |

##### `createPresentation(file_path, [opts_in], [open_editor])`

Creates a new presentation project on disk and optionally opens it in the editor.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Target directory where the presentation project will be created. |
| `opts_in` | `Object` | Extra options Optional. |
| `open_editor` | `Boolean` | If true, automatically opens the new project in the editor. Optional. Default: `true`. |

##### `packPresentation(file_path)`

Packages an existing presentation directory into a ZIP archive beside it.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Path to the presentation directory to be archived. |

##### `makeStandalonePresentation(file_path)`

Converts an existing presentation to standalone presentation.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Path to the presentation directory to be archived. |

##### `makeOnlinePresentation(file_path)`

Restores a standalone-cleaned presentation back to the normal server-backed form.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Path to the presentation directory. |

##### `presentationToPdf(file_path, run_make_standalone)`

Converts an presentation to PDF format.

| Parameter | Type | Description |
| --- | --- | --- |
| `file_path` | `String` | Path to the presentation directory. |
| `run_make_standalone` | `Boolean` | Whether to run makeStandalonePresentation method or not. Default: `true`. |

#### mechanics

##### `plotBeamDiagrams(data, [opts_in])`

Plots beam diagrams.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array` | Array of objects with x, y, title, xlabel, ylabel |
| `opts_in` | `Object` | Extra plotting options Optional. |

**Returns:** `Promise.<{extrems: Array.<String>, context: Object}>`

#### gui

##### `isVisible(el)`

Reports whether an element participates in layout flow (i.e., is not `display:none`).

| Parameter | Type | Description |
| --- | --- | --- |
| `el` | `HTMLElement \| null` | The element to test for visibility in normal document flow. |

**Returns:** `boolean` `true` if the element has a non-null `offsetParent`; otherwise `false`.

##### `getElVal(el_or_sel)`

Reads an input-like element’s value, escapes it for HTML, and returns the result.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The element itself or a selector/ID string used to locate it. |

**Returns:** `string` The escaped string value, or an empty string if the element is not found.

##### `getElValNum(el_or_sel)`

Reads an input-like element’s value, converts it to a number, and returns the result.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The element itself or a selector/ID string used to locate it. |

**Returns:** `number` The numeric value or `NaN` if conversion fails.

##### `onSliderInput(el, fun)`

Attaches `input` and `change` listeners to a slider and forwards events to a callback.

| Parameter | Type | Description |
| --- | --- | --- |
| `el` | `string \| HTMLElement` | The slider element or a selector for delegated listening. |
| `fun` | `function` | The function to invoke each time the slider emits `input` or `change`. |

##### `onInput(el, fun, [validator])`

Fires a callback when an input loses focus or the user presses Enter, with optional delegation.

| Parameter | Type | Description |
| --- | --- | --- |
| `el` | `string \| HTMLElement` | Target element or CSS selector for delegation. |
| `fun` | `function` | Callback executed with `this` bound to the element that triggered the event. |
| `validator` | `function` | Optional predicate that must return `true` for the callback to fire. Optional. |

##### `onInputChange(el, fun, [validator])`

Detects actual value changes in an input and invokes a callback after validation.

| Parameter | Type | Description |
| --- | --- | --- |
| `el` | `string \| HTMLElement` | Target element or selector for delegated listening. |
| `fun` | `function` | Callback executed when the value truly changes. |
| `validator` | `function` | Optional predicate to approve or reject the change. Optional. |

##### `onActiveInputChange(el, fun, [validator])`

Like `onInputChange` but triggers only while the element remains focused (active input).

| Parameter | Type | Description |
| --- | --- | --- |
| `el` | `string \| HTMLElement` | Target element or selector for delegated listening. |
| `fun` | `function` | Callback executed when the value changes during active editing. |
| `validator` | `function` | Optional predicate to approve or reject the change. Optional. |

##### `setInputValue(el_or_sel, val)`

Programmatically sets an input’s value and records it as the baseline for change tracking.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The input element or selector identifying it. |
| `val` | `string \| number` | The value to assign and remember as the “set” value. |

##### `updateInputValue(el_or_sel, val)`

Updates an input’s value only if it is different from the current content, and records it.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The input element or selector identifying it. |
| `val` | `string \| number` | The new value to write and store as the baseline. |

##### `resetInputValue(el_or_sel)`

Restores an input to the value previously stored with `setInputValue`.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The input element or selector identifying it. |

##### `showInputChanged(el_or_sel)`

Adds or removes the `changed` CSS class based on whether the current value differs from the stored baseline.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The input element or selector identifying it. |

##### `validateInputNumber(el_or_sel)`

Validates that an input contains a numeric value and briefly highlights errors.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The input element or selector identifying it. |

**Returns:** `Array` Tuple of the parsed number and a validity flag.

##### `setInputWithWarning(el_or_sel, val)`

Sets an input’s value and temporarily applies a `warning` class for visual feedback.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The input element or selector identifying it. |
| `val` | `string \| number` | The value to assign before flashing the warning. |

##### `addClassMs(node, cls, ms)`

Adds a CSS class to an element for a specified duration, then removes it.

| Parameter | Type | Description |
| --- | --- | --- |
| `node` | `HTMLElement` | The element to which the class will be applied. |
| `cls` | `string` | The CSS class name to toggle. |
| `ms` | `number` | The number of milliseconds to keep the class before removal. |

##### `onResize(el_or_sel, cb)`

Observes an element’s size changes and reports each new `contentRect` to a callback.

| Parameter | Type | Description |
| --- | --- | --- |
| `el_or_sel` | `string \| HTMLElement` | The element or selector to observe. |
| `cb` | `function` | Callback that receives the `ResizeObserverEntry.contentRect` whenever the element resizes. |

**Returns:** `ResizeObserver | undefined` The observer instance, or `undefined` if the element is not found.

#### Matrix

##### `column(index)`

Extracts a specific column from a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `index` | `number` | The index of the column to extract. |

**Returns:** `Array` The extracted column as an array.

##### `row(index)`

Extracts a specific row from a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `index` | `number` | The index of the row to extract. |

**Returns:** `Array` The extracted row as an array.

##### `length(dim)`

Gets the length of the matrix along a specified dimension.

| Parameter | Type | Description |
| --- | --- | --- |
| `dim` | `number` | The dimension (0 for rows, 1 for columns). |

**Returns:** `number` The length along the specified dimension.

##### `numel()`

Gets the number of elements in the matrix.

**Returns:** `number` The number of elements.

##### `size(dim)`

Gets the size of the matrix along a specified dimension.

| Parameter | Type | Description |
| --- | --- | --- |
| `dim` | `number` | The dimension (0 for rows, 1 for columns). |

**Returns:** `number` The size along the specified dimension.

##### `reshape(rows, cols)`

Reshapes the matrix to the specified dimensions.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows` | `number` | New number of rows. |
| `cols` | `number` | New number of columns. |

**Returns:** `PRDC_JSLAB_MATRIX` The reshaped matrix.

##### `repmat(rowReps, colReps)`

Replicates the matrix a specified number of times.

| Parameter | Type | Description |
| --- | --- | --- |
| `rowReps` | `number` | Number of row repetitions. |
| `colReps` | `number` | Number of column repetitions. |

**Returns:** `PRDC_JSLAB_MATRIX` The replicated matrix.

##### `transpose()`

Transposes the matrix.

**Returns:** `PRDC_JSLAB_MATRIX` The transposed matrix.

##### `inv()`

Computes the inverse of the matrix.

**Returns:** `PRDC_JSLAB_MATRIX` The inverse matrix.

##### `det()`

Computes the determinant of the matrix.

**Returns:** `number` The determinant.

##### `trace()`

Computes the trace of the matrix (sum of diagonal elements).

**Returns:** `number` The trace of the matrix.

##### `norm()`

Computes the Frobenius norm of the matrix.

**Returns:** `number` The Frobenius norm.

##### `powm(p)`

Raises the matrix to a power.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `number` | The exponent. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `expm()`

Computes the matrix exponential.

**Returns:** `PRDC_JSLAB_MATRIX` The exponential matrix.

##### `add(A)`

Adds two matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `PRDC_JSLAB_MATRIX` | The matrix to add. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `plus(A)`

Adds two matrices (alias for add).

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `PRDC_JSLAB_MATRIX` | The matrix to add. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `subtract(A)`

Subtracts matrix A from the current matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `PRDC_JSLAB_MATRIX` | The matrix to subtract. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `minus(A)`

Subtracts matrix A from the current matrix (alias for subtract).

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `PRDC_JSLAB_MATRIX` | The matrix to subtract. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `multiply(A)`

Multiplies two matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `PRDC_JSLAB_MATRIX` | The matrix to multiply with. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `linsolve(B)`

Solves a linear system.

| Parameter | Type | Description |
| --- | --- | --- |
| `B` | `PRDC_JSLAB_MATRIX` | The right-hand side matrix. |

**Returns:** `PRDC_JSLAB_MATRIX` The solution matrix.

##### `divideEl(A)`

Divides each element by another matrix or scalar.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `PRDC_JSLAB_MATRIX \| number` | The matrix or scalar to divide by. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `multiplyEl(A)`

Multiplies each element by another matrix or scalar.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `PRDC_JSLAB_MATRIX \| number` | The matrix or scalar to multiply by. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `powEl(p)`

Raises each element to a power.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `number` | The exponent. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `elementWise(func)`

Applies a function to each element of the matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `func` | `function` | The function to apply. |

**Returns:** `PRDC_JSLAB_MATRIX` The resulting matrix.

##### `reciprocal()`

Computes the reciprocal of each element in the matrix.

**Returns:** `PRDC_JSLAB_MATRIX` The matrix with reciprocals.

##### `sum()`

Computes the sum of all elements in the matrix.

**Returns:** `number` The sum of all elements.

##### `sort([order])`

Sorts the elements of the matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `order` | `string` | The order of sorting ('asc' or 'desc'). Optional. Default: `'asc'`. |

**Returns:** `PRDC_JSLAB_MATRIX` The sorted matrix.

##### `min()`

Finds the minimum element in the matrix.

**Returns:** `number` The minimum value.

##### `max()`

Finds the maximum element in the matrix.

**Returns:** `number` The maximum value.

##### `clone()`

Creates a clone of the current matrix.

**Returns:** `PRDC_JSLAB_MATRIX` A cloned matrix instance.

##### `index(args)`

Retrieves elements based on row and column indices.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| _` | Row and column indices. |

**Returns:** `Array` The selected elements.

##### `setSub(args)`

Sets a subset of the matrix elements.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Indices and values to set. |

##### `getSub(args)`

Gets a subset of the matrix elements.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Indices to retrieve. |

**Returns:** `PRDC_JSLAB_MATRIX` The subset matrix.

##### `toArray()`

Converts the matrix to a two-dimensional array.

**Returns:** `Array` The matrix data as a two-dimensional array.

##### `toFlatArray()`

Converts the matrix to a one-dimensional array.

**Returns:** `Array` The matrix data as a one-dimensional array.

##### `toString()`

Returns a string representation of the matrix.

**Returns:** `string` The string representation of the matrix.

##### `toJSON()`

Returns a JSON representation of the matrix.

**Returns:** `Array` The matrix data as a two-dimensional array.

##### `toSafeJSON()`

Returns a safe JSON representation of the matrix.

**Returns:** `Array` The matrix data as a two-dimensional array.

##### `toPrettyString()`

Returns a pretty string representation of the matrix.

**Returns:** `string` The pretty string representation of the matrix.

#### Vector

##### `length()`

Calculates the length (magnitude) of the vector.

**Returns:** `number` The length of the vector.

##### `norm()`

Calculates the length (magnitude) of the vector.

**Returns:** `number` The length of the vector.

##### `add(v)`

Adds two vectors and returns the result.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The second vector. |

**Returns:** `PRDC_JSLAB_VECTOR` The resulting vector after addition.

##### `plus(v)`

Adds two vectors and returns the result.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The second vector. |

**Returns:** `PRDC_JSLAB_VECTOR` The resulting vector after addition.

##### `subtract(v)`

Subtracts the second vector from the first and returns the result.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The vector to subtract. |

**Returns:** `PRDC_JSLAB_VECTOR` The resulting vector after subtraction.

##### `minus(v)`

Subtracts the second vector from the first and returns the result.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The vector to subtract. |

**Returns:** `PRDC_JSLAB_VECTOR` The resulting vector after subtraction.

##### `scale(scale_x, [scale_y], [scale_z])`

Scales a vector by the given factors.

| Parameter | Type | Description |
| --- | --- | --- |
| `scale_x` | `number \| Object` | The scale factor for the x-component or an object with x, y, z properties. |
| `scale_y` | `number` | The scale factor for the y-component. Optional. |
| `scale_z` | `number` | The scale factor for the z-component. Optional. |

**Returns:** `PRDC_JSLAB_VECTOR` The scaled vector.

##### `multiply(s)`

Scales a vector by the given factor.

| Parameter | Type | Description |
| --- | --- | --- |
| `s` | `number` | The scale factor. |

**Returns:** `PRDC_JSLAB_VECTOR` The scaled vector.

##### `divide(s)`

Scales a vector by dividing each element by given factor.

| Parameter | Type | Description |
| --- | --- | --- |
| `s` | `number` | The scale factor. |

**Returns:** `PRDC_JSLAB_VECTOR` The scaled vector.

##### `equals(v)`

Checks if two vectors are equal.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The second vector. |

**Returns:** `boolean` True if vectors are equal, false otherwise.

##### `angleTo(v)`

Calculates the angle of a vector.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The vector. |

**Returns:** `number` The angle in degrees.

##### `projectTo(v)`

Projects vector to given vector.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The vector. |

**Returns:** `PRDC_JSLAB_VECTOR` The projected vector.

##### `angles(v)`

Calculates the angles of a vector.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The vector. |

**Returns:** `Array` The angles azimuth and elevation in degrees.

##### `distance(v)`

Calculates the distance between two vectors.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The second vector. |

**Returns:** `number` The distance between the two vectors.

##### `dot(v)`

Calculates the dot product of two vectors.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The second vector. |

**Returns:** `number` The dot product.

##### `cross(v)`

Calculates the cross product of two vectors.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The second vector. |

**Returns:** `PRDC_JSLAB_VECTOR` The cross product vector.

##### `interpolate(v, f)`

Interpolates between two vectors by a factor.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `PRDC_JSLAB_VECTOR` | The ending vector. |
| `f` | `number` | The interpolation factor. |

**Returns:** `PRDC_JSLAB_VECTOR` The interpolated vector.

##### `offset(x, [y], [z])`

Offsets the vector by the given amounts.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Object` | The amount to offset in the x-direction or an object with x, y, z properties. |
| `y` | `number` | The amount to offset in the y-direction. Optional. Default: `0`. |
| `z` | `number` | The amount to offset in the z-direction. Optional. Default: `0`. |

**Returns:** `PRDC_JSLAB_VECTOR` The updated vector instance.

##### `normalize()`

Normalizes the vector to have a length of 1.

**Returns:** `PRDC_JSLAB_VECTOR` The normalized vector.

##### `negate()`

Negates the vector components.

**Returns:** `PRDC_JSLAB_VECTOR` The negated vector.

##### `clone()`

Creates a clone of this vector.

**Returns:** `PRDC_JSLAB_VECTOR` A new vector instance with the same components.

##### `toArray()`

Converts the vector to an array.

**Returns:** `Array.<number>` An array containing the x, y, z components of the vector.

##### `toMatrix()`

Converts the vector to a matrix.

**Returns:** `Object` A matrix representation of the vector.

##### `toColMatrix()`

Converts the vector to a column matrix.

**Returns:** `Object` A column matrix representation of the vector.

##### `toRowMatrix()`

Converts the vector to a row matrix.

**Returns:** `Object` A row matrix representation of the vector.

##### `toString()`

Returns a string representation of the vector.

**Returns:** `string` The string representation in the format 'Vector(x:, y:, z:)'.

##### `toJSON()`

Returns a string representation of the vector.

**Returns:** `string` The string representation in the format 'Vector(x:, y:, z:)'.

##### `toSafeJSON()`

Returns a string representation of the vector.

**Returns:** `string` The string representation in the format 'Vector(x:, y:, z:)'.

##### `toPrettyString()`

Converts the object to a pretty string representation.

**Returns:** `string` The pretty string representation of the object.

#### Symbolic

##### `setValue(value)`

Sets the value of the symbolic variable.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The new value to assign to the symbolic variable. |

##### `toString()`

Returns a string representation of the vector.

**Returns:** `string` The string representation in the format 'Vector(x:, y:, z:)'.

##### `toNumeric()`

Converts the symbolic value to a numeric value.

**Returns:** `*` The numeric representation of the symbolic value.

##### `toJSON()`

Converts the symbolic value to a JSON string.

**Returns:** `string` The JSON string representation of the symbolic value.

##### `toSafeJSON()`

Converts the object to a safe JSON representation.

**Returns:** `Object` The safe JSON representation of the object.

##### `toPrettyString()`

Converts the object to a pretty string representation.

**Returns:** `string` The pretty string representation of the object.

#### Table

##### `height()`

Gets table height (number of rows).

**Returns:** `number`

##### `width()`

Gets table width (number of variables).

**Returns:** `number`

##### `size([dim])`

Gets size tuple [height, width] or one dimension.

| Parameter | Type | Description |
| --- | --- | --- |
| `dim` | `number` | Dimension index (0 or 1). Optional. |

**Returns:** `Array.<number> | number`

##### `hasVariable(name)`

Checks whether variable name exists.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Variable name. |

**Returns:** `boolean`

##### `getVariable(name)`

Gets variable column.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Variable name. |

**Returns:** `Array`

##### `setVariable(name, values)`

Sets or creates a variable column.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Variable name. |
| `values` | `*` | Column values. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `selectvars(names)`

Returns selected variables as a new table.

| Parameter | Type | Description |
| --- | --- | --- |
| `names` | `Array \| string` | Variable names. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `removevars(names)`

Removes variables and returns a new table.

| Parameter | Type | Description |
| --- | --- | --- |
| `names` | `Array \| string` | Variable names to remove. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `renamevars(old_names, new_names)`

Renames variables and returns a new table.

| Parameter | Type | Description |
| --- | --- | --- |
| `old_names` | `Array \| string` | Existing variable names. |
| `new_names` | `Array \| string` | New variable names. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `addvars(args)`

Appends variables and returns a new table.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `*` | Variables and optional { NewVariableNames: [] }. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `subsetRows(row_selector)`

Returns a row subset as a new table.

| Parameter | Type | Description |
| --- | --- | --- |
| `row_selector` | `number \| Array \| TypedArray \| function` | Row selector. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `rows(row_selector)`

Alias for subsetRows.

| Parameter | Type | Description |
| --- | --- | --- |
| `row_selector` | `number \| Array \| TypedArray \| function` | Row selector. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `head([n])`

Returns first N rows.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number` | Rows count. Optional. Default: `8`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `tail([n])`

Returns last N rows.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number` | Rows count. Optional. Default: `8`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `filter(predicate)`

Filters rows using predicate.

| Parameter | Type | Description |
| --- | --- | --- |
| `predicate` | `function` | Row predicate. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `sortrows(by, [direction])`

Sorts rows by variable.

| Parameter | Type | Description |
| --- | --- | --- |
| `by` | `string \| number` | Variable name or column index. |
| `direction` | `string` | Sort direction. Optional. Default: `'asc'`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `innerjoin(right, [options])`

Inner join with another table.

| Parameter | Type | Description |
| --- | --- | --- |
| `right` | `PRDC_JSLAB_TABLE` | Right table. |
| `options` | `Object` | Join options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `outerjoin(right, [options])`

Outer join with another table.

| Parameter | Type | Description |
| --- | --- | --- |
| `right` | `PRDC_JSLAB_TABLE` | Right table. |
| `options` | `Object` | Join options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `join(right, [options])`

Alias for inner join.

| Parameter | Type | Description |
| --- | --- | --- |
| `right` | `PRDC_JSLAB_TABLE` | Right table. |
| `options` | `Object` | Join options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `groupsummary(groupvars, [method], [datavars])`

Group summary for this table.

| Parameter | Type | Description |
| --- | --- | --- |
| `groupvars` | `Array \| string` | Grouping variables. |
| `method` | `Array \| string` | Aggregation method(s). Optional. Default: `'mean'`. |
| `datavars` | `Array \| string` | Data variable names. Optional. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `varfun(fun, [options])`

Applies a function to table variables.

| Parameter | Type | Description |
| --- | --- | --- |
| `fun` | `function \| string` | Function or aggregate name. |
| `options` | `Object` | varfun options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `ismissing()`

Missing-value mask table.

**Returns:** `PRDC_JSLAB_TABLE`

##### `fillmissing([method], [fill_value])`

Filled table copy.

| Parameter | Type | Description |
| --- | --- | --- |
| `method` | `string` | Fill method. Optional. Default: `'constant'`. |
| `fill_value` | `*` | Fill value. Optional. Default: `null`. |

**Returns:** `PRDC_JSLAB_TABLE`

##### `variableTypes([max_scan_rows])`

Returns inferred variable types.

| Parameter | Type | Description |
| --- | --- | --- |
| `max_scan_rows` | `number` | Max rows to inspect per variable. Optional. Default: `200`. |

**Returns:** `Object.<string, string>`

##### `toObjectRows()`

Converts table to row objects.

**Returns:** `Array.<Object>`

##### `toArray()`

Converts table to 2D array.

**Returns:** `Array.<Array>`

##### `toColumns()`

Returns plain object with cloned columns.

**Returns:** `Object.<string, Array>`

##### `summary()`

Returns summary object.

**Returns:** `Object`

##### `getInspectorColumns()`

Returns inspector column definitions.

**Returns:** `Array.<Object>`

##### `getInspectorRows()`

Returns inspector row payload.

**Returns:** `Array.<Object>`

##### `setCell(row_index, column_name, value)`

Sets cell value.

| Parameter | Type | Description |
| --- | --- | --- |
| `row_index` | `number` | Row index. |
| `column_name` | `string \| number` | Column name or index. |
| `value` | `*` | New value. |

**Returns:** `boolean`

##### `getCell(row_index, column_name)`

Gets cell value.

| Parameter | Type | Description |
| --- | --- | --- |
| `row_index` | `number` | Row index. |
| `column_name` | `string \| number` | Column name or index. |

**Returns:** `*`

##### `toString()`

String representation.

**Returns:** `string`

##### `toJSON()`

JSON representation.

**Returns:** `Object`

##### `toSafeJSON()`

Safe JSON representation.

**Returns:** `Object`

##### `toPrettyString()`

Pretty string representation.

**Returns:** `string`

#### Timetable

##### `height()`

Gets timetable height.

**Returns:** `number`

##### `setRowTimes(row_times)`

Sets row times.

| Parameter | Type | Description |
| --- | --- | --- |
| `row_times` | `*` | Row times column. |

**Returns:** `PRDC_JSLAB_TIMETABLE`

##### `subsetRows(row_selector)`

Returns row subset as new timetable.

| Parameter | Type | Description |
| --- | --- | --- |
| `row_selector` | `number \| Array \| TypedArray \| function` | Row selector. |

**Returns:** `PRDC_JSLAB_TIMETABLE`

##### `sortrows([by], [direction])`

Sorts rows by row times or variable.

| Parameter | Type | Description |
| --- | --- | --- |
| `by` | `string \| number` | Sort key. Optional. Default: `'RowTimes'`. |
| `direction` | `string` | Sort direction. Optional. Default: `'asc'`. |

**Returns:** `PRDC_JSLAB_TIMETABLE`

##### `retime(step, [method], [options])`

Retimes timetable with fixed bucket size.

| Parameter | Type | Description |
| --- | --- | --- |
| `step` | `number \| string` | Bucket step. |
| `method` | `string` | Aggregation method. Optional. Default: `'mean'`. |
| `options` | `Object` | Additional options. Optional. Default: `{}`. |

**Returns:** `PRDC_JSLAB_TIMETABLE`

##### `timerange(start_time, end_time)`

Selects rows within [start_time, end_time].

| Parameter | Type | Description |
| --- | --- | --- |
| `start_time` | `*` | Inclusive lower bound. |
| `end_time` | `*` | Inclusive upper bound. |

**Returns:** `PRDC_JSLAB_TIMETABLE`

##### `toObjectRows()`

Converts timetable to row objects.

**Returns:** `Array.<Object>`

##### `getInspectorColumns()`

Returns inspector column definitions.

**Returns:** `Array.<Object>`

##### `getInspectorRows()`

Returns inspector row payload.

**Returns:** `Array.<Object>`

##### `setCell(row_index, column_name, value)`

Sets cell value (supports row times through "__rowtime__").

| Parameter | Type | Description |
| --- | --- | --- |
| `row_index` | `number` | Row index. |
| `column_name` | `string \| number` | Column name. |
| `value` | `*` | New value. |

**Returns:** `boolean`

##### `toString()`

String representation.

**Returns:** `string`

##### `toJSON()`

JSON representation.

**Returns:** `Object`

#### Window

##### `open(file)`

Opens the window with the specified file or url.

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | `string` | The path to the HTML file or url to open in the window. |

**Returns:** `Promise.<void>` A promise that resolves when the window is opened and ready.

##### `show()`

Shows the window.

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the window was shown successfully, or `false` if the window ID is invalid.

##### `hide()`

Hides the window.

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the window was hidden successfully, or `false` if the window ID is invalid.

##### `focus()`

Brings focus to the window.

**Returns:** `Promise` - Resolves when the window size is focused.

##### `minimize()`

Minimizes the window.

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the window was minimized successfully, or `false` if the window ID is invalid.

##### `center()`

Centers the window on the screen.

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the window was centered successfully, or `false` if the window ID is invalid.

##### `moveTop()`

Moves the window to the top of the window stack.

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the window was moved to the top successfully, or `false` if the window ID is invalid.

##### `setSize(width, height)`

Sets the size of the current window.

| Parameter | Type | Description |
| --- | --- | --- |
| `width` | `number` | The desired width of the window. |
| `height` | `number` | The desired height of the window. |

**Returns:** `Promise` - Resolves when the window size is set.

##### `setPos(left, top)`

Sets the position of the current window.

| Parameter | Type | Description |
| --- | --- | --- |
| `left` | `number` | The desired left position of the window. |
| `top` | `number` | The desired top position of the window. |

**Returns:** `Promise` - Resolves when the window position is set.

##### `setResizable(state)`

Sets the resizable state of the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `state` | `boolean` | Whether the window should be resizable (`true`) or not (`false`). |

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the resizable state was set successfully, or `false` if the window ID is invalid.

##### `setMovable(state)`

Sets the movable state of the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `state` | `boolean` | Whether the window should be movable (`true`) or not (`false`). |

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the movable state was set successfully, or `false` if the window ID is invalid.

##### `setAspectRatio(aspect_ratio)`

Sets the aspect ratio of the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `aspect_ratio` | `number` | The desired aspect ratio (width divided by height) for the window. |

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the aspect ratio was set successfully, or `false` if the window ID is invalid.

##### `setOpacity(opacity)`

Sets the opacity of the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `opacity` | `number` | The desired opacity level of the window (ranging from `0` for fully transparent to `1` for fully opaque). |

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the opacity was set successfully, or `false` if the window ID is invalid.

##### `setFullscreen(state)`

Sets the fullscreen state of the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `state` | `number` | State of fullscreen |

**Returns:** `Promise.<(boolean|undefined)>` - Resolves to `true` if the fullscreen was set successfully, or `false` if the window ID is invalid.

##### `setTitle(title)`

Sets the title of the current window.

| Parameter | Type | Description |
| --- | --- | --- |
| `title` | `string` | The new title for the window. |

**Returns:** `Promise.<*>` A promise that resolves when the title is set.

##### `printToPdf(options)`

Prints the current window to PDF.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `Object` | Options for printing. |

**Returns:** `Buffer` Generated PDF data.

##### `getSize()`

Retrieves the size of the current window.

**Returns:** `Promise.<Array>` - Resolves with an array [width, height].

##### `getPos()`

Retrieves the position of the current window.

**Returns:** `Promise.<Array>` - Resolves with an array [left, top].

##### `close()`

Closes the current window.

**Returns:** `Promise` - Resolves when the window is closed.

##### `openDevTools()`

Opens the developer tools for the current window asynchronously.

**Returns:** `Promise.<boolean>` A promise that resolves to true when dev tools are opened.

##### `getMediaSourceId()`

Returns media source id for this window.

**Returns:** `String | boolean` Media source id if there is window; otherwise, false.

##### `startVideoRecording(opts)`

Starts video recording of this window.

| Parameter | Type | Description |
| --- | --- | --- |
| `opts` | `Object` | Optional settings. |

**Returns:** `Object | boolean` - Returns recorder object.

##### `addScript(script_path)`

Appends a script to the document head.

| Parameter | Type | Description |
| --- | --- | --- |
| `script_path` | `string` | The script's URL. |

##### `addLinkStylesheet(stylesheet_path)`

Appends a stylesheet link to the document head.

| Parameter | Type | Description |
| --- | --- | --- |
| `stylesheet_path` | `string` | The stylesheet's URL. |

##### `addUI()`

Loads the UI script.

#### Figure

##### `init()`

Initializes figure.

##### `focus()`

Brings the figure window to the foreground.

##### `setSize(width, height)`

Sets the size of the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `width` | `number` | The desired width of the window. |
| `height` | `number` | The desired height of the window. |

**Returns:** `Promise` - Resolves when the window size is set.

##### `setPos(left, top)`

Sets the position of the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `left` | `number` | The desired left position of the window. |
| `top` | `number` | The desired top position of the window. |

**Returns:** `Promise` - Resolves when the window position is set.

##### `setTitle(title)`

Sets the title of the current window.

| Parameter | Type | Description |
| --- | --- | --- |
| `title` | `string` | The new title for the window. |

**Returns:** `Promise.<*>` A promise that resolves when the title is set.

##### `getSize()`

Retrieves the size of the window.

**Returns:** `Promise.<Array>` - Resolves with an array [width, height].

##### `getPos()`

Retrieves the position of the window.

**Returns:** `Promise.<Array>` - Resolves with an array [left, top].

##### `getMediaSourceId()`

Retrieves the media source id of the figure.

**Returns:** `String` - Media source id.

##### `startVideoRecording(opts)`

Starts video recording of the figure.

| Parameter | Type | Description |
| --- | --- | --- |
| `opts` | `Object` | Optional settings. |

**Returns:** `Object | boolean` - Returns recorder object.

##### `close()`

Closes the window.

**Returns:** `Promise` - Resolves when the window is closed.

##### `hideMenu()`

Hides figure menu.

##### `showMenu()`

Shows figure menu.

#### Plot

##### `legend(label)`

Sets the label for the x-axis of the plot.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | Label text for the x-axis. |

##### `xlabel(label)`

Sets the label for the x-axis of the plot.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | Label text for the x-axis. |

##### `ylabel(label)`

Sets the label for the y-axis of the plot.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | Label text for the y-axis. |

##### `zlabel(label)`

Sets the label for the z-axis of the plot.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | Label text for the z-axis. |

##### `title(label)`

Sets the title of the plot.

| Parameter | Type | Description |
| --- | --- | --- |
| `label` | `String` | Title text for the plot. |

##### `xlim(lim)`

Sets the limits for the x-axis of the plot.

| Parameter | Type | Description |
| --- | --- | --- |
| `lim` | `String` | Limits for the x-axis. |

##### `ylim(lim)`

Sets the limits for the y-axis of the plot.

| Parameter | Type | Description |
| --- | --- | --- |
| `lim` | `String` | Limits for the y-axis. |

##### `zlim(lim)`

Sets the limits for the z-axis of the plot.

| Parameter | Type | Description |
| --- | --- | --- |
| `lim` | `String` | Limits for the z-axis. |

##### `view(azimuth, elevation)`

Adjusts the view based on azimuth and elevation angles.

| Parameter | Type | Description |
| --- | --- | --- |
| `azimuth` | `number` | The azimuth angle. |
| `elevation` | `number` | The elevation angle. |

##### `zoom(factor)`

Adjusts the zoom based on factor.

| Parameter | Type | Description |
| --- | --- | --- |
| `factor` | `number` | The zoom factor. |

##### `axis(style)`

Sets the axis style value and updates the plot layout if the plot is ready.

| Parameter | Type | Description |
| --- | --- | --- |
| `style` | `Object` | The style configuration to set for the axis. |

##### `fromJSON(data)`

Sets the plot data from JSON.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array` | Data for the plot. |

##### `print(filename, options)`

Adds a print job to the queue and prints it if the system is ready.

| Parameter | Type | Description |
| --- | --- | --- |
| `filename` | `String` | The filename for the print job. |
| `options` | `Object` | Options for the print job. |

##### `update(traces, N)`

Updates plot data by delegating to the `updateData` method.

| Parameter | Type | Description |
| --- | --- | --- |
| `traces` | `Object` | The trace data to be updated in the plot. |
| `N` | `number` | The data length or index for updating the plot. |

##### `updateById(data)`

Updates plot data by delegating to the `updateDataById` method.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Object \| Array.<Object>` | Trace update object(s) addressed by `id`. |

##### `remove()`

Removes the plot from the figure, cleaning up any resources associated with it.

#### freecad_link

##### `start(exe, options)`

Starts the FreeCAD application and establishes a TCP connection for remote procedure calls.
Attempts to start FreeCAD if it's not running and connects to its TCP server.

| Parameter | Type | Description |
| --- | --- | --- |
| `exe` | `string` | The executable path of FreeCAD. |
| `options` | `Object` | Configuration options such as port and host. |

##### `findServer()`

Attempts to locate the FreeCAD TCP server within the network, respecting the startup timeout.
Checks if the TCP server is reachable by sending a 'PING' command.

##### `send(message, timeout)`

Sends a message to the FreeCAD TCP server and waits for a response.
Manages the TCP communication by ensuring message integrity and handling timeouts.

| Parameter | Type | Description |
| --- | --- | --- |
| `message` | `string` | The message to send. |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

**Returns:** `Buffer | boolean` - The response from the server or false if the request times out.

##### `inputParser(message)`

Parses the input from FreeCAD responses to identify errors and data.
Splits the message by '|' and checks for error or data messages.

| Parameter | Type | Description |
| --- | --- | --- |
| `message` | `string` | The message received from FreeCAD. |

**Returns:** `Array` - An array of parsed message components.

##### `showMessage(message)`

Displays a message from FreeCAD in the JSLAB interface.
Parses and displays messages specifically tagged as 'MSG' from FreeCAD.

| Parameter | Type | Description |
| --- | --- | --- |
| `message` | `string` | The message received from FreeCAD. |

##### `quit()`

Closes the FreeCAD application gracefully.
Sends a quit command and handles the termination of the TCP connection.

##### `open(filePath, timeout)`

Opens a specified file in FreeCAD.
Sends a command to open a file and handles responses to confirm file access.

| Parameter | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path to the file to be opened. |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `importFile(filePath, timeout)`

Imports a file into the current FreeCAD document.
Sends an import command and handles responses to confirm the import operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The path of the file to be imported. |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `newDocument(filename, timeout)`

Creates a new document in FreeCAD, optionally specifying a filename.
Sends a command to create a new document and handles the document creation response.

| Parameter | Type | Description |
| --- | --- | --- |
| `filename` | `string` | Optional filename for the new document. |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `save(timeout)`

Saves the current document in FreeCAD.
Sends a save command and handles responses to confirm the save operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `saveAs(filePath, timeout)`

Saves the current document in FreeCAD under a new filename.
Sends a save as command and handles responses to confirm the operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `filePath` | `string` | The new file path for the document. |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `close(timeout)`

Closes the current document in FreeCAD.
Sends a close command and handles responses to confirm the document closure.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `evaluate(command, timeout)`

Executes a command in FreeCAD and returns the evaluation result.
Sends an evaluate command with the specified command string.

| Parameter | Type | Description |
| --- | --- | --- |
| `command` | `string` | The command to be evaluated in FreeCAD. |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `callScript(script, param, timeout)`

Runs a script in FreeCAD with optional parameters.
Sends a script command along with parameters and handles the script execution response.

| Parameter | Type | Description |
| --- | --- | --- |
| `script` | `string` | The script to run. |
| `param` | `string \| array` | Parameters to pass to the script. |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `getArea(timeout)`

Retrieves the area of the selected object in FreeCAD.
Sends a measure area command and parses the response to extract the area value.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

##### `getVolume(timeout)`

Retrieves the volume of the selected object in FreeCAD.
Sends a measure volume command and parses the response to extract the volume value.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeout` | `number` | Timeout in milliseconds to wait for a response. |

#### om_link

##### `start(exe)`

Starts the interaction with an external executable by initializing the necessary environment and parameters.
Launches the executable with the appropriate command-line arguments for interaction via ZMQ.
Waits for a port file to be created to establish the ZMQ communication.

| Parameter | Type | Description |
| --- | --- | --- |
| `exe` | `string` | Path to the executable to be run, defaults to the OpenModelica compiler if not provided. |

##### `sendExpression(expr)`

Sends an expression to be evaluated by the external executable through the ZMQ connection and waits for the result.
Parses the response using a dedicated expression parser.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `string` | The expression to be evaluated. |

**Returns:** `Promise.<any>` - A promise that resolves with the parsed result of the expression evaluation.

##### `ModelicaSystem(filename, modelname, [libraries], [command_line_options])`

Initializes and configures a Modelica system with the specified parameters and libraries.
Loads necessary files and prepares the environment for simulation.

| Parameter | Type | Description |
| --- | --- | --- |
| `filename` | `string` | The path to the Modelica file. |
| `modelname` | `string` | The name of the Modelica model. |
| `libraries` | `Array.<string>` | An array of library paths to load. Optional. Default: `[]`. |
| `command_line_options` | `string` | Additional command-line options for the simulation. Optional. Default: `''`. |

##### `BuildModelicaModel()`

Builds the Modelica model by sending the appropriate build command and parsing the resulting XML file.

##### `getWorkDirectory()`

Retrieves the working directory used for temporary files and simulations.

**Returns:** `string` - The path to the working directory.

##### `xmlparse()`

Parses the XML file generated by the Modelica compiler to extract simulation parameters and variables.

##### `processVariable(scalar)`

Processes a scalar variable from the XML file and categorizes it based on its properties.

| Parameter | Type | Description |
| --- | --- | --- |
| `scalar` | `Object` | The scalar variable to process. |

##### `getQuantities([args])`

Retrieves a list of quantities based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `Array.<string>` | An array of quantity names to retrieve. If omitted, returns all quantities. Optional. |

**Returns:** `Array.<Object>` - An array of quantity objects.

##### `getLinearQuantities([args])`

Retrieves a list of linearized quantities based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `Array.<string>` | An array of linear quantity names to retrieve. If omitted, returns all linear quantities. Optional. |

**Returns:** `Array.<Object>` - An array of linear quantity objects.

##### `getParameters([args])`

Retrieves simulation parameters based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single parameter name or an array of parameter names to retrieve. If omitted, returns all parameters. Optional. |

**Returns:** `Object | any` - An object containing the requested parameters or a single parameter value.

##### `getInputs([args])`

Retrieves input variables based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single input name or an array of input names to retrieve. If omitted, returns all inputs. Optional. |

**Returns:** `Object | any` - An object containing the requested inputs or a single input value.

##### `getOutputs([args])`

Retrieves output variables based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single output name or an array of output names to retrieve. If omitted, returns all outputs. Optional. |

**Returns:** `Object | any` - An object containing the requested outputs or a single output value.

##### `getContinuous([args])`

Retrieves continuous variables based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single continuous variable name or an array of names to retrieve. If omitted, returns all continuous variables. Optional. |

**Returns:** `Object | any` - An object containing the requested continuous variables or a single value.

##### `getSimulationOptions([args])`

Retrieves simulation options based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single simulation option name or an array of names to retrieve. If omitted, returns all simulation options. Optional. |

**Returns:** `Object | any` - An object containing the requested simulation options or a single option value.

##### `getLinearizationOptions([args])`

Retrieves linearization options based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single linearization option name or an array of names to retrieve. If omitted, returns all linearization options. Optional. |

**Returns:** `Object | any` - An object containing the requested linearization options or a single option value.

##### `setParameters(args)`

Sets simulation parameters based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single parameter assignment (e.g., "param=5") or an array of assignments. |

##### `setSimulationOptions(args)`

Sets simulation options based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single simulation option assignment (e.g., "stepSize=0.01") or an array of assignments. |

##### `setLinearizationOptions(args)`

Sets linearization options based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single linearization option assignment or an array of assignments. |

##### `setInputs(args)`

Sets input variables based on the provided arguments.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single input assignment (e.g., "input1=10") or an array of assignments. |

##### `createcsvData()`

Creates a CSV file containing input data for the simulation.

##### `simulate([resultfile], [sim_flags])`

Runs the simulation with optional result file and simulation flags.

| Parameter | Type | Description |
| --- | --- | --- |
| `resultfile` | `string` | The name of the result file to generate. Optional. Default: `''`. |
| `sim_flags` | `string` | Additional simulation flags. Optional. Default: `''`. |

##### `linearize()`

Performs linearization of the model and retrieves the linear matrices.

**Returns:** `Array.<Object>` - An array containing the A, B, C, and D matrices.

##### `getLinearMatrix()`

Retrieves the linear A, B, C, and D matrices.

**Returns:** `Array.<Object>` - An array containing the A, B, C, and D matrices.

##### `getLinearMatrixValues(matrix_name)`

Converts linear matrix data into a two-dimensional array format.

| Parameter | Type | Description |
| --- | --- | --- |
| `matrix_name` | `Object` | The linear matrix object to convert. |

**Returns:** `Array.<Array.<number>> | number` - The converted matrix as a 2D array or 0 if empty.

##### `getlinear_inputs()`

Retrieves the linear input variables.

**Returns:** `string | boolean` - The linear input variables or false if the model is not linearized.

##### `getlinear_outputs()`

Retrieves the linear output variables.

**Returns:** `string | boolean` - The linear output variables or false if the model is not linearized.

##### `getlinear_states()`

Retrieves the linear state variables.

**Returns:** `string | boolean` - The linear state variables or false if the model is not linearized.

##### `getSolutions([args], [resultfile])`

Retrieves simulation solutions based on the provided arguments and result file.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string \| Array.<string>` | A single variable name or an array of names to retrieve solutions for. If omitted, retrieves all variables. Optional. |
| `resultfile` | `string` | The path to the result file. Optional. Default: `this.resultfile`. |

**Returns:** `Promise.<any>` - A promise that resolves with the simulation results or an error message.

##### `createValidNames(name, value, structname)`

Creates valid variable names by replacing invalid characters and categorizes them based on the structure name.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The original variable name. |
| `value` | `any` | The value of the variable. |
| `structname` | `string` | The structure name (e.g., 'continuous', 'parameter'). |

##### `parseExpression(args)`

Parses a given expression string into structured data based on predefined formats.
Handles various formats including single and nested lists, records, and single elements.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `string` | The expression string to parse. |

**Returns:** `Array | Object | string` - The parsed data which could be an array, an object, or a string.

##### `close()`

Closes the current session safely by cleaning up resources such as temporary files and network connections.
Terminates any active processes and removes temporary port files.

#### tcp_client

##### `setOnData(callback)`

Sets the callback function to handle incoming data events.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | The function to be called when data is received. |

##### `setOnError(callback)`

Sets the callback function to handle error events.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | The function to be called when an error occurs. |

##### `setKeepAlive([enable], [initialDelay])`

Enables or disables keep-alive functionality on the underlying socket.

| Parameter | Type | Description |
| --- | --- | --- |
| `enable` | `boolean` | Whether to enable keep-alive. Optional. Default: `true`. |
| `initialDelay` | `number` | Delay in milliseconds before the first keep-alive probe is sent. Optional. Default: `0`. |

##### `setNoDelay([noDelay])`

Disables the Nagle algorithm, allowing data to be sent immediately.

| Parameter | Type | Description |
| --- | --- | --- |
| `noDelay` | `boolean` | Whether to disable the Nagle algorithm. Optional. Default: `true`. |

##### `setTimeout(timeout, [callback])`

Sets the socket timeout for inactivity.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeout` | `number` | Timeout in milliseconds. |
| `callback` | `function` | Optional callback triggered on timeout. Optional. |

##### `read([N])`

Reads a specified number of bytes from the buffer.

| Parameter | Type | Description |
| --- | --- | --- |
| `N` | `number` | The number of bytes to read. Reads all available bytes if not specified. Optional. Default: `Infinity`. |

**Returns:** `Buffer` The data read from the buffer.

##### `write(data)`

Writes data to the TCP connection if the client is active.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Buffer \| string` | The data to send over the TCP connection. |

##### `availableBytes()`

Returns the number of bytes available in the buffer.

**Returns:** `number` The number of available bytes.

##### `close()`

Closes the TCP connection and cleans up resources.

#### tcp_server

##### `setOnData(callback)`

Sets the callback function to handle incoming data events.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | Function called when data is received. |

##### `setOnError(callback)`

Sets the callback function to handle error events.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | Function called when an error occurs. |

##### `setOnDisconnect(callback)`

Sets the callback function to handle disconnection events.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | Function called when a socket disconnects. |

##### `write(socket, data)`

Writes data to a specific TCP connection.

| Parameter | Type | Description |
| --- | --- | --- |
| `socket` | `Object` | The socket to write data to. |
| `data` | `Buffer \| string` | The data to send over the TCP connection. |

##### `close()`

Closes the TCP server and all active connections.

#### udp_client

##### `write(data)`

Sends data over the UDP connection if the client is active.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Buffer \| string` | The data to send over the UDP connection. |

##### `close()`

Closes the UDP connection and cleans up resources.

#### udp_server

##### `setOnData(callback)`

Sets the callback function to handle incoming data events.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | The function to be called when data is received. |

##### `read([N])`

Reads a specified number of bytes from the buffer.

| Parameter | Type | Description |
| --- | --- | --- |
| `N` | `number` | The maximum number of bytes to read. Reads all available bytes by default. Optional. Default: `Infinity`. |

**Returns:** `Array` An array containing the first N bytes of buffered data.

##### `availableBytes()`

Returns the number of bytes available in the buffer.

**Returns:** `number` The number of bytes currently stored in the buffer.

##### `close()`

Closes the UDP server and releases any resources.

#### video_call

##### `setOnMessage(callback)`

Sets a callback function to handle incoming messages.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | The function to call when a message is received. |

##### `sendMessage(data)`

Sends a message to the connected peer.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `any` | The data to send. |

##### `toggleAudio(mute)`

Toggles the local audio track on or off.

| Parameter | Type | Description |
| --- | --- | --- |
| `mute` | `boolean` | If true, mutes the audio; otherwise, unmutes. |

##### `toggleVideo(disable)`

Toggles the local video track on or off.

| Parameter | Type | Description |
| --- | --- | --- |
| `disable` | `boolean` | If true, disables the video; otherwise, enables it. |

##### `endCall()`

Ends the call by closing peer connections and media streams.

#### mathjs

##### `isComplex(x)`

Test whether a value is a Complex number.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Complex number, false otherwise.

##### `isBigNumber(x)`

Test whether a value is a BigNumber.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a BigNumber, false otherwise.

##### `isFraction(x)`

Test whether a value is a Fraction.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Fraction, false otherwise.

##### `isUnit(x)`

Test whether a value is a Unit.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Unit, false otherwise.

##### `isMatrix(x)`

Test whether a value is a Matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Matrix, false otherwise.

##### `isCollection(x)`

Test whether a value is a collection (Array or Matrix).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is an Array or Matrix, false otherwise.

##### `isDenseMatrix(x)`

Test whether a value is a DenseMatrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a DenseMatrix, false otherwise.

##### `isSparseMatrix(x)`

Test whether a value is a SparseMatrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a SparseMatrix, false otherwise.

##### `isRange(x)`

Test whether a value is a Range.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Range, false otherwise.

##### `isIndex(x)`

Test whether a value is an Index.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is an Index, false otherwise.

##### `isBoolean(x)`

Test whether a value is a boolean.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a boolean, false otherwise.

##### `isResultSet(x)`

Test whether a value is a ResultSet.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a ResultSet, false otherwise.

##### `isHelp(x)`

Test whether a value is a Help object.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Help object, false otherwise.

##### `isDate(x)`

Test whether a value is a Date.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Date object, false otherwise.

##### `isRegExp(x)`

Test whether a value is a RegExp.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a RegExp object, false otherwise.

##### `isAccessorNode(x)`

Test whether a value is an AccessorNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is an AccessorNode, false otherwise.

##### `isArrayNode(x)`

Test whether a value is an ArrayNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is an ArrayNode, false otherwise.

##### `isAssignmentNode(x)`

Test whether a value is an AssignmentNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is an AssignmentNode, false otherwise.

##### `isBlockNode(x)`

Test whether a value is a BlockNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a BlockNode, false otherwise.

##### `isConditionalNode(x)`

Test whether a value is a ConditionalNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a ConditionalNode, false otherwise.

##### `isConstantNode(x)`

Test whether a value is a ConstantNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a ConstantNode, false otherwise.

##### `isFunctionAssignmentNode(x)`

Test whether a value is a FunctionAssignmentNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a FunctionAssignmentNode, false otherwise.

##### `isFunctionNode(x)`

Test whether a value is a FunctionNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a FunctionNode, false otherwise.

##### `isIndexNode(x)`

Test whether a value is an IndexNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is an IndexNode, false otherwise.

##### `isNode(x)`

Test whether a value is a Node.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Node, false otherwise.

##### `isObjectNode(x)`

Test whether a value is an ObjectNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is an ObjectNode, false otherwise.

##### `isOperatorNode(x)`

Test whether a value is an OperatorNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is an OperatorNode, false otherwise.

##### `isParenthesisNode(x)`

Test whether a value is a ParenthesisNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a ParenthesisNode, false otherwise.

##### `isRangeNode(x)`

Test whether a value is a RangeNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a RangeNode, false otherwise.

##### `isRelationalNode(x)`

Test whether a value is a RelationalNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a RelationalNode, false otherwise.

##### `isSymbolNode(x)`

Test whether a value is a SymbolNode.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a SymbolNode, false otherwise.

##### `isChain(x)`

Test whether a value is a Chain.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if `x` is a Chain, false otherwise.

##### `on(event, callback)`

Subscribe to an event.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | `string` | The event name to subscribe to. |
| `callback` | `function` | The callback function to execute when the event occurs. |

**Returns:** `void`

##### `off(event, [callback])`

Unsubscribe from an event.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | `string` | The event name to unsubscribe from. |
| `callback` | `function` | The callback function to remove. Optional. |

**Returns:** `void`

##### `once(event, callback)`

Subscribe to an event once.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | `string` | The event name to subscribe to. |
| `callback` | `function` | The callback function to execute when the event occurs. |

**Returns:** `void`

##### `emit(event, [data])`

Emit an event, triggering all bound callbacks.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | `string` | The event name to emit. |
| `data` | `*` | The data to pass to the event handlers. Optional. |

**Returns:** `void`

##### `expression`

An object containing functions for parsing and evaluating expressions.

##### `import(object, [options])`

Import functions or constants into math.js.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `Object \| Array` | An object or array of objects with functions or constants to import. |
| `options` | `Object` | Optional import options. Optional. |

**Returns:** `void`

##### `create([config], [factories])`

Create a new, isolated math.js instance.

| Parameter | Type | Description |
| --- | --- | --- |
| `config` | `Object` | Optional configuration options. Optional. |
| `factories` | `Array.<function()>` | Optional list of factories to include. Optional. |

**Returns:** `PRDC_JSLAB_MATHJS_DOC` Returns a new instance of math.js.

##### `factory(name, dependencies, create)`

Factory function to create new functions.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the function. |
| `dependencies` | `Array.<string>` | Array of dependency names. |
| `create` | `function` | Function to create the new function. |

**Returns:** `function` Returns the created function.

##### `abs(x)`

Calculate the absolute value of a number.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | A number or array with numbers. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` Returns the absolute value of `x`.

##### `AccessorNode(object, index)`

A node representing access to a property or index.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `Node` | The object being accessed. |
| `index` | `IndexNode` | The index used to access the object. |

**Returns:** `AccessorNode` Returns a new AccessorNode.

##### `acos(x)`

Calculate the inverse cosine of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The arc cosine of `x`.

##### `acosh(x)`

Calculate the inverse hyperbolic cosine of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse hyperbolic cosine of `x`.

##### `acot(x)`

Calculate the inverse cotangent of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse cotangent of `x`.

##### `acoth(x)`

Calculate the inverse hyperbolic cotangent of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse hyperbolic cotangent of `x`.

##### `acsc(x)`

Calculate the inverse cosecant of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse cosecant of `x`.

##### `acsch(x)`

Calculate the inverse hyperbolic cosecant of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse hyperbolic cosecant of `x`.

##### `addScalar(x, y)`

Add two scalar values, `x + y`.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex` | First value to add. |
| `y` | `number \| BigNumber \| Fraction \| Complex` | Second value to add. |

**Returns:** `number | BigNumber | Fraction | Complex` Sum of `x` and `y`.

##### `and(x, y)`

Logical AND. Returns true if both inputs are true.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `boolean \| Array \| Matrix` | First input. |
| `y` | `boolean \| Array \| Matrix` | Second input. |

**Returns:** `boolean | Array | Matrix` Returns true when both `x` and `y` are true.

##### `apply(x, dim, callback)`

Apply a function to each entry in a matrix or array.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |
| `dim` | `number` | The dimension along which to apply the function. |
| `callback` | `function` | The function to apply. |

**Returns:** `Array | Matrix` The result of applying the function along the specified dimension.

##### `arg(x)`

Calculate the argument of a complex number.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Array | Matrix` The argument of `x`.

##### `ArrayNode(items)`

An array node representing an array in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | `Array.<Node>` | An array of nodes. |

**Returns:** `ArrayNode` Returns a new ArrayNode.

##### `asec(x)`

Calculate the inverse secant of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse secant of `x`.

##### `asech(x)`

Calculate the inverse hyperbolic secant of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse hyperbolic secant of `x`.

##### `asin(x)`

Calculate the inverse sine of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse sine of `x`.

##### `asinh(x)`

Calculate the inverse hyperbolic sine of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse hyperbolic sine of `x`.

##### `AssignmentNode(object, value)`

An assignment node representing variable assignment.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `Node` | The symbol or AccessorNode to assign to. |
| `value` | `Node` | The value to assign. |

**Returns:** `AssignmentNode` Returns a new AssignmentNode.

##### `atan(x)`

Calculate the inverse tangent of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse tangent of `x`.

##### `atan2(y, x)`

Calculate the inverse tangent of `y/x`.

| Parameter | Type | Description |
| --- | --- | --- |
| `y` | `number \| BigNumber \| Array \| Matrix` | Dividend. |
| `x` | `number \| BigNumber \| Array \| Matrix` | Divisor. |

**Returns:** `number | BigNumber | Array | Matrix` The inverse tangent of `y/x`.

##### `atanh(x)`

Calculate the inverse hyperbolic tangent of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The inverse hyperbolic tangent of `x`.

##### `atomicMass`

Atomic mass constant, expressed in kg.

##### `avogadro`

Avogadro's number, approximately `6.022e23` mol<sup>-1</sup>.

##### `bellNumbers(n)`

Compute the Bell Numbers, `B(n)`.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number` | The input value. |

**Returns:** `number` Returns the nth Bell number.

##### `BigNumber(value)`

BigNumber constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| string \| BigNumber` | The numeric value. |

**Returns:** `BigNumber` Returns a new BigNumber instance.

##### `bignumber(value)`

Create a BigNumber with arbitrary precision.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| string \| BigNumber` | The numeric value. |

**Returns:** `BigNumber` Returns a BigNumber instance.

##### `bin(n)`

Format a number as binary.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number \| BigNumber` | The number to format. |

**Returns:** `string` The binary representation of `n`.

##### `bitAnd(x, y)`

Bitwise AND operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | First value. |
| `y` | `number \| BigNumber \| Array \| Matrix` | Second value. |

**Returns:** `number | BigNumber | Array | Matrix` Result of `x AND y`.

##### `bitNot(x)`

Bitwise NOT operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Array | Matrix` Result of `NOT x`.

##### `bitOr(x, y)`

Bitwise OR operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | First value. |
| `y` | `number \| BigNumber \| Array \| Matrix` | Second value. |

**Returns:** `number | BigNumber | Array | Matrix` Result of `x OR y`.

##### `bitXor(x, y)`

Bitwise XOR operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | First value. |
| `y` | `number \| BigNumber \| Array \| Matrix` | Second value. |

**Returns:** `number | BigNumber | Array | Matrix` Result of `x XOR y`.

##### `BlockNode(blocks)`

A node representing a block of statements.

| Parameter | Type | Description |
| --- | --- | --- |
| `blocks` | `Array.<Object>` | An array of statements. |

**Returns:** `BlockNode` Returns a new BlockNode.

##### `bohrMagneton`

The Bohr magneton in units of `J/T`.

##### `bohrRadius`

The Bohr radius in meters.

##### `boltzmann`

The Boltzmann constant in `J/K`.

##### `boolean(x)`

Parse a value into a boolean.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to parse. |

**Returns:** `boolean` The parsed boolean value.

##### `catalan`

The Catalan's constant.

##### `cbrt(x)`

Calculate the cube root of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The cube root of `x`.

##### `ceil(x)`

Round a value towards plus infinity.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Array | Matrix` The rounded value.

##### `chain(value)`

Create a chained operation, allowing to chain methods.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The initial value of the chain. |

**Returns:** `Chain` A chain object.

##### `Chain(value)`

Chain constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The initial value. |

**Returns:** `Chain` Returns a new Chain instance.

##### `classicalElectronRadius`

Classical electron radius in meters.

##### `combinations(n, k)`

Calculate the number of combinations of n items taken k at a time.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number \| BigNumber` | Total number of items. |
| `k` | `number \| BigNumber` | Number of items to choose. |

**Returns:** `number | BigNumber` Number of possible combinations.

##### `combinationsWithRep(n, k)`

Calculate the number of combinations with replacement of n items taken k at a time.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number \| BigNumber` | Total number of items. |
| `k` | `number \| BigNumber` | Number of items to choose. |

**Returns:** `number | BigNumber` Number of possible combinations with replacement.

##### `compare(x, y)`

Compare two values numerically.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | First value to compare. |
| `y` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | Second value to compare. |

**Returns:** `number | BigNumber | Fraction | Complex | Unit | string | Array | Matrix` Returns 1 when x > y, -1 when x < y, and 0 when x == y.

##### `compareNatural(x, y)`

Compare two strings using natural order.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `string` | First string to compare. |
| `y` | `string` | Second string to compare. |

**Returns:** `number` Returns 1 when x > y, -1 when x < y, and 0 when x == y.

##### `compareText(x, y)`

Compare two strings lexicographically.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `string` | First string to compare. |
| `y` | `string` | Second string to compare. |

**Returns:** `number` Returns 1 when x > y, -1 when x < y, and 0 when x == y.

##### `compile(expr)`

Compile an expression into a compiled function for faster evaluation.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `string \| Object` | The expression to compile. |

**Returns:** `Object` A compiled expression that can be evaluated with `eval`.

##### `complex([re], [im])`

Create a complex number.

| Parameter | Type | Description |
| --- | --- | --- |
| `re` | `number \| string \| Complex` | Real part or a string representation. Optional. |
| `im` | `number` | Imaginary part. Optional. |

**Returns:** `Complex` Returns a Complex number.

##### `Complex([re], [im])`

Complex number constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `re` | `number \| string \| Complex` | Real part or a string representation. Optional. |
| `im` | `number` | Imaginary part. Optional. |

**Returns:** `Complex` A new Complex number.

##### `composition(n, k)`

Calculate the composition count of n into k parts.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number \| BigNumber` | Total number of items. |
| `k` | `number \| BigNumber` | Number of parts. |

**Returns:** `number | BigNumber` Number of compositions.

##### `concat(a, b, [dim])`

Concatenate matrices or arrays along a specified dimension.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array \| Matrix` | First array or matrix. |
| `b` | `Array \| Matrix` | Other arrays or matrices. |
| `dim` | `number \| BigNumber` | Dimension along which to concatenate. Optional. Default: `0`. |

**Returns:** `Array | Matrix` Concatenated array or matrix.

##### `ConditionalNode(condition, trueExpr, falseExpr)`

A node representing a conditional expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `condition` | `Node` | The condition expression. |
| `trueExpr` | `Node` | Expression to evaluate when condition is true. |
| `falseExpr` | `Node` | Expression to evaluate when condition is false. |

**Returns:** `ConditionalNode` A new ConditionalNode instance.

##### `conductanceQuantum`

Conductance quantum in Siemens.

##### `conj(x)`

Compute the complex conjugate of a complex number.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The complex conjugate of x.

##### `ConstantNode(value)`

A node representing a constant value.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| string \| BigNumber \| Fraction` | The constant value. |

**Returns:** `ConstantNode` A new ConstantNode instance.

##### `cos(x)`

Calculate the cosine of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Unit \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The cosine of x.

##### `cosh(x)`

Calculate the hyperbolic cosine of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The hyperbolic cosine of x.

##### `cot(x)`

Calculate the cotangent of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Unit \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The cotangent of x.

##### `coth(x)`

Calculate the hyperbolic cotangent of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The hyperbolic cotangent of x.

##### `coulomb`

Coulomb's constant in Nm^2/C^2.

##### `count(x)`

Count the number of elements in a matrix or array.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |

**Returns:** `number` The number of elements.

##### `createUnit(name, definition, [options])`

Create a user-defined unit and register it with the Unit system.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the new unit. |
| `definition` | `string \| Object` | Definition of the unit. |
| `options` | `Object` | Configuration options. Optional. |

**Returns:** `Unit` The created unit.

##### `csc(x)`

Calculate the cosecant of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Unit \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The cosecant of x.

##### `csch(x)`

Calculate the hyperbolic cosecant of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The hyperbolic cosecant of x.

##### `ctranspose(x)`

Compute the conjugate transpose of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The matrix to transpose. |

**Returns:** `Array | Matrix` The conjugate transpose of x.

##### `cube(x)`

Compute the cube of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Unit \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Complex | Unit | Array | Matrix` The cube of x.

##### `cumsum(x, [dim])`

Compute the cumulative sum of a matrix or array.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |
| `dim` | `number \| BigNumber` | Dimension along which to calculate. Optional. |

**Returns:** `Array | Matrix` The cumulative sum.

##### `deepEqual(x, y)`

Test element-wise whether two values are equal.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | First value to compare. |
| `y` | `*` | Second value to compare. |

**Returns:** `boolean` Returns true if x and y are deep equal.

##### `DenseMatrix(data)`

Dense matrix constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array` | The data for the matrix. |

**Returns:** `DenseMatrix` A new DenseMatrix instance.

##### `derivative(expr, variable, [options])`

Take the derivative of an expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `string \| Node` | The expression to differentiate. |
| `variable` | `string \| Node` | The variable with respect to which to differentiate. |
| `options` | `Object` | Optional options object. Optional. |

**Returns:** `Node` The derivative of the expression.

##### `deuteronMass`

Deuteron mass in kilograms.

##### `diff(x, [dim])`

Calculate the differences between adjacent values in a matrix or array.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | Input array or matrix. |
| `dim` | `number` | Dimension along which to calculate the difference. Optional. Default: `0`. |

**Returns:** `Array | Matrix` The differences.

##### `divideScalar(x, y)`

Divide two scalar values, x / y.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex` | Numerator. |
| `y` | `number \| BigNumber \| Fraction \| Complex` | Denominator. |

**Returns:** `number | BigNumber | Fraction | Complex` The result of division.

##### `dotDivide(x, y)`

Divide two matrices element-wise.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | Numerator matrix. |
| `y` | `Array \| Matrix` | Denominator matrix. |

**Returns:** `Array | Matrix` The element-wise division.

##### `dotMultiply(x, y)`

Multiply two matrices element-wise.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | First matrix. |
| `y` | `Array \| Matrix` | Second matrix. |

**Returns:** `Array | Matrix` The element-wise multiplication.

##### `dotPow(x, y)`

Exponentiate two matrices element-wise.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | Base matrix. |
| `y` | `Array \| Matrix` | Exponent matrix. |

**Returns:** `Array | Matrix` The element-wise exponentiation.

##### `e`

Euler's number, the base of natural logarithms.

##### `efimovFactor`

Efimov factor.

##### `eigs(x)`

Calculate eigenvalues and eigenvectors of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | A square matrix. |

**Returns:** `Object` An object containing eigenvalues and eigenvectors.

##### `electricConstant`

Electric constant (vacuum permittivity) in F/m.

##### `electronMass`

Electron mass in kilograms.

##### `elementaryCharge`

Elementary charge in coulombs.

##### `equal(x, y)`

Test whether two values are equal.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | First value to compare. |
| `y` | `*` | Second value to compare. |

**Returns:** `boolean` Returns true if x equals y.

##### `equalScalar(x, y)`

Test whether two scalar values are equal.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex` | First value. |
| `y` | `number \| BigNumber \| Fraction \| Complex` | Second value. |

**Returns:** `boolean` Returns true if x equals y.

##### `equalText(x, y)`

Test whether two strings are equal.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `string` | First string. |
| `y` | `string` | Second string. |

**Returns:** `boolean` Returns true if x equals y.

##### `erf(x)`

Calculate the error function of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The error function evaluated at x.

##### `exp(x)`

Calculate the exponential of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Exponent. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The exponential of x.

##### `expm1(x)`

Calculate exp(x) - 1.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex` | Input value. |

**Returns:** `number | BigNumber | Complex` The result of exp(x) - 1.

##### `factorial(n)`

Calculate the factorial of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number \| BigNumber \| Array \| Matrix` | A non-negative integer. |

**Returns:** `number | BigNumber | Array | Matrix` The factorial of n.

##### `false`

Boolean value false.

##### `faraday`

Faraday constant in C/mol.

##### `fermiCoupling`

Fermi coupling constant in GeV^-2.

##### `fft(x)`

Compute the Fast Fourier Transform of a matrix or array.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | Input array or matrix. |

**Returns:** `Array | Matrix` The FFT of x.

##### `FibonacciHeap([compare])`

Fibonacci heap data structure.

| Parameter | Type | Description |
| --- | --- | --- |
| `compare` | `function` | Comparison function. Optional. |

**Returns:** `FibonacciHeap` A new FibonacciHeap instance.

##### `filter(x, test)`

Filter the items in an array or matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |
| `test` | `function` | The test function. |

**Returns:** `Array | Matrix` The filtered array or matrix.

##### `fineStructure`

Fine-structure constant.

##### `firstRadiation`

First radiation constant in Wm^2.

##### `fix(x)`

Round a value towards zero.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Array | Matrix` The rounded value.

##### `flatten(x)`

Flatten a multi-dimensional array or matrix into a single dimension.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |

**Returns:** `Array | Matrix` The flattened array or matrix.

##### `floor(x)`

Round a value towards negative infinity.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Array | Matrix` The rounded value.

##### `forEach(x, callback)`

Iterate over each element of a matrix or array.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |
| `callback` | `function` | The function to execute on each element. |

**Returns:** `void`

##### `format(value, [options])`

Format a value for display.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to format. |
| `options` | `Object \| function` | Formatting options or custom function. Optional. |

**Returns:** `string` The formatted value.

##### `fraction(numerator, [denominator])`

Create a fraction.

| Parameter | Type | Description |
| --- | --- | --- |
| `numerator` | `number \| string \| Fraction` | Numerator. |
| `denominator` | `number \| string` | Denominator. Optional. |

**Returns:** `Fraction` A new Fraction instance.

##### `Fraction(numerator, [denominator])`

Fraction constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `numerator` | `number \| string \| Fraction` | Numerator. |
| `denominator` | `number \| string` | Denominator. Optional. |

**Returns:** `Fraction` A new Fraction instance.

##### `FunctionAssignmentNode(name, params, expr)`

A node representing a function assignment in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the function being assigned. |
| `params` | `Array.<string>` | An array of parameter names. |
| `expr` | `Node` | The function expression. |

**Returns:** `FunctionAssignmentNode` A new FunctionAssignmentNode instance.

##### `FunctionNode(name, args)`

A node representing a function call in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string \| SymbolNode` | The name of the function or a SymbolNode. |
| `args` | `Array.<Node>` | An array of argument nodes. |

**Returns:** `FunctionNode` A new FunctionNode instance.

##### `gamma(n)`

Calculate the gamma function of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number \| BigNumber \| Complex \| Array \| Matrix` | The input value. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The gamma of n.

##### `gasConstant`

The molar gas constant, in units of J/(molK).

##### `gcd(args)`

Compute the greatest common divisor of two or more values.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| BigNumber \| Array \| Matrix` | Two or more integer numbers. |

**Returns:** `number | BigNumber | Array | Matrix` The greatest common divisor.

##### `getMatrixDataType(matrix)`

Get the data type of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `matrix` | `Matrix` | The input matrix. |

**Returns:** `string` The data type of the matrix elements.

##### `gravitationConstant`

Newtonian constant of gravitation, in m^3/(kg s^2).

##### `gravity`

Acceleration due to gravity on Earth, in m/s^2.

##### `hartreeEnergy`

Hartree energy, in joules.

##### `hasNumericValue(x)`

Test whether a value is a numeric value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The value to test. |

**Returns:** `boolean` Returns true if x is numeric.

##### `Help(value)`

Help object constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The function or object to get help for. |

**Returns:** `Help` A new Help instance.

##### `hex(value)`

Format a number as hexadecimal.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| BigNumber` | The value to format. |

**Returns:** `string` The hexadecimal representation.

##### `hypot(args)`

Calculate the hypotenuse of a list of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| BigNumber \| Array \| Matrix` | The input values. |

**Returns:** `number | BigNumber | Array | Matrix` The hypotenuse.

##### `i`

The imaginary unit 'i'.

##### `identity(size, [format])`

Create an identity matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `size` | `number \| Array` | The size of the matrix. |
| `format` | `string` | The matrix format. Optional. |

**Returns:** `Matrix` An identity matrix.

##### `ifft(x)`

Compute the inverse Fast Fourier Transform.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | Input array or matrix. |

**Returns:** `Array | Matrix` The inverse FFT of x.

##### `im(x)`

Get the imaginary part of a complex number.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Array | Matrix` The imaginary part of x.

##### `ImmutableDenseMatrix(data)`

Immutable dense matrix constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array` | The data for the matrix. |

**Returns:** `ImmutableDenseMatrix` A new ImmutableDenseMatrix instance.

##### `Index(ranges)`

Index constructor for matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `ranges` | `Range \| number` | Ranges or indices. |

**Returns:** `Index` A new Index instance.

##### `IndexNode(dimensions)`

A node representing an index operation in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `dimensions` | `Array.<Node>` | The indices. |

**Returns:** `IndexNode` A new IndexNode instance.

##### `intersect(a, b)`

Compute the intersection of two sets.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array \| Matrix` | First set. |
| `b` | `Array \| Matrix` | Second set. |

**Returns:** `Array | Matrix` The intersection of a and b.

##### `inverseConductanceQuantum`

Inverse conductance quantum, in ohms.

##### `invmod(a, m)`

Calculate the modular inverse of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `number \| BigNumber` | The value. |
| `m` | `number \| BigNumber` | The modulus. |

**Returns:** `number | BigNumber` The modular inverse.

##### `isInteger(x)`

Test whether a value is an integer.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber` | The value to test. |

**Returns:** `boolean` Returns true if x is an integer.

##### `isNegative(x)`

Test whether a value is negative.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber` | The value to test. |

**Returns:** `boolean` Returns true if x is negative.

##### `isPositive(x)`

Test whether a value is positive.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber` | The value to test. |

**Returns:** `boolean` Returns true if x is positive.

##### `isPrime(x)`

Test whether a number is prime.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber` | The value to test. |

**Returns:** `boolean` Returns true if x is prime.

##### `isZero(x)`

Test whether a value is zero.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber` | The value to test. |

**Returns:** `boolean` Returns true if x is zero.

##### `kldivergence(p, q)`

Calculate the Kullback-Leibler divergence between two distributions.

| Parameter | Type | Description |
| --- | --- | --- |
| `p` | `Array \| Matrix` | First probability distribution. |
| `q` | `Array \| Matrix` | Second probability distribution. |

**Returns:** `number` The KL divergence D<sub>KL</sub>(p || q).

##### `klitzing`

Von Klitzing constant, in ohms.

##### `kron(A, B)`

Compute the Kronecker product of two matrices.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array \| Matrix` | First matrix. |
| `B` | `Array \| Matrix` | Second matrix. |

**Returns:** `Matrix` The Kronecker product of A and B.

##### `LN10`

Natural logarithm of 10.

##### `LN2`

Natural logarithm of 2.

##### `LOG10E`

Base 10 logarithm of e.

##### `LOG2E`

Base 2 logarithm of e.

##### `larger(x, y)`

Test whether value x is larger than y.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | First value. |
| `y` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | Second value. |

**Returns:** `boolean | Array | Matrix` Returns true if x > y.

##### `largerEq(x, y)`

Test whether value x is larger than or equal to y.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | First value. |
| `y` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | Second value. |

**Returns:** `boolean | Array | Matrix` Returns true if x >= y.

##### `lcm(args)`

Compute the least common multiple of two or more values.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| BigNumber \| Array \| Matrix` | Two or more integer numbers. |

**Returns:** `number | BigNumber | Array | Matrix` The least common multiple.

##### `leafCount(node)`

Count the number of leaf nodes in an expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `node` | `Node` | The root node of the expression tree. |

**Returns:** `number` The number of leaf nodes.

##### `leftShift(x, y)`

Bitwise left shift operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | Value to be shifted. |
| `y` | `number \| BigNumber \| Array \| Matrix` | Amount of bits to shift. |

**Returns:** `number | BigNumber | Array | Matrix` The shifted value.

##### `lgamma(n)`

Compute the natural logarithm of the gamma function.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number` | The input value. |

**Returns:** `number` The natural logarithm of the gamma function at n.

##### `log(x, [base])`

Calculate the natural logarithm of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Value for which to calculate the logarithm. |
| `base` | `number \| BigNumber \| Complex` | Base of the logarithm. Optional. Default: `e`. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The logarithm of x.

##### `log10(x)`

Calculate the base-10 logarithm of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Value for which to calculate the logarithm. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The base-10 logarithm of x.

##### `log1p(x)`

Calculate the natural logarithm of 1 plus a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber` | Input value. |

**Returns:** `number | BigNumber` The result of log(1 + x).

##### `log2(x)`

Calculate the base-2 logarithm of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Value for which to calculate the logarithm. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The base-2 logarithm of x.

##### `loschmidt`

Loschmidt constant at 0°C and 1 atm, in m^-3.

##### `lsolve(L, b)`

Solve a linear system A * x = b where A is a lower triangular matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `L` | `Matrix \| Array` | A lower triangular matrix. |
| `b` | `Matrix \| Array` | A column vector. |

**Returns:** `Matrix | Array` The solution vector x.

##### `lsolveAll(L, b)`

Find all solutions of a linear system A * x = b where A is a lower triangular matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `L` | `Matrix \| Array` | A lower triangular matrix. |
| `b` | `Matrix \| Array` | A column vector. |

**Returns:** `Array` An array of solutions.

##### `lup(A, [threshold])`

Compute the LU decomposition with partial pivoting.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Matrix \| Array` | A square matrix. |
| `threshold` | `number` | Tolerance threshold. Optional. Default: `1e-10`. |

**Returns:** `Object` An object containing L, U, and P matrices.

##### `lusolve(A, b, [order])`

Solve a linear system using LU decomposition.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Matrix \| Array` | Coefficient matrix. |
| `b` | `Matrix \| Array` | Right-hand side vector or matrix. |
| `order` | `string` | Matrix storage order. Optional. |

**Returns:** `Matrix | Array` The solution vector or matrix.

##### `lyap(A, Q)`

Solve the Lyapunov equation A*X + X*A' = Q.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Matrix \| Array` | A square matrix. |
| `Q` | `Matrix \| Array` | A square matrix. |

**Returns:** `Matrix` Solution X of the Lyapunov equation.

##### `mad(array, [dim])`

Compute the median absolute deviation of a set of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array \| Matrix` | Input array. |
| `dim` | `number \| BigNumber` | Dimension along which to compute. Optional. |

**Returns:** `number | BigNumber | Array | Matrix` The median absolute deviation.

##### `magneticConstant`

Magnetic constant (vacuum permeability), in N/A^2.

##### `magneticFluxQuantum`

Magnetic flux quantum, in Wb.

##### `map(x, callback)`

Map a function over the elements of a matrix or array.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |
| `callback` | `function` | The function to apply. |

**Returns:** `Array | Matrix` The result after applying the callback.

##### `matrix([data], [format])`

Create a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array \| Matrix` | The data for the matrix. Optional. |
| `format` | `string` | The matrix format. Optional. |

**Returns:** `Matrix` A new Matrix instance.

##### `Matrix([data], [format])`

Matrix constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array \| Matrix` | The data for the matrix. Optional. |
| `format` | `string` | The matrix format. Optional. |

**Returns:** `Matrix` A new Matrix instance.

##### `matrixFromColumns(columns)`

Create a matrix from given columns.

| Parameter | Type | Description |
| --- | --- | --- |
| `columns` | `Array \| Matrix` | Columns to construct the matrix. |

**Returns:** `Matrix` The constructed matrix.

##### `matrixFromFunction(size, callback)`

Create a matrix using a provided function.

| Parameter | Type | Description |
| --- | --- | --- |
| `size` | `Array` | The size of the matrix. |
| `callback` | `function` | Function to generate matrix entries. |

**Returns:** `Matrix` The generated matrix.

##### `matrixFromRows(rows)`

Create a matrix from given rows.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows` | `Array \| Matrix` | Rows to construct the matrix. |

**Returns:** `Matrix` The constructed matrix.

##### `mean(array, [dim])`

Compute the arithmetic mean of a set of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array \| Matrix` | Input array. |
| `dim` | `number \| BigNumber` | Dimension along which to compute. Optional. |

**Returns:** `number | BigNumber | Array | Matrix` The mean value.

##### `median(array, [dim])`

Compute the median of a set of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array \| Matrix` | Input array. |
| `dim` | `number \| BigNumber` | Dimension along which to compute. Optional. |

**Returns:** `number | BigNumber | Array | Matrix` The median value.

##### `mod(x, y)`

Calculate the modulus of two numbers.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | Dividend. |
| `y` | `number \| BigNumber \| Array \| Matrix` | Divisor. |

**Returns:** `number | BigNumber | Array | Matrix` The remainder after division.

##### `mode(array)`

Compute the mode of a set of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array \| Matrix` | Input array. |

**Returns:** `Array | Matrix` The mode(s) of the array.

##### `molarMass`

Molar mass constant, in kg/mol.

##### `molarMassC12`

Molar mass of carbon-12, in kg/mol.

##### `molarPlanckConstant`

Molar Planck constant, in J·s/mol.

##### `molarVolume`

Molar volume of an ideal gas at 1 atm and 0°C, in m³/mol.

##### `multinomial(args)`

Compute the multinomial coefficient of a list of integers.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `number \| Array` | Integer numbers. |

**Returns:** `number` The multinomial coefficient.

##### `multiplyScalar(x, y)`

Multiply two scalar values, x * y.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex` | First value. |
| `y` | `number \| BigNumber \| Fraction \| Complex` | Second value. |

**Returns:** `number | BigNumber | Fraction | Complex` The product of x and y.

##### `neutronMass`

Neutron mass, in kilograms.

##### `not(x)`

Logical NOT operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `boolean \| Array \| Matrix` | Input value. |

**Returns:** `boolean | Array | Matrix` The logical negation of x.

##### `nthRoot(a, [root])`

Calculate the nth root of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `number \| BigNumber \| Complex \| Array \| Matrix` | The value. |
| `root` | `number \| BigNumber` | The root. Optional. Default: `2`. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` The nth root of a.

##### `nthRoots(a, n)`

Calculate the nth roots of a complex number.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `number \| Complex` | The value. |
| `n` | `number \| BigNumber` | The degree of the root. |

**Returns:** `Array` An array of the n roots.

##### `nuclearMagneton`

Nuclear magneton, in J/T.

##### `null`

JavaScript null value.

##### `number(value)`

Parse a value into a number.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to parse. |

**Returns:** `number` The numeric value.

##### `numeric(value)`

Convert a math.js data type to a numeric type.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to convert. |

**Returns:** `number | BigNumber | Complex` The numeric representation.

##### `ObjectNode(properties)`

A node representing an object in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `properties` | `Object` | Object properties as nodes. |

**Returns:** `ObjectNode` A new ObjectNode instance.

##### `oct(value)`

Format a number as octal.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| BigNumber` | The value to format. |

**Returns:** `string` The octal representation.

##### `OperatorNode(op, fn, args, [implicit])`

A node representing an operator in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `op` | `string` | The operator symbol. |
| `fn` | `string` | The function name. |
| `args` | `Array.<Node>` | An array of argument nodes. |
| `implicit` | `boolean` | Is the operator implicit? Optional. Default: `false`. |

**Returns:** `OperatorNode` A new OperatorNode instance.

##### `or(x, y)`

Logical OR operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `boolean \| Array \| Matrix` | First value. |
| `y` | `boolean \| Array \| Matrix` | Second value. |

**Returns:** `boolean | Array | Matrix` The logical OR of x and y.

##### `ParenthesisNode(content)`

A node representing parentheses in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `content` | `Node` | The node encapsulated by the parentheses. |

**Returns:** `ParenthesisNode` A new ParenthesisNode instance.

##### `parse(expr)`

Parse and evaluate an expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `string \| Object` | The expression to parse. |

**Returns:** `Node | Array.<Node>` The parsed expression node(s).

##### `parser()`

Create a parser with its own scope and functions.

**Returns:** `Parser` A new Parser instance.

##### `Parser()`

Parser constructor.

**Returns:** `Parser` A new Parser instance.

##### `partitionSelect(x, k, [compare])`

Select an element from a matrix or array based on its sorted position.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |
| `k` | `number` | The kth smallest value to select. |
| `compare` | `function` | Optional comparison function. Optional. |

**Returns:** `number | BigNumber | Fraction | Complex` The selected element.

##### `permutations(n, [k])`

Calculate the number of permutations of n items taken k at a time.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number \| BigNumber` | Total number of items. |
| `k` | `number \| BigNumber` | Number of items to choose. Optional. |

**Returns:** `number | BigNumber` Number of possible permutations.

##### `phi`

The golden ratio, approximately 1.618.

##### `pi`

The mathematical constant pi.

##### `pickRandom(array, [number])`

Randomly pick one or more values from a list.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array` | Array to pick values from. |
| `number` | `number` | Number of values to pick. Optional. |

**Returns:** `* | Array` Picked value(s).

##### `pinv(x)`

Compute the pseudoinverse of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | A matrix. |

**Returns:** `Matrix` The pseudoinverse of x.

##### `planckCharge`

Planck charge, in coulombs.

##### `planckConstant`

Planck constant, in joule seconds.

##### `planckLength`

Planck length, in meters.

##### `planckMass`

Planck mass, in kilograms.

##### `planckTemperature`

Planck temperature, in kelvin.

##### `planckTime`

Planck time, in seconds.

##### `polynomialRoot(coefficients)`

Find roots of a univariate polynomial.

| Parameter | Type | Description |
| --- | --- | --- |
| `coefficients` | `Array` | Coefficients of the polynomial. |

**Returns:** `Array` An array of roots.

##### `pow(x, y)`

Calculate the power of x to y, x^y.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Base. |
| `y` | `number \| BigNumber \| Complex \| Array \| Matrix` | Exponent. |

**Returns:** `number | BigNumber | Complex | Array | Matrix` x raised to the power y.

##### `prod(array, [dim])`

Compute the product of a set of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array \| Matrix` | Input array. |
| `dim` | `number \| BigNumber` | Dimension along which to compute the product. Optional. |

**Returns:** `number | BigNumber | Array | Matrix` The product of all values.

##### `protonMass`

Proton mass, in kilograms.

##### `qr(x)`

Compute the QR decomposition of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Matrix \| Array` | A matrix. |

**Returns:** `Object` An object containing Q and R matrices.

##### `quantileSeq(data, prob, [sorted])`

Compute the quantile of a sequence.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array \| Matrix` | Input data. |
| `prob` | `number \| Array` | Probability or array of probabilities. |
| `sorted` | `boolean` | Is data sorted? Optional. Default: `false`. |

**Returns:** `number | Array` The quantile(s).

##### `quantumOfCirculation`

Quantum of circulation, in m^2/s.

##### `randomInt([min], max)`

Generate a random integer between min and max.

| Parameter | Type | Description |
| --- | --- | --- |
| `min` | `number \| BigNumber` | Minimum value, inclusive. Optional. |
| `max` | `number \| BigNumber` | Maximum value, inclusive. |

**Returns:** `number | BigNumber` A random integer.

##### `Range(start, end, [step])`

Create a range.

| Parameter | Type | Description |
| --- | --- | --- |
| `start` | `*` | Start of the range. |
| `end` | `*` | End of the range. |
| `step` | `*` | Step size. Optional. Default: `1`. |

**Returns:** `Range` A new Range instance.

##### `RangeNode(start, end, [step])`

A node representing a range in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `start` | `Node` | Start node. |
| `end` | `Node` | End node. |
| `step` | `Node` | Step node. Optional. |

**Returns:** `RangeNode` A new RangeNode instance.

##### `rationalize(expr, [scope], [options])`

Rationalize an expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `string \| Node` | The expression to rationalize. |
| `scope` | `Object` | Scope of variables. Optional. |
| `options` | `Object` | Options object. Optional. |

**Returns:** `Object` An object with expression and denominator.

##### `re(x)`

Get the real part of a complex number.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Array | Matrix` The real part of x.

##### `reducedPlanckConstant`

Reduced Planck constant, in joule seconds.

##### `RelationalNode(condition, params)`

A node representing a relational operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `condition` | `string` | Relational condition. |
| `params` | `Node` | Parameters. |

**Returns:** `RelationalNode` A new RelationalNode instance.

##### `replacer(key, value)`

Replacer function for JSON serialization.

| Parameter | Type | Description |
| --- | --- | --- |
| `key` | `string` | Property name. |
| `value` | `*` | Property value. |

**Returns:** `*` The transformed value.

##### `resize(x, size, [defaultValue])`

Resize a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input matrix. |
| `size` | `Array` | The new size. |
| `defaultValue` | `*` | Default value for new entries. Optional. Default: `0`. |

**Returns:** `Array | Matrix` The resized matrix.

##### `resolve(name)`

Resolve the value of a symbol or function.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name to resolve. |

**Returns:** `*` The resolved value.

##### `ResultSet(entries)`

ResultSet constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `entries` | `Array` | The entries in the result set. |

**Returns:** `ResultSet` A new ResultSet instance.

##### `reviver(key, value)`

Reviver function for JSON deserialization.

| Parameter | Type | Description |
| --- | --- | --- |
| `key` | `string` | Property name. |
| `value` | `*` | Property value. |

**Returns:** `*` The transformed value.

##### `rightArithShift(x, y)`

Bitwise right arithmetic shift operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | The value to shift. |
| `y` | `number \| BigNumber \| Array \| Matrix` | The amount to shift. |

**Returns:** `number | BigNumber | Array | Matrix` The shifted value.

##### `rightLogShift(x, y)`

Bitwise right logical shift operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Array \| Matrix` | The value to shift. |
| `y` | `number \| BigNumber \| Array \| Matrix` | The amount to shift. |

**Returns:** `number | BigNumber | Array | Matrix` The shifted value.

##### `rotate(x, [turns])`

Rotate the elements of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input matrix. |
| `turns` | `number \| BigNumber` | Number of 90-degree rotations. Optional. Default: `1`. |

**Returns:** `Array | Matrix` The rotated matrix.

##### `rotationMatrix(theta)`

Create a 2D rotation matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `theta` | `number \| BigNumber` | Rotation angle in radians. |

**Returns:** `Matrix` The rotation matrix.

##### `rydberg`

Rydberg constant, in m^-1.

##### `SQRT1_2`

Square root of 1/2.

##### `SQRT2`

Square root of 2.

##### `sackurTetrode`

Sackur-Tetrode constant at 1 atm, in J/K.

##### `schur(A)`

Compute the Schur decomposition of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Matrix \| Array` | A square matrix. |

**Returns:** `Object` An object containing matrices U and T.

##### `sec(x)`

Calculate the secant of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Unit \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The secant of x.

##### `sech(x)`

Calculate the hyperbolic secant of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The hyperbolic secant of x.

##### `secondRadiation`

Second radiation constant, in m·K.

##### `setCartesian(sets)`

Create the Cartesian product of two or more sets.

| Parameter | Type | Description |
| --- | --- | --- |
| `sets` | `Array \| Matrix` | The sets to compute the product of. |

**Returns:** `Array | Matrix` The Cartesian product.

##### `setDifference(a, b)`

Compute the difference between two sets.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array \| Matrix` | First set. |
| `b` | `Array \| Matrix` | Second set. |

**Returns:** `Array | Matrix` The difference a \ b.

##### `setDistinct(a)`

Remove duplicate elements from a set.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array \| Matrix` | Input set. |

**Returns:** `Array | Matrix` A set with distinct elements.

##### `setIntersect(a, b, [others])`

Compute the intersection of two or more sets.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array \| Matrix` | First set. |
| `b` | `Array \| Matrix` | Second set. |
| `others` | `Array \| Matrix` | Additional sets. Optional. |

**Returns:** `Array | Matrix` The intersection of the sets.

##### `setIsSubset(a, b)`

Test whether a set is a subset of another set.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array \| Matrix` | Potential subset. |
| `b` | `Array \| Matrix` | Superset. |

**Returns:** `boolean` Returns true if a is a subset of b.

##### `setMultiplicity(e, multiset)`

Count the multiplicity of an element in a multiset.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | `*` | Element to count. |
| `multiset` | `Array \| Matrix` | The multiset. |

**Returns:** `number` The multiplicity of e.

##### `setPowerset(set)`

Compute the power set of a set.

| Parameter | Type | Description |
| --- | --- | --- |
| `set` | `Array \| Matrix` | The input set. |

**Returns:** `Array | Matrix` The power set.

##### `setSize(set)`

Get the size of a set.

| Parameter | Type | Description |
| --- | --- | --- |
| `set` | `Array \| Matrix` | The input set. |

**Returns:** `number` The number of elements.

##### `setSymDifference(a, b)`

Compute the symmetric difference of two sets.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array \| Matrix` | First set. |
| `b` | `Array \| Matrix` | Second set. |

**Returns:** `Array | Matrix` The symmetric difference.

##### `setUnion(a, b, [others])`

Compute the union of two or more sets.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `Array \| Matrix` | First set. |
| `b` | `Array \| Matrix` | Second set. |
| `others` | `Array \| Matrix` | Additional sets. Optional. |

**Returns:** `Array | Matrix` The union of the sets.

##### `sign(x)`

Compute the sign of a number.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Fraction | Complex | Array | Matrix` The sign of x.

##### `simplify(expr, [rules], [scope])`

Simplify an expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `string \| Node` | The expression to simplify. |
| `rules` | `Object \| Array \| function` | Simplification rules. Optional. |
| `scope` | `Object` | Scope for variables. Optional. |

**Returns:** `Node` The simplified expression.

##### `simplifyConstant(expr, [options])`

Simplify an expression containing constants.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `Node` | The expression to simplify. |
| `options` | `Object` | Simplification options. Optional. |

**Returns:** `Node` The simplified expression.

##### `simplifyCore(expr)`

Perform core simplifications on an expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `Node` | The expression to simplify. |

**Returns:** `Node` The simplified expression.

##### `sin(x)`

Calculate the sine of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Unit \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The sine of x.

##### `sinh(x)`

Calculate the hyperbolic sine of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The hyperbolic sine of x.

##### `slu(A, order, threshold)`

Sparse Linear Solver using LU decomposition.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Matrix \| Array` | A sparse matrix. |
| `order` | `number` | Ordering and analysis control parameter. |
| `threshold` | `number` | Partial pivoting threshold. |

**Returns:** `Object` The LU decomposition.

##### `smaller(x, y)`

Test whether value x is smaller than y.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | First value. |
| `y` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | Second value. |

**Returns:** `boolean | Array | Matrix` Returns true if x < y.

##### `smallerEq(x, y)`

Test whether value x is smaller than or equal to y.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | First value. |
| `y` | `number \| BigNumber \| Fraction \| Complex \| Unit \| string \| Array \| Matrix` | Second value. |

**Returns:** `boolean | Array | Matrix` Returns true if x <= y.

##### `Spa(A)`

Compute the Sparse LU decomposition of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Matrix \| Array` | A sparse matrix. |

**Returns:** `Object` The LU decomposition.

##### `sparse([data], [datatype])`

Create a sparse matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array \| Matrix` | The data for the matrix. Optional. |
| `datatype` | `string` | The data type. Optional. |

**Returns:** `SparseMatrix` A new SparseMatrix instance.

##### `SparseMatrix([data])`

Sparse matrix constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Object` | The data for the matrix. Optional. |

**Returns:** `SparseMatrix` A new SparseMatrix instance.

##### `speedOfLight`

Speed of light in vacuum, in m/s.

##### `splitUnit(unit, parts)`

Split a unit into its numeric value and unit string.

| Parameter | Type | Description |
| --- | --- | --- |
| `unit` | `Unit` | The unit to split. |
| `parts` | `Array` | Array of units to split into. |

**Returns:** `Array` Array of units.

##### `sqrt(x)`

Calculate the square root of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Unit \| Array \| Matrix` | Value for which to calculate the square root. |

**Returns:** `number | BigNumber | Complex | Unit | Array | Matrix` The square root of x.

##### `sqrtm(x)`

Calculate the principal square root of a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | A square matrix. |

**Returns:** `Matrix` The principal square root of x.

##### `square(x)`

Compute the square of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Complex \| Unit \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Complex | Unit | Array | Matrix` The square of x.

##### `squeeze(x)`

Remove singleton dimensions from an array or matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input array or matrix. |

**Returns:** `Array | Matrix` The squeezed array or matrix.

##### `std(array, [normalization], [dim])`

Compute the standard deviation of a set of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array \| Matrix` | Input array. |
| `normalization` | `string` | Normalization mode. Optional. Default: `'unbiased'`. |
| `dim` | `number \| BigNumber` | Dimension along which to compute. Optional. |

**Returns:** `number | BigNumber | Array | Matrix` The standard deviation.

##### `stefanBoltzmann`

Stefan-Boltzmann constant, in W/(m^2K^4).

##### `stirlingS2(n, k)`

Stirling numbers of the second kind.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number \| BigNumber` | Total number of objects. |
| `k` | `number \| BigNumber` | Number of non-empty subsets. |

**Returns:** `number | BigNumber` The Stirling number.

##### `string(value)`

Parse a value into a string.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `*` | The value to convert. |

**Returns:** `string` The string representation of value.

##### `subset(x, index, [replacement], [defaultValue])`

Get or set a subset of a matrix or array.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Array \| Matrix` | The input matrix. |
| `index` | `Index` | The index. |
| `replacement` | `*` | The replacement value. Optional. |
| `defaultValue` | `boolean` | Default value for missing entries. Optional. |

**Returns:** `*` The subset or updated matrix.

##### `sylvester(A, B, C)`

Solve the Sylvester equation A*X + X*B = C.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Matrix \| Array` | A square matrix. |
| `B` | `Matrix \| Array` | A square matrix. |
| `C` | `Matrix \| Array` | A matrix. |

**Returns:** `Matrix` Solution X of the Sylvester equation.

##### `SymbolNode(name)`

A node representing a symbol in the expression tree.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The symbol name. |

**Returns:** `SymbolNode` A new SymbolNode instance.

##### `symbolicEqual(expr1, expr2, [options])`

Test whether two expressions are symbolically equal.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr1` | `Node` | First expression. |
| `expr2` | `Node` | Second expression. |
| `options` | `Object` | Comparison options. Optional. |

**Returns:** `boolean` Returns true if expressions are symbolically equal.

##### `tan(x)`

Calculate the tangent of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Unit \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The tangent of x.

##### `tanh(x)`

Calculate the hyperbolic tangent of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| Complex \| Array \| Matrix` | Function input. |

**Returns:** `number | Complex | Array | Matrix` The hyperbolic tangent of x.

##### `tau`

The constant tau, equal to 2pi.

##### `thomsonCrossSection`

Thomson cross section, in m^2.

##### `to(x, unit)`

Convert a unit to another unit.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `Unit` | The unit to be converted. |
| `unit` | `Unit \| string` | Target unit. |

**Returns:** `Unit` The converted unit.

##### `true`

Boolean value true.

##### `typeOf(x)`

Get the type of a variable.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | The variable. |

**Returns:** `string` The type of x.

##### `typed(name, signatures)`

Create a typed-function.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | Function name. |
| `signatures` | `Object` | Function signatures. |

**Returns:** `function` The typed function.

##### `unaryMinus(x)`

Invert the sign of a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex \| Unit \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Fraction | Complex | Unit | Array | Matrix` The negated value.

##### `unaryPlus(x)`

Unary plus operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number \| BigNumber \| Fraction \| Complex \| Unit \| Array \| Matrix` | Input value. |

**Returns:** `number | BigNumber | Fraction | Complex | Unit | Array | Matrix` The input value.

##### `unequal(x, y)`

Test whether two values are unequal.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `*` | First value. |
| `y` | `*` | Second value. |

**Returns:** `boolean | Array | Matrix` Returns true if x is not equal to y.

##### `Unit(value, unit)`

Unit constructor.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| BigNumber` | The numeric value. |
| `unit` | `string \| Unit` | The unit string or Unit object. |

**Returns:** `Unit` A new Unit instance.

##### `unit(value, unit)`

Create a unit.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| BigNumber` | The numeric value. |
| `unit` | `string \| Unit` | The unit string or Unit object. |

**Returns:** `Unit` A new Unit instance.

##### `E`

The base of natural logarithms, e.

##### `PI`

The mathematical constant pi.

##### `usolve(U, b)`

Solve a linear system A * x = b where A is an upper triangular matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `U` | `Matrix \| Array` | An upper triangular matrix. |
| `b` | `Matrix \| Array` | A column vector. |

**Returns:** `Matrix | Array` The solution vector x.

##### `usolveAll(U, b)`

Find all solutions of a linear system A * x = b where A is an upper triangular matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `U` | `Matrix \| Array` | An upper triangular matrix. |
| `b` | `Matrix \| Array` | A column vector. |

**Returns:** `Array` An array of solutions.

##### `vacuumImpedance`

Vacuum impedance, in ohms.

##### `variance(array, [normalization], [dim])`

Compute the variance of a set of values.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `Array \| Matrix` | Input array. |
| `normalization` | `string` | Normalization mode. Optional. Default: `'unbiased'`. |
| `dim` | `number \| BigNumber` | Dimension along which to compute. Optional. |

**Returns:** `number | BigNumber | Array | Matrix` The variance.

##### `weakMixingAngle`

Weak mixing angle.

##### `wienDisplacement`

Wien displacement constant, in m·K.

##### `xgcd(a, b)`

Extended greatest common divisor for integers.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `number \| BigNumber` | An integer. |
| `b` | `number \| BigNumber` | An integer. |

**Returns:** `Array` An array [gcd, x, y] satisfying gcd = a*x + b*y.

##### `xor(x, y)`

Logical XOR operation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `boolean \| Array \| Matrix` | First value. |
| `y` | `boolean \| Array \| Matrix` | Second value. |

**Returns:** `boolean | Array | Matrix` The logical XOR of x and y.

##### `ArgumentsError(fn, count, min, [max])`

Error thrown when an incorrect number of arguments is passed.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `string` | Function name. |
| `count` | `number` | Actual argument count. |
| `min` | `number` | Minimum required arguments. |
| `max` | `number` | Maximum allowed arguments. Optional. |

**Returns:** `ArgumentsError` A new ArgumentsError instance.

##### `DimensionError(actual, expected, [relation])`

Error thrown when matrix dimensions mismatch.

| Parameter | Type | Description |
| --- | --- | --- |
| `actual` | `number` | Actual dimension. |
| `expected` | `number` | Expected dimension. |
| `relation` | `string` | Relation between dimensions. Optional. |

**Returns:** `DimensionError` A new DimensionError instance.

##### `IndexError(index, min, max)`

Error thrown when an index is out of range.

| Parameter | Type | Description |
| --- | --- | --- |
| `index` | `number` | The invalid index. |
| `min` | `number` | Minimum allowed index. |
| `max` | `number` | Maximum allowed index. |

**Returns:** `IndexError` A new IndexError instance.

#### rcmiga

##### `run()`

Executes the optimization process.

##### `checkInputs()`

Validates the input parameters and options.

##### `creationFcn()`

Creates the initial population.

##### `selectionFcn()`

Selects individuals from the population.

##### `crossoverFcn()`

Performs crossover between selected parents.

##### `mutationFcn()`

Mutates individuals in the population.

##### `createPlotFcn()`

Initializes the plotting function.

##### `plotFcn()`

Updates the graphical plot with current optimization status.

##### `displayPlot()`

Renders the optimization plot.

##### `buttonCallback()`

Handles button events to stop the optimization process.

##### `outputFcn()`

Manages the output display based on configuration.

##### `displayOutput()`

Displays the current state of optimization.

##### `creationMixedUniform()`

Creates the initial population with mixed uniform distribution.

##### `binaryTournamentSelection()`

Performs binary tournament selection of parents.

##### `laplaceMixedCrossover()`

Executes Laplace mixed crossover to generate offspring.

##### `powerMixedMutation()`

Applies power mixed mutation to selected individuals.

##### `gaussianMutation()`

Applies Gaussian mutation to selected individuals.

##### `integerRestriction()`

Ensures integer constraints are met for specific variables.

##### `checkBounds()`

Checks and enforces variable bounds within the population.

##### `stoppingCriteria()`

Evaluates whether stopping criteria have been met.

**Returns:** `number` Code indicating the reason to stop or continue.

##### `initPopulation()`

Initializes the population for the optimization process.

##### `initState()`

Initializes the internal state of the algorithm.

##### `updateState()`

Updates the current state of the algorithm based on evaluations.

##### `updatePenalty()`

Updates penalty values based on constraint violations.

##### `evalFitnessFcn()`

Evaluates the fitness function for the current population.

##### `evalConstraintsFcn()`

Evaluates constraint functions for the current population.

##### `normConstraintsFcn()`

Normalizes constraint values to maintain consistent scaling.

#### space_search

#### boundary_follow_2d

##### `resetLogs([keepCache])`

Resets logging and optionally clears the feasibility cache.

| Parameter | Type | Description |
| --- | --- | --- |
| `keepCache` | `boolean` |  Optional. Default: `false`. |

##### `trace(dx, dy, [ambiguous])`

Main entry (2D).

| Parameter | Type | Description |
| --- | --- | --- |
| `dx` | `number` |  |
| `dy` | `number` |  |
| `ambiguous` | `string` |  Optional. Default: `this.opts.ambiguous`. |

**Returns:** `Object` - Result object (diagnostics + closed flag).

#### boundary_follow_3d

##### `resetLogs([keepCache])`

Resets logging and optionally clears the feasibility cache.

| Parameter | Type | Description |
| --- | --- | --- |
| `keepCache` | `boolean` | If true, keeps the feasibility cache; otherwise cache is cleared. Optional. Default: `false`. |

**Returns:** `void` No return value.

##### `trace(dx, dy, dz)`

Main entry (3D).

| Parameter | Type | Description |
| --- | --- | --- |
| `dx` | `number` | Fine grid spacing in X (must be >0). |
| `dy` | `number` | Fine grid spacing in Y (must be >0). |
| `dz` | `number` | Fine grid spacing in Z (must be >0). |

**Returns:** `Object` Result object:
  - dim: 3
  - closed: true if the mixed-voxel component does not touch bbox boundary; false otherwise
  - touchesBoundary: true if flood-fill hit voxel-grid boundary; false otherwise
  - surfaceCells: number of mixed voxels visited (surface voxel count)
  - evalCount: total feasibility evaluations performed
  - N: [feasible_points,infeasible_points], each is an array of [x,y,z]
  - grid: {dx,dy,dz,nx,ny,nz} fine grid diagnostics
  - seed: coarse seed edge diagnostics (used steps + endpoints + orientation)
  - fineBracket: refined fine flip bracket used to start flood-fill
  - startVoxel: voxel indices used as flood-fill start

#### map

##### `createWindow()`

Opens a window with Leaflet and initializes the map.

**Returns:** `Promise.<void>`

##### `setCenter(lat, lon)`

Sets the center of the map to the specified latitude and longitude.
This will update the internal state and move the Leaflet map if it is ready.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat` | `number` | Latitude. |
| `lon` | `number` | Longitude. |

##### `setZoom(zoom)`

Sets the zoom level of the map.
This will update the internal state and adjust the Leaflet map if it is ready.

| Parameter | Type | Description |
| --- | --- | --- |
| `zoom` | `number` | The zoom level. |

##### `addMarker(lat, lon)`

Adds a marker to the map at the specified latitude and longitude.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat` | `number` | Latitude. |
| `lon` | `number` | Longitude. |

**Returns:** `PRDC_JSLAB_GEOGRAPHY_MAP_MARKER | null` - The marker instance or null if map is not ready.

#### map_3d

##### `createWindow()`

Opens a window with Cesium and initializes 3D map.

**Returns:** `Promise.<void>`

##### `setView(lat, lon, height, [heading], [pitch])`

Sets the camera view to the specified latitude, longitude, and height.

| Parameter | Type | Description |
| --- | --- | --- |
| `lat` | `number` | Latitude. |
| `lon` | `number` | Longitude. |
| `height` | `number` | Height in meters. |
| `heading` | `number` | Heading in degrees. Optional. Default: `0`. |
| `pitch` | `number` | Pitch in degrees. Optional. Default: `-30`. |

##### `addEntity(data)`

Adds a new entity to the 3D map.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Object` | The data representing the entity to add. |

**Returns:** `PRDC_JSLAB_GEOGRAPHY_MAP_3D_ENTITY` The newly created map entity.

##### `removeAllEntities()`

Removes all entities from the 3D map viewer.

##### `flyTo(entity)`

Animates the camera to fly to the specified entity.

| Parameter | Type | Description |
| --- | --- | --- |
| `entity` | `Object` | The entity to fly to. |

#### Gamepad

##### `setOnData(callback)`

Sets the callback function to handle incoming gamepad data.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | Function to execute when data is received. |

##### `setOnConnect(callback)`

Sets the callback function for gamepad connection events.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | Function to execute on connection. |

##### `setOnDisconnect(callback)`

Sets the callback function for gamepad disconnection events.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `function` | Function to execute on disconnection. |

##### `close()`

Cleans up the gamepad instance and stops data reading.

### Libraries

#### parallel

##### `getProcessorsNum()`

Retrieves the number of logical processors available.

**Returns:** `number` Number of processors.

##### `workerFunction([context], work_function_str, [setup_function_str])`

Generates the worker's internal script.

| Parameter | Type | Description |
| --- | --- | --- |
| `context` | `Object` | Optional context to pass to the work_function. Optional. Default: `{}`. |
| `work_function_str` | `function \| String` | The work function to execute. |
| `setup_function_str` | `function \| String` | Optional setup function to execute on init. Optional. |

##### `init(num_workers, [context], [setup_function_str])`

Initializes the worker pool with the specified number of workers.

| Parameter | Type | Description |
| --- | --- | --- |
| `num_workers` | `number` | Number of workers to initialize. |
| `context` | `Object` | Optional context to pass to the work_function. Optional. Default: `{}`. |
| `setup_function_str` | `function \| String` | Optional setup function to execute on init. Optional. |

##### `assignTasksToWorkers()`

Assigns tasks from the queue to available workers.

##### `run(context, [setup_function], args, work_function, reset_workers)`

Enqueues a task to be executed by the worker pool.

| Parameter | Type | Description |
| --- | --- | --- |
| `context` | `Object` | Context variables to assign in the worker. |
| `setup_function` | `function \| String` | Optional setup function to execute on init. Optional. Default: `null`. |
| `args` | `Array` | Arguments to pass to the work_function. |
| `work_function` | `function \| String` | The work function to execute. |
| `reset_workers` | `boolean` | Wether to reset all workers or not. Default: `false`. |

**Returns:** `Promise` - Resolves with the result of the work_function.

##### `parfor(start, end, [step], [num_workers], [context], [setup_function], work_function, reset_workers)`

Executes a parallel for loop by dividing the iteration range among workers.

| Parameter | Type | Description |
| --- | --- | --- |
| `start` | `number` | The initial value of the loop counter. |
| `end` | `number` | The terminating value of the loop counter. |
| `step` | `number` | The amount by which to increment the loop counter each iteration. Optional. Default: `1`. |
| `num_workers` | `number` | The number of workers to use. Optional. Default: `this.getProcessorsNum()`. |
| `context` | `Object` | Optional context to pass to the work_function. Optional. Default: `{}`. |
| `setup_function` | `function` | Optional setup function to execute before work_function. Optional. Default: `null`. |
| `work_function` | `function` | The function to execute on each iteration. |
| `reset_workers` | `boolean` | Wether to reset all workers or not. Default: `false`. |

**Returns:** `Promise.<Array>` - A promise that resolves to an array of results.

##### `terminate()`

Terminates all workers and resets the worker pool.

#### mat

##### `new(A, rows, cols)`

Creates a new matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The matrix data. |
| `rows` | `number` | Number of rows. |
| `cols` | `number` | Number of columns. |

**Returns:** `PRDC_JSLAB_MATRIX` A new matrix instance.

##### `fill(v, rows, [cols])`

Creates a matrix filled with a specific value.

| Parameter | Type | Description |
| --- | --- | --- |
| `v` | `number` | The value to fill the matrix with. |
| `rows` | `number` | Number of rows. |
| `cols` | `number` | Number of columns. Optional. Default: `rows`. |

**Returns:** `PRDC_JSLAB_MATRIX` The filled matrix.

##### `NaNs(rows, [cols])`

Creates a matrix filled with NaN values.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows` | `number` | Number of rows. |
| `cols` | `number` | Number of columns. Optional. Default: `rows`. |

**Returns:** `PRDC_JSLAB_MATRIX` The NaN-filled matrix.

##### `ones(rows, [cols])`

Creates a matrix filled with ones.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows` | `number` | Number of rows. |
| `cols` | `number` | Number of columns. Optional. Default: `rows`. |

**Returns:** `PRDC_JSLAB_MATRIX` The ones-filled matrix.

##### `zeros(rows, [cols])`

Creates a matrix filled with zeros.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows` | `number` | Number of rows. |
| `cols` | `number` | Number of columns. Optional. Default: `rows`. |

**Returns:** `PRDC_JSLAB_MATRIX` The zeros-filled matrix.

##### `diag(A)`

Creates a diagonal matrix from an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Array` | The array to create the diagonal matrix from. |

**Returns:** `PRDC_JSLAB_MATRIX` The diagonal matrix.

##### `eye(size)`

Creates an identity matrix of a given size.

| Parameter | Type | Description |
| --- | --- | --- |
| `size` | `number` | The size of the identity matrix. |

**Returns:** `PRDC_JSLAB_MATRIX` The identity matrix.

##### `concatRow(args)`

Concatenates multiple matrices vertically (row-wise).

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `PRDC_JSLAB_MATRIX` | Matrices to concatenate. |

**Returns:** `PRDC_JSLAB_MATRIX` The concatenated matrix.

##### `concatCol(args)`

Concatenates multiple matrices horizontally (column-wise).

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `PRDC_JSLAB_MATRIX` | Matrices to concatenate. |

**Returns:** `PRDC_JSLAB_MATRIX` The concatenated matrix.

##### `isMatrix(A)`

Checks if the provided object is a matrix.

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | `Object` | The object to check. |

**Returns:** `boolean` True if A is a matrix, else false.

#### vec

##### `new(x, y, z)`

Creates a new vector with specified x, y, z components.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | `number` | The x-component of the vector. |
| `y` | `number` | The y-component of the vector. |
| `z` | `number` | The z-component of the vector. |

**Returns:** `PRDC_JSLAB_VECTOR` A new vector instance.

##### `polar(length, radian)`

Creates a vector from polar coordinates.

| Parameter | Type | Description |
| --- | --- | --- |
| `length` | `number` | The length of the vector. |
| `radian` | `number` | The angle in radians. |

**Returns:** `PRDC_JSLAB_VECTOR` The resulting vector.

##### `spherical(length, azimuth, elevation)`

Creates a vector from spherical coordinates.

| Parameter | Type | Description |
| --- | --- | --- |
| `length` | `number` | The length (magnitude) of the vector. |
| `azimuth` | `number` | The azimuth angle in radians (angle from the X-axis in the XY plane). |
| `elevation` | `number` | The elevation angle in radians (angle from the XY plane towards Z). |

**Returns:** `PRDC_JSLAB_VECTOR` The resulting vector.

#### sym

##### `load()`

Loads the symbolic math libraries (SymPy and NumPy) using Pyodide.
Initializes the Python environment for symbolic computations.

**Returns:** `Promise.<void>` A promise that resolves when the libraries are loaded.

##### `getSymbolName(symbol)`

Retrieves the name of a symbolic variable.

| Parameter | Type | Description |
| --- | --- | --- |
| `symbol` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The symbolic variable or its name. |

**Returns:** `string` The name of the symbolic variable.

##### `checkLoaded()`

Checks if the symbolic libraries are loaded. Throws an error if not.

##### `eval(code)`

Evaluates a Python code string within the symbolic math environment.

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | `string` | The Python code to evaluate. |

**Returns:** `*` The result of the evaluated code.

##### `sym(name)`

Creates a single symbolic variable.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The name of the symbolic variable. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The created symbolic variable.

##### `syms(names)`

Creates multiple symbolic variables.

| Parameter | Type | Description |
| --- | --- | --- |
| `names` | `Array.<string>` | An array of names for the symbolic variables. |

**Returns:** `Array.<PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL>` An array of created symbolic variables.

##### `mat(expr)`

Creates a symbolic matrix from a nested array expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `Array.<Array.<(PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL\|string\|number)>>` | The nested array representing the matrix. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The symbolic matrix.

##### `mul(args)`

Multiplies multiple symbolic expressions.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string \| number` | The symbolic expressions to multiply. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The resulting symbolic expression after multiplication.

##### `div(args)`

Divides multiple symbolic expressions.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string \| number` | The symbolic expressions to divide. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The resulting symbolic expression after division.

##### `plus(args)`

Adds multiple symbolic expressions.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string \| number` | The symbolic expressions to add. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The resulting symbolic expression after addition.

##### `minus(args)`

Subtracts multiple symbolic expressions.

| Parameter | Type | Description |
| --- | --- | --- |
| `args` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string \| number` | The symbolic expressions to subtract. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The resulting symbolic expression after subtraction.

##### `pow(expr, n)`

Raises a symbolic expression to a power.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string \| number` | The base expression. |
| `n` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string \| number` | The exponent. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The resulting symbolic expression after exponentiation.

##### `transp(expr)`

Transposes a symbolic matrix expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The matrix expression to transpose. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The transposed matrix expression.

##### `inv(expr)`

Computes the inverse of a symbolic matrix expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The matrix expression to invert. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The inverse of the matrix expression.

##### `det(expr)`

Computes the determinant of a symbolic matrix expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The matrix expression whose determinant is to be computed. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The determinant of the matrix expression.

##### `diff(expr, x, [n])`

Differentiates a symbolic expression with respect to a variable.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The expression to differentiate. |
| `x` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The variable with respect to which differentiation is performed. |
| `n` | `number` | The order of differentiation. Optional. Default: `1`. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The differentiated expression.

##### `intg(expr, x, lims)`

Integrates a symbolic expression with respect to a variable.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The expression to integrate. |
| `x` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The variable with respect to which integration is performed. |
| `lims` | `Array.<(PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL\|string)> \| undefined` | The limits of integration as [lower, upper]. If undefined, indefinite integration is performed. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The integrated expression.

##### `subs(expr, x, val)`

Substitutes a value into a symbolic expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The expression in which to substitute. |
| `x` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The variable to substitute. |
| `val` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string \| number \| Array` | The value or array of values to substitute. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The expression after substitution.

##### `simplify(expr)`

Simplifies a symbolic expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The expression to simplify. |

**Returns:** `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL` The simplified expression.

##### `showLatex(expr)`

Displays the LaTeX representation of a symbolic expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The expression to display in LaTeX format. |

##### `dispLatex(expr)`

Displays the LaTeX string of a symbolic expression.

| Parameter | Type | Description |
| --- | --- | --- |
| `expr` | `PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL \| string` | The expression to convert to a LaTeX string. |

##### `clear()`

Clears all symbolic variables and resets the symbolic math environment.
