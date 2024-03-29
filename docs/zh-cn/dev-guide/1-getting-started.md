# 快速开始

[Typora](https://typora.io/) 是一个跨平台的 Markdown 编辑器。其本身并没有提供插件系统，所以 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 参考 [Obsidian 插件系统](https://docs.obsidian.md/Home) 为社区提供了一个适用于 Typora 的插件系统。

下面将简要介绍如何编译属于你的第一个插件。



## 开发环境准备

| 操作                                          | 用途                                       |
| --------------------------------------------- | ------------------------------------------ |
| 注册 [Github](https://github.com/) 账号       | 用于从模板创建插件项目、托管代码和发布插件 |
| 安装 [Git](https://nodejs.org/)               | 用于下载和上传插件项目代码                 |
| 安装 [VSCode](https://code.visualstudio.com/) | 用于编辑插件代码                           |
| 安装 [Node.js](https://nodejs.org/)           | 用于编译插件                               |



## 前置知识

- [TypeScript](https://www.typescriptlang.org/zh/): 用于提供类型定义。



## 构建你的第一个插件

### 创建项目

1）登录 Github，使用示例插件项目 [typora-plugin-example](https://github.com/typora-community-plugin/typora-plugin-example) 作为模板，创建新的插件项目。

2）使用 Git 克隆你的插件项目到本地：


```sh
git clone https://github.com/{user-name}/{plugin-name}
```

3.1）使用 VSCode 打开该插件项目文件夹，按下 <kbd>Ctrl</kbd>+<kbd>`</kbd> 打开命令行终端。

3.2）在终端运行命令 `npm install`，安装项目依赖包。



### 编译插件

在终端运行命令 `npm run build:dev`，将会进入开发环境，编译插件，并使用 Typora 打开。

> 现在可以看到 Typora 运行后，自动弹出对话框并显示 `hello, typora`



### 修改插件

在 VSCode 中，打开 src/main.ts，修改代码：

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



### 重新编译

在终端重新运行命令 `npm run build:dev`，将会重新编译插件、重新打开 Typora 并重新加载插件。

> 现在 Typora 运行后，自动弹出对话框并显示修改后的信息 `hello, my first plugin`



## 下一步

参考[插件基础](./2-plugin.md)，经过多次修改、编译、运行测试后，可以[发布](./9-releasing.md)到插件市场供大家下载使用。

