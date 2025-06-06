# 功能概览

## 基本功能

- 流式传输、上传图片、latex公式…… 这些基本的功能自然都有，无需多提

- [跨平台](cross-platform)：响应式界面设计，适配手机、电脑等不同大小和比例的屏幕

- 多服务商支持：支持 OpenAI、Anthropic、Google 等不同服务商

- 修改提问、重新生成 以分叉的形式实现，像 Chatgpt 官网那样（整个对话呈现“树”的结构）
<img src="./res/message-edit.png" width="420">

- [文件解析](file-parse)：支持上传 Word、PDF、PPT、Excel等格式文档，自动解析为文本输入

- 视频解析：支持选择视频文件并指定时长范围（默认为整个视频），将自动转稿为文本输入，以此实现对视频内容的提问
<img src="./res/video-parse.png" width="440">

- [插件系统](plugins)：内置了联网搜索、计算器、图像生成等插件。此外可在插件商店安装更多插件
<img src="./res/gen-image.webp" title="图像生成插件">

- 助手市场：获取各种各样定制提示词的助手（提示词来自[lobe-chat-agents](https://github.com/lobehub/lobe-chat-agents)）

- 本地优先+实时云同步：所有数据储存在本地，因此无需加载且离线可浏览。登录即可启用跨设备实时云同步（30天试用，随后￥1.8/月）

- 模型服务：除了配置自定义API外，也可以登录后使用我们提供的模型服务，无需配置，支持 gpt-4o、claude-3.5-sonnet、o1-mini 等众多先进模型。额度随用随充，永久有效。按照官方API原价扣费

- 开源：本应用是开源的，除了上方两项标明付费的服务外，所有功能都免费。你也可以自部署本应用

- 性能优秀：启动速度快，切换对话十分流畅

- 界面主题：Material 3 设计风格；支持深色/浅色模式；支持自定义主题色

## 拓展使用

- 多工作区workspaces：在左侧边栏，你可以创建多个工作区，将不同主题的对话、不同类型的助手分隔开；还可以创建文件夹，将多个工作区放入其中；支持嵌套
<img src="./res/workspace-list.png" width="378">

- [Artifacts](artifacts)：可将助手回答的任意部分转为 Artifacts，将显示在独立的窗口中，方便修改和复用
<img src="https://fs.krytro.com/aiaw/convert-artifact.webp" width="600">

- [提示词变量](prompt-vars)：除了在助手的“角色设定”中设置普通的静态提示词外，你可以通过创建提示词变量、编辑提示词模板，来构建动态且可复用的提示词
<img src="./res/assistant-prompt-vars.png">

- 插件拓展性：支持将任意 Gradio 应用配置为插件，同时兼容部分 LobeChat 插件；插件不仅仅提供工具调用，文件解析功能也可以通过插件拓展；工具调用支持多模态的结果

## 细节设计

- 用户输入预览：提供正在输入的内容的实时预览；借鉴自NextChat

- 代码粘贴优化：在输入框粘贴从 VSCode 复制的代码时，自动用 markdown 代码块包裹，并标明语言

- 文本文件支持：支持直接添加文本类型文件（代码、csv等）到用户输入中，文件内容和文件名将作为用户输入的一部分。相比于手动将文件内容粘贴到输入框，此方法更快捷且文件内容不会占据显示空间
<img src="./res/text-file.png" width="355">

- 粘贴：通过 Ctrl + V 粘贴，你可以粘贴文本、图片、文件；此外，在输入框之外粘贴文本时，将作为独立的文本块，像文本文件那样

- 引用：用鼠标拖选对话消息内容后，点击“引用”，即可在用户输入中引用该内容。此功能相当于手动复制消息内容并粘贴到输入框中的快捷方式，方便对助手回答的部分内容针对性地追问
<img src="./res/quote.png" width="354">

- 快速滚动：对话右下角有快速滚动按钮，除了一般的滚动到顶部/底部，中间两个按钮是对齐到消息开头/末尾或者上一条/下一条消息的滚动，在消息较长时很方便

- 键盘控制：键盘控制：支持设置键盘快捷键触发上述的滚动操作，以及用键盘快捷键切换消息链、重新生成、新建对话
