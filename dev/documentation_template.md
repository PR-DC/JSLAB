# JSLAB documentation

Version $JSLAB_APP_VERSION$

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

Ctrl+C clears unfinished input or interrupts a running operation. Use checkStop; checkpoints in long CPU loops for cooperative interruption. Press Ctrl+C again while the same operation is still running to close the owned runtime. Ctrl+C at an empty prompt and Ctrl+D close the session.

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
| `interrupt_execution` | Request cooperative interruption of the current execution. |

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

Interruption uses JSLAB's existing cooperative stop mechanism. Acknowledgement means the stop was requested, not that execution has finished. Poll until completion. Blocking native calls and uncooperative operations may require the user's existing sandbox reset control. Reset discards the workspace; it is not exposed as an agent tool.

For long CPU loops, include the existing `checkStop` checkpoint so the desktop can request interruption:

```javascript
while(working) {
  checkStop;
  // Perform the next bounded calculation step.
}
```

Results contain bounded textual previews rather than a lossless serialization of arbitrary objects. Output captures JSLAB display, warning and error methods, including the JSLAB console. Capture ends when the requested operation completes; detached asynchronous work can continue afterward. Output is limited to 200 messages and 64000 characters, and previews to 16000 characters. Inspect selected variables or save large results to files when needed.

### Agent guidance and access

The server exposes `jslab://agent-guide` from [AGENTS.md](../AGENTS.md) and `jslab://mcp-guide` from this documentation section. Agents should start with session status, consult `get_help` for unfamiliar functions, execute small steps, and inspect output and figures before continuing.

Enabling access authorizes code execution with the desktop user's existing JSLAB permissions, including file, process, network and device access. The loopback bridge authenticates each request and rejects browser-origin requests. MCP is an interface to the existing runtime, not an additional execution sandbox. Close the shared session and restart without `--mcp` to disable access.

If no session is found, check that JSLAB was started with `--mcp` under the same user and temporary-directory environment as the adapter. If multiple sessions are found, select one explicitly. If a selected session has exited, restart JSLAB and update its PID or descriptor path. Stale descriptors from crashes are ignored during automatic discovery.

## Code references

$JSLAB_CODE_DATA$
