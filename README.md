# PR-DC JSLAB - JavaScript LABoratory Environment

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB.svg?v1" width="150">
</p>

The **JavaScript Laboratory (JSLAB)** is an open-source environment designed for scientific computing, data visualization, and various other computer operations. Inspired by *GNU Octave* and *Matlab*, `JSLAB` leverages the advantages of JavaScript, including its blazing speed, extensive examples, backing by some of the largest software companies globally, and the vast community of active programmers and software engineers.

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB_gui.png?v1" width="800">
</p>

The program was developed to fulfill the need for performing calculations in a programming language that allows for code reuse in later project stages. JavaScript was chosen for its speed, dynamic nature, interpretability, extensive library support, large existing codebase, backing by major software companies, and the ability to create both desktop and mobile applications.

`JSLAB` offers a streamlined, dual-window interface designed to boost productivity and foster innovation. The main window combines a versatile workspace with a sandbox terminal, allowing users to run, test, and iterate on code in real time. The dedicated editor window introduces the **.JSL file format**—a plain text format tailored for `JSLAB` scripts. With advanced linting and intelligent autocompletion, the editor makes it easy to write precise, reusable code with minimal errors.

## Why Choose JSLAB?

### 🌟 Backed by Leading Investments
JavaScript is supported by major industry investments, ensuring continuous innovation and robust development. Our commitment to excellence makes `JSLAB` a trusted choice for professionals and organizations worldwide.

### 🚀 Powered by JavaScript, Trusted by Giants
Join the ranks of top companies who leverage JavaScript for their mission-critical applications. With `JSLAB`, you benefit from the same reliable and scalable technology that powers some of the most advanced projects on Earth and beyond.

### 👥 Thriving Community and Massive User Base
Become part of a vibrant and growing community of JavaScript developers. Extensive support network and active forums ensure you always have the resources and assistance you need to succeed.

### 📈 Comprehensive Functionality Comparable to Leading Tools
`JSLAB` bridges the gap between JavaScript and specialized scientific tools. Enjoy functionalities equivalent to MATLAB, GNU Octave, Python, R, and Julia, all within a single, unified platform. Perform data analysis, machine learning, numerical computations, and more with ease.

### 🎨 Seamless and Native GUI with HTML, CSS, and SVG
Design intuitive and visually appealing graphical user interfaces using native HTML, CSS, and SVG. Create interactive dashboards, custom visualizations, and responsive layouts without the need for additional frameworks.

### 🔧 Extend with Native Modules via NPM and C++/C
Enhance `JSLAB`’s capabilities by integrating native modules from npm, built with C++ and C. Tap into a vast ecosystem of extensions and customize your environment to meet your specific needs, ensuring maximum performance and flexibility.

### Join the JSLAB Revolution Today!
Experience the seamless integration of powerful scientific computing and the flexibility of JavaScript. Whether you're developing complex algorithms, analyzing vast datasets, or creating innovative applications, `JSLAB` empowers you to achieve more.

## Installation

You can install `JSLAB` by either downloading the latest stable release from GitHub or by building it from source. Choose the method that best fits your needs.

