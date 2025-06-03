# Quick Start

The following will briefly introduce how to compile your first plugin.



## Development Environment Preparation

| Action                                       | Purpose                              |
| -------------------------------------------- | ------------------------------------ |
| Register a [Github](https://github.com/) account | To create plugin projects from templates, host code, and publish plugins |
| Install [Git](https://nodejs.org/)          | To download and upload plugin project code |
| Install [VSCode](https://code.visualstudio.com/) | To edit plugin code                   |
| Install [Node.js](https://nodejs.org/)      | To compile plugins                    |
| Install [PNPM](https://pnpm.io/)            | To install dependencies (using file links to reduce file redundancy) |
| Install [NRM](https://github.com/Pana/nrm)  | (Optional) Switch source repositories |



## Prerequisite Knowledge

- [TypeScript](https://www.typescriptlang.org/): Used to provide type definitions.



## Build Your First Plugin

### Create a Project

1) Log in to Github and use the example plugin project [typora-plugin-example](https://github.com/typora-community-plugin/typora-plugin-example) as a template to create a new plugin project.


![Create Project Using Template](../../assets/dev/1-create-project.jpg)


2) Use Git to clone your plugin project to your local machine:


```sh
git clone https://github.com/{user-name}/{plugin-name}
```

3.1) Open the plugin project folder in VSCode and press <kbd>Ctrl</kbd>+<kbd>`</kbd> to open the command line terminal.

3.2) In the terminal, run the command `pnpm install` to install the project dependencies.



### Compile the Plugin

Add the Typora installation directory to the environment variable PATH.

Run the command `pnpm run build:dev` in the terminal, which will enter the development environment, compile the plugin, and open it with Typora.

> You will now see a dialog box automatically pop up showing `hello, typora` after Typora runs.



### Modify the Plugin

In VSCode, open src/main.ts and modify the code:

```diff
  export default class extends Plugin {

    onload() {
-     alert('hello, typora')
+     alert('hello, my first plugin')
    }

    onunload() {
      // dispose resources, like events, processes...
    }
  }
```



### Recompile

Run the command `pnpm run build:dev` again in the terminal to recompile the plugin, reopen Typora, and reload the plugin.

> Now, after Typora runs, a dialog box automatically pops up showing the modified message `hello, my first plugin`



## Next Steps

Refer to [Plugin Basics](./2-plugin.md). After multiple modifications, compilations, and running tests, you can [publish](./9-releasing.md) it to the plugin market for everyone to download and use.
