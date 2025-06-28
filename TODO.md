# TODO List for JSLAB

This document tracks tasks and features to implement, bugs to fix, and ideas to explore for the project.

---

## 🔄 In Progress

---

## 🐛 Bug Fixes

- In `AlphaShape3D`, avoid data copying by using data directly. Fix crash when node count is incorrect.

---

## 📝 General TODOs

- Ensure file opening happens in only one instance of the program.

- Assistant - Create a ChatGPT API-based chatbot to assist with programming by answering questions about which function to use for specific tasks (Custom GPT).

- ~~Implement `openSerialTerminal` with window from `openTerminal` that includes a message window and a data input area. It should allow us to pass an encoder and decoder to use SCBP or other protocols.~~

- Create additional examples, such as graphics, to cover documentation gaps.

- Display vectors horizontally up to a certain length, possibly as an HTML table.

- Create a 3D graph using Three.js SVG renderer.

- Implement search history in the editor.

- Implement a console buffer similar to chat applications (loads more messages when scrolling up).

- Add symbol input support in the editor (virtual keyboard).

- Expand values from objects to view further details (possibly retain everything in the main window until the command window is reset).

- Adjust plot legend width to work better with Latin Modern Math font.

- ~~Utilize Arduino CLI.~~

- Enable saving and loading of the workspace; investigate how MATLAB's save/load functions work. For custom classes, save the definition location and load it if possible (try using `flatted`). For built-in classes like matrices, save only the name. Consider a `saveObject` function to store the class type and last known path to load with `loadClass` or inform the user if unknown.

- Display help on hover for recognized functions in the editor.

- Enable saving and loading of objects using [class-transformer](https://github.com/typestack/class-transformer).

- ~~Create figures with UI controls.~~

- Implement a LaTeX editor and compiler (requires MiKTeX path).

- Implement SheetJS.

- Add search and replace functionality across all scripts.

- Prevent override of additional functions and variables.

- Write additional unit tests.

- ~~Add a "Check for Updates" feature.~~

---

## 💡 Ideas / Future Enhancements

- ~~Module for interactive presentations.~~

- Implement [SunCalc](https://github.com/mourner/suncalc).

- Add an electronics simulator (e.g., Wokwi).

- Implement symbolic computations using a native module based on GiNaC or SymEngine.

- Create a Modelica GUI and compiler. See [this paper](https://ep.liu.se/ecp/096/115/ecp14096115.pdf) for reference.