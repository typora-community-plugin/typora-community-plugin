# 快速开始

下面将简要介绍如何编译属于你的第一个插件。



## 开发环境准备

| 操作 | 用途 |
| --- | --- |
| 注册 [GitHub](https://github.com/) 账号 | 用于从模板创建插件项目、托管代码和发布插件 |
| 安装 [Git](https://git-scm.com/) | 用于下载和上传插件项目代码 |
| 安装 [VSCode](https://code.visualstudio.com/) | 用于编辑插件代码 |
| 安装 [Node.js](https://nodejs.org/) | 用于编译插件 |
| 安装 [PNPM](https://pnpm.io/) | 用于安装依赖（使用文件链接减少文件冗余） |
| 安装 [NRM](https://github.com/Pana/nrm) | (可选) 切换源仓库（如淘宝镜像，用于国内加速） |



## 前置知识

- [TypeScript](https://www.typescriptlang.org/zh/)：用于提供类型定义。



## 构建你的第一个插件

### 创建项目

1）登录 GitHub，使用示例插件项目 [typora-plugin-example](https://github.com/typora-community-plugin/typora-plugin-example) 作为模板，创建新的插件项目。


![使用模板创建项目](../../assets/dev/1-create-project.jpg)


2）使用 Git 克隆你的插件项目到本地：


```sh
git clone https://github.com/{user-name}/{plugin-name}
```

3.1）使用 VSCode 打开该插件项目文件夹，按下 <kbd>Ctrl</kbd>+<kbd>`</kbd> 打开命令行终端。

3.2）在终端运行命令 `pnpm install`，安装项目依赖包。



### 项目结构

模板项目的结构如下（以模板仓库为准）：

```
plugin-name
├── src
│   ├── main.ts          # 插件入口，导出 Plugin 子类
│   ├── manifest.json    # 插件元数据
│   ├── style.scss       # 插件样式（构建为 style.css）
│   └── locales          # 多语言 JSON（可选）
├── build.js             # 构建脚本
├── pack.js              # 打包脚本
├── package.json
└── dist                 # 构建产物：main.js、style.css
```

> 插件元数据写在 `src/manifest.json`，构建/打包时会被放到产物根目录，最终 zip 内的文件名为 `manifest.json`。

常用脚本：

| 命令 | 作用 |
| --- | --- |
| `pnpm run build:dev` | 以开发模式编译插件，并启动 Typora 加载开发版 `core` |
| `pnpm run build` | 生产模式编译 |
| `pnpm run pack` | 将 `dist/` 与 `manifest.json` 打包为 `plugin.zip` |



### 编译插件

将 Typora 安装目录加入环境变量 PATH 中。

在终端运行命令 `pnpm run build:dev`，将会进入开发环境，编译插件，并使用 Typora 打开。

> 现在可以看到 Typora 运行后，自动弹出对话框并显示 `hello, typora`



### 修改插件

在 VSCode 中，打开 `src/main.ts`，修改代码：

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

在终端重新运行命令 `pnpm run build:dev`，将会重新编译插件、重新打开 Typora 并重新加载插件。

> 现在 Typora 运行后，自动弹出对话框并显示修改后的信息 `hello, my first plugin`



## 生命周期与资源释放

插件类继承自 `Plugin`，而 `Plugin` 又继承自 `Component`。插件管理器会使用 `new PluginImplement(app, manifest)` 实例化插件，然后调用 `load()`：

1. `load()` 调用 `onload()`；
2. `unload()` 先调用 `onunload()`，再依次执行通过 `this.register()` 收集的清理函数，最后卸载子组件。

因此推荐把事件、定时器、DOM 监听等清理逻辑交给 `this.register()`，而不是全部堆在 `onunload()` 中：

```ts
export default class extends Plugin {
  onload() {
    const timer = setInterval(() => { /* ... */ }, 1000)
    this.registerInterval(timer)

    this.registerDomEvent(window, 'resize', () => { /* ... */ })
  }
}
```

> `load()` 不会等待 `onload()` 中的异步操作完成。需要在异步初始化完成后再使用插件功能时，请自行维护就绪状态。



## 下一步

参考[插件基础](./2-plugin.md)，经过多次修改、编译、运行测试后，可以[发布](./9-releasing.md)到插件市场供大家下载使用。