### Download the Latest Stable Release
- Visit the `JSLAB` Releases Page on GitHub Repository: [https://github.com/PR-DC/JSLAB/releases](https://github.com/PR-DC/JSLAB/releases)
- Download the appropriate installer and install the program.
- Try examples from: [https://github.com/PR-DC/JSLAB/tree/master/examples](https://github.com/PR-DC/JSLAB/tree/master/examples)

## Getting Started

<details>

<summary>Click here to get started with JSLAB!</summary>

The image below shows the main window of the `JSLAB` program.

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB_main_window.svg?v1" alt="Main window of the JSLAB program" width="800">
</p>

Within the main window, there are various shortcuts defined in the help window—for example, the `[CTRL] + [H]` shortcut opens the help window.

In the image above, the following elements of the main window are numbered:

1. **Main Window Header**  
   A menu with options for opening the code editor window, viewing help, accessing program information, and opening the program settings (such as language settings; currently, Serbian in both Latin and Cyrillic scripts and English are available).

2. **Workspace Navigation**  
   Icons for navigating through folders and opening a folder selection window. Besides the current workspace folder, you can save additional paths that will be used when running scripts.

3. **Command Window**  
   Located in the central right panel, this window displays messages from the workspace after code execution.

4. **Command Input Field**  
   Located at the bottom of the central right panel, this field is used to send commands to the workspace. As you type, suggestions for completing the command automatically appear based on the currently active workspace. You can also navigate through the history of entered commands. After typing a command and pressing `[ENTER]`, the command is executed in the workspace.

5. **Status Bar**  
   A bar at the bottom of the window displaying the current state of the workspace. In the bottom left corner, an icon changes color based on that state; clicking the icon displays a tooltip with information about what is currently active in the workspace.

6. **Command History**  
   Located in the lower part of the left central panel, this section allows you to track the sequence of executed commands and easily re-execute a command (by double-clicking on it).

7. **Workspace Variables**  
   In the central part of the left panel, this area displays the name, type, and class of each active global variable created by the user in the workspace.

8. **File Browser**  
   Located in the upper part of the left panel, this area shows folders and files, which can be directly opened within the editor.

> **Note:** The command window is ideal for entering a few commands. However, for more complex tasks, scripts are used.

---

## Editor Window

For `JSLAB` scripts, the `.jsl` extension is used to distinguish them from the standard `.js` extension for JavaScript. Scripts are executed by providing the script path as the sole argument to the `run` function. For writing or editing code in a script, it is best to use the built-in code editor (which can be opened with the `editor` command or the `edit()` function). The code editor window is shown in the image below.

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB_editor_window.svg?v1" alt="Code editor window of the JSLAB program" width="800">
</p>

In the image above, the following elements of the code editor window are numbered:

1. **Editor Window Header**  
   At the very top of the window, there is a menu with options for creating new scripts, opening existing ones, saving open scripts, and directly executing scripts in the workspace.

2. **Script Tabs**  
   Located just below the header, these tabs allow you to switch between the active scripts being edited and to open or close scripts.

3. **Script Text Editor**  
   This is the area where the script code is displayed. As you type, suggestions for completing commands automatically appear based on the currently active workspace—similar to the command window. This text editor provides many advanced features for working with code, including syntax checking, suggestions, the ability to collapse certain code blocks, and highlighting of the current active line.

The editor also includes additional advanced features for code input, such as searching through the code and performing text replacements (the search popup can be opened by pressing `[CTRL] + [F]`).

Most importantly, code can be executed in two ways:
- By entering commands in the command input field of the command window.
- By running a script using the `run()` function or directly from the editor window.

</details>

## Examples

<details open>

<summary>Animated 2D plot</summary>

A 2D plot animation like this is essential for visualizing real-time data changes, enabling dynamic tracking of evolving values and providing immediate insight into trends or fluctuations as they happen.

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB_2D_plot_animated.gif?v1" width="800">
</p>

```javascript
var N_buffer = 500;
var t = toc();
var x = createFilledArray(N_buffer, null); x[0] = t;
var y = createFilledArray(N_buffer, null); y[0] = sin(t);
var p = plot({x: x, y: y});
xlabel("x");
ylabel("sin(x)");
title("Simple 2-D Plot");

await p.ready;
setInterval(function() {
  var t1 = toc();
  x.push(t1);
  y.push(sin(t1*2));
  if(x.length > N_buffer) {
    x.shift();
    y.shift();
  }
  p.update({x: [x], y: [y]}, 0);
}, 33);
```
</details>

<details>

<summary>3D plot with vectors</summary>

3D plots are essential for illustrating spatial relationships and complex vector interactions, allowing for a deeper understanding of data across three dimensions.

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB_3D_plot.png?v1" width="600">
</p>

```javascript
var x = [0, 0, 0, 1, 0];
var y = [0, 0, 0, 1, 0];
var z = [0, 0, 0, 1, 0];

var u = [1, 0, 0, 1, -1];
var v = [0, 1, 0, 1, 0];
var w = [0, 0, 1, 1, 0];

var head_scale = 0.2;
var head_angleFactor = 0.4;

var vectors = createVectors3D(x, y, z, u, v, w, head_scale, head_angleFactor, {color: "#0f0", width: 6});

figure(1);
plot([
  vectors.line, vectors.head
], {'showLegend': false, 'font': {family: 'LatinModern', size: 14}});
xlabel("x");
ylabel("y");
zlabel("z");
xlim([-1, 3]);
ylim([-1, 3]);
zlim([-1, 3]);
```
</details>

<details>

<summary>3D graphics</summary>

3D graphics are vital for creating immersive visualizations that bring complex structures and spatial relationships to life, enabling a more intuitive understanding and interaction with digital models in fields like simulation, design, and data analysis.

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB_3D_graphics.png?v1" width="600">
</p>

```javascript
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
```
</details>

<details>

<summary>Parallel execution</summary>

Parallel execution is critical for handling computationally intensive tasks, as it allows multiple operations to run simultaneously, significantly reducing processing time and improving efficiency by utilizing all available CPU cores. 

```javascript
var computeSquare = (i) => i * i;

// Run parallel exectuion 
var results = await parallel.parfor(0, 20, 1, 
  parallel.getProcessorsNum(), {}, undefined, computeSquare);
disp(results);
```
</details>

<details>

<summary>Vector and Matrix operations</summary>

Vector and matrix operations are fundamental for efficiently performing complex mathematical computations in fields like physics, engineering, and computer graphics, enabling quick transformations, optimizations, and solutions in multidimensional spaces.

```javascript
var v1 = vec.new(1, 2, 3);
var v2 = vec.new([4, 8, 6]);
const v_cross = v1.cross(v2);

var A = mat.new([
    [1, 2],
    [3, 4]
]);
const b = mat.new([
    [5],
    [11]
]);
const x = A.linsolve(b);
disp('Solution to linear system A * x = b:');
disp(x);
```
</details>

<details>

<summary>Symbolic math</summary>

Symbolic math computations are essential for achieving high precision in mathematical modeling, automating algebraic simplifications, and enabling dynamic formula manipulation, which enhances the accuracy and functionality of tools in scientific, engineering, and educational software.

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB_symbolic.png?v1" width="800">
</p>

```javascript
var le, x, E, Iz;
var p, P, invP, N, d2N;
var k_int, k_e_stretching, k_e_torsion;
var xi = range(0, 1, 0.01);

await sym.load();
[le, x, E, Iz] = sym.syms(['le', 'x', 'E', 'Iz']);

P = sym.mat([
  [1, 0, 0, 0], 
  [0, 1, 0, 0], 
  [1, le, sym.pow(le, 2), sym.pow(le, 3)], 
  [0, 1, sym.mul(2, le), sym.mul(3, sym.pow(le, 2))]
]);
p = sym.mat([[1, x, sym.pow(x, 2), sym.pow(x, 3)]]);

invP = sym.inv(P);
N = sym.mul(p, invP);
d2N = sym.diff(N, 'x', 2);

k_int = sym.mul(E, Iz, sym.intg(sym.mul(sym.transp(d2N), d2N), x, [0, le]));

Ni = sym.subs(sym.subs(N, le, 1), x, xi).toNumeric();
var N_flat = Ni.flat();

sym.showLatex(N);
sym.showLatex(k_int);
```
</details>

<details>

<summary>FreeCAD Link</summary>

Integration with FreeCAD is essential for enabling automated, precise 3D modeling workflows within applications, allowing complex geometries, structures, and engineering designs to be generated, modified, and visualized programmatically, which significantly enhances productivity in design and simulation processes.

<p align="center">
  <img src="https://pr-dc.com/web/img/github/JSLAB_FreeCADLink.png?v1" width="800">
</p>

```javascript
var nodes = [
  [0, 0, 0],
  [0, 10, 0],
  [10, 10, 0],
  [10, 0, 0],
  [0, 0, 10],
  [0, 10, 10],
  [10, 10, 10],
  [10, 0, 10]
];
var D = createFilledArray(nodes.length, 3);

var lines = [];
for(var i = 0; i < 4; i++) {
  var j = i+1;
  if(i == 3) {
    j = 0;
  }
  lines.push([...nodes[i], ...nodes[j]]);
  lines.push([...nodes[i+4], ...nodes[j+4]]);
  lines.push([...nodes[i], ...nodes[i+4]]);
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
beamsFile = pwd + 'out/beams.json';
writeFile(beamsFile, stringify(data));

// Run FreeCADLink 
await freecad_link.start(exe, {
  port: port,
  host: host,
  timeout: timeout,
  startup_timeout: startup_timeout
}); // Start FreeCAD programa

await freecad_link.newDocument(part);
await freecad_link.callScript('MakeNodes', nodesFile, timeout);
await freecad_link.callScript('MakeBeams', beamsFile, timeout);
await freecad_link.callScript('MakeFusion', [], timeout);
await freecad_link.saveAs(model, timeout);
//await freecad_link.quit(); // Close programa

deleteFile(nodesFile);
deleteFile(beamsFile);
```
</details>

<details>

<summary>OpenModelica Link</summary>

Integration with OpenModelica is crucial for enabling advanced simulation and analysis of complex dynamic systems directly within applications, allowing engineers to model, test, and optimize system behavior seamlessly, which enhances efficiency in design and validation processes.

```javascript
await om_link.start(exe); // Start OpenModelica programa
disp(await om_link.sendExpression('getVersion()'));

disp(await om_link.sendExpression("model a end a;"));
disp(await om_link.sendExpression('loadFile("'+model+'")'));
disp(await om_link.sendExpression("getClassNames()"));
disp(await om_link.sendExpression("simulate(BouncingBall)"));
await om_link.close();
```
</details>

## Documentation

Comprehensive documentation is available in the root directory of this repository, provided in multiple formats: HTML, PDF, JSON, and TEX for your convenience.

Code references and function details are also accessible directly within `JSLAB` by using the `help()` function.

Documentation is also available at: [https://pr-dc.com/jslab/doc/](https://pr-dc.com/jslab/doc/)

## Build from Source

<details>

<summary>Building from source is intended for advanced users. For details, click here.</summary>

### Prerequisites

In order to download necessary tools, clone the repository, and install dependencies via npm, you need network access.

- **Node.js:** Ensure that Node.js is installed on your system. You can download it from the official website: [https://nodejs.org/](https://nodejs.org/)
- **npm:** npm is typically installed alongside Node.js.
- **node-gyp:** node-gyp is installed alongside the application but it requires additional tools and libraries depending on your operating system. Follow the instructions for your specific OS from: [https://github.com/nodejs/node-gyp](https://github.com/nodejs/node-gyp)
- **Git:** Suggested for cloning the repository. Download it from the official website: [https://git-scm.com/](https://git-scm.com/)

### Installation Steps

1. Clone the `JSLAB` repository:
    ```sh
    git clone https://github.com/PR-DC/JSLAB.git
    ```
2. Navigate to the project directory:
    ```sh
    cd JSLAB
    ```
3. Install the necessary dependencies:
    ```sh
    npm install
    ```
4. Start the application:
    ```sh
    npm start
    ```
5. Check examples from: [https://github.com/PR-DC/JSLAB/tree/master/examples](https://github.com/PR-DC/JSLAB/tree/master/examples)

## Contributing

### Setting Up the Development Environment
Follow the detailed [build instructions](build-instructions) available in this documentation.

### Making Changes
Follow the [coding style and best practices](coding-style) available in this documentation.

### Submitting Changes
1. Create a new branch for your feature or bugfix:
    ```sh
    git checkout -b feature/your-feature-name
    ```
2. Make your changes and commit them with clear messages:
    ```sh
    git commit -m "Add feature X to improve Y"
    ```
3. Push your branch to your forked repository:
    ```sh
    git push origin feature/your-feature-name
    ```
4. Submit a Pull Request (PR) detailing your changes.

### Testing
Before submitting a PR, ensure that all tests pass and add new tests for any new functionality you introduce.

### Reviewing Process
All PRs are subject to review by the maintainers. Be prepared to make revisions based on feedback to align with project standards.

### Best Practices
- **Consistent Formatting:** Use a consistent code formatter (e.g., Prettier) to maintain uniform code style.
- **Meaningful Commit Messages:** Write clear and descriptive commit messages that explain the purpose of the changes.
- **Modular Code:** Write reusable and modular code to enhance maintainability and scalability.
- **Comprehensive Testing:** Implement thorough tests to ensure the reliability of your contributions.

</details>

## Feedback

Your feedback is invaluable in improving the `JSLAB` application. Whether you encounter bugs, have feature requests, or need assistance, please reach out through the following channels:

- **GitHub Issues:** Report bugs or suggest features by opening an issue in the GitHub repository.
- **Email:** Contact us directly at [info@pr-dc.com](mailto:info@pr-dc.com) or main author at [mpetrasinovic@pr-dc.com](mailto:mpetrasinovic@pr-dc.com).

We encourage active participation and appreciate all forms of feedback that help us enhance the functionality and usability of `JSLAB`.

## License

```
Copyright (C) 2024 PR-DC <info@pr-dc.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```