# Sidebar

Pressing the activity bar icon will display the specified panel in the sidebar.

## Usage

Use `register()` to register and add a button to the `WorkspaceRibbon`, where the button's click event switches the sidebar panel.

```ts
// typora-plugin-tag /src/features/use-sugguest.ts

this.register(
  this.app.workspace.ribbon.addButton({
    // ...
    onclick: () => sidebar.switch(TagPanel),
  })
)
```

Use `register()` to register the panel instance in the sidebar.

```ts
// typora-plugin-tag /src/features/use-sugguest.ts

this.register(
  this.app.workspace.sidebar.addChild(new TagPanel(plugin, this)))
```

Where TagPanel inherits from SidebarPanel and implements the `onshow()` method to render the panel.

## Example

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
