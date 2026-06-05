# 高级搜索

高级搜索支持结构化查询语法（包括字段前缀、布尔运算符和否定）——让你能够在整个仓库中精准定位所需内容。

## 预览

![advanced-search](../../assets/user/advanced-search.jpg)

## 启用高级搜索模式

高级搜索需要手动开启：

1. 打开搜索面板（点击活动栏中的 **搜索** 图标）
2. 在搜索框顶部旁边找到切换按钮 <button class="ty-plugin-advanced-search-btn" style="display:inline-block; padding: 2px 8px; border: 1px solid #999; border-radius: 3px; cursor: pointer;">✨</button>
3. 左键单击即可 启用/禁用 高级搜索模式

启用后，搜索框将使用基于 ripgrep 的高级解析引擎，而不是 Typora 原生的简单文本匹配。

## 查询语法

### 基本词

在搜索框中输入一个单词或短语。搜索会扫描你仓库中的所有文件以查找匹配项。

```
hello world
```

多个独立单词默认是隐式 **AND**（与）关系 — 结果必须同时包含所有关键词。

如需**精确匹配**短语，用双引号包裹文本：

```
"exact phrase"
```

### 字段前缀

使用前缀将搜索范围缩小到特定元数据字段：

| 前缀 | 说明 | 示例 |
|------|------|------|
| `tag:` | 按标签搜索（内联 `#` 或 YAML frontmatter 中的 `tags` 数组） | `tag:project` |
| `title:` | 按文件标题或标题文本搜索 | `title:Meeting` |
| `filename:` | 仅按文件名搜索（不区分大小写） | `filename:report` |

字段前缀**不区分大小写** — 你可以使用任意大小写形式。

#### 标签搜索说明

| 查询 | 范围 |
|------|------|
| `tag:foo` | 搜索 frontmatter tag 和正文 inline `#tag` |
| `#tag` | 仅搜索正文中的 inline `#tag` |
| `tag:foo -#tag` | 仅搜索 frontmatter 中的 tag（排除正文） |

标签匹配是**精确匹配** — `tag:foo` 不会匹配到 `foobar` 或 `my-foo`。支持层级标签：

```
tag:project/sub-task
```

### 布尔运算符

#### AND（隐式）

用空格分隔多个词即可实现"与"效果，需要同时满足：

```
meeting notes
```

这将找到同时包含 "meeting" 和 "notes" 的文件。

#### OR（显式）

使用大写的 `OR` 表示"或"关系，查询的任意一侧匹配即可：

```
(book OR film) tag:movies
```

这将找到包含 "book" 或 "film"，且带有标签 "movies" 的文件。

括号用于控制优先级和分组。

#### NOT（否定）

在任何词或组前加 `-` 可将其排除：

```
tag:project -deprecated
```

这将找到标记为 "project" 但**不包含** "deprecated" 的文件。

也支持对分组的否定：

```
(tag:work OR tag:personal) -(meeting OR call)
```

### 组合使用

所有功能可以组合在一个查询中使用。以下是更新日志中的示例：

```
(book film) OR tag:game
```

这将找到同时包含 "book" 和 "film"，或者带有标签 "game" 的文件。

## 限制

- `OR` 运算符必须大写；小写的 "or" 会被当作普通单词处理
- 查询仅限于不超过 2MB 的文件
- 否定符（`-`）仅作用于它前缀的词或组，并非全局排除
