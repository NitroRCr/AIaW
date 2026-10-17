# MCP 插件

[MCP](https://modelcontextprotocol.io/introduction) (Model Context Protocol, 模型上下文协议) 是由 Anthropic 提出的，用于向 LLM 提供上下文的标准化的协议。

客户端可以通过 MCP 协议调用工具，获取 Prompts 和 Resources 等。MCP 协议已经获得了广泛的支持，现在有各种功能的 MCP 服务器：文件系统、网络搜索、数据库、Docker、命令行等等。只要是支持 MCP 协议的客户端都可以调用它们！

AIaW 在 v1.4 版本添加了对 MCP 协议的支持，支持以下 MCP 特性：Tools, Prompts 和 Resources.

## 前提条件

目前绝大多数 MCP 服务器是 STDIO 类型的，在本地通过 `npx` 或者 `uvx` 命令调用。因此需要：

- 使用 AIaW 桌面版（Windows, Linux, MacOS 本地客户端）
- 已安装 [NodeJS](https://nodejs.org/)
- 已安装 [Python](https://www.python.org/) 和 [uv](https://github.com/astral-sh/uv)

如果是 HTTP/SSE 类型的 MCP 服务器，则无上述要求，在任何平台都可用。

## 安装 MCP 插件

在 AIaW 中，MCP 服务器是通过 MCP 类型的插件调用的。你可以在「插件」页面安装 MCP 类型的插件。

除了插件市场已有的插件，你也可以点击右上角的加号，手动添加 MCP 插件。

你可以在 [MCP 官网](https://modelcontextprotocol.io/examples)、[Smithery](https://smithery.ai/)、[Glama](https://glama.ai/mcp/servers) 等网站发现更多的 MCP 服务器。不过要切记**仅添加可信来源的 MCP 服务器**，因为 STDIO 类型的 MCP 服务器是在你的本地运行的第三方程序，拥有较高的权限。

安装之后，可在助手设置中启用该插件，随后便可在对话中使用。

## 配置文件

手动添加 MCP 插件时，并不能修改插件的所有属性。若需要更改更多的属性，或者分享给他人，可以编写插件配置文件，然后通过配置文件添加插件。

::: code-group
```json [示例值]
{
  "id": "mcp-searxng",
  "title": "SearXNG",
  "description": "通过 SearXNG 进行网页搜索",
  "transport": {
    "type": "stdio",
    "command": "uvx mcp-searxng",
    "env": {
      "SEARXNG_URL": "http://localhost:8080"
    }
  },
  "author": "TerminalMan",
  "homepage": "https://github.com/SecretiveShell/MCP-searxng",
  "avatar": {
    "type": "icon",
    "icon": "sym_o_search",
    "hue": 225
  }
}
```
```typescript [TS 类型定义]
interface McpPluginManifest {
  id: string
  title: string
  transport: {
    type: "stdio"
    command: string
    cwd?: string;
    env?: {
      [x: string]: string
    }
  } | {
    type: "sse"
    url: string
  } | {
    type: "http"
    url: string
    headers?: {
      [x: string]: string
    }
  }
  avatar?: Avatar
  description?: string
  author?: string
  homepage?: string
  noRoundtrip?: boolean
}
```
:::

部分属性的含义可以参考 [Gradio 插件](plugin-dev#gradio-插件)

## 示例：Parallel Search MCP

[Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp) 提供网页搜索（`web_search`）和网页内容抓取（`web_fetch`）功能。免费匿名搜索使用 Fast 模式，无需账号或 API Key。免费访问有用量限制。

将以下内容保存为 `parallel-search.json`：

```json
{
  "id": "mcp-parallel-search",
  "title": "Parallel Search",
  "description": "Web search and page fetching with Parallel",
  "transport": {
    "type": "http",
    "url": "https://search.parallel.ai/mcp",
    "headers": {
      "User-Agent": "AIaW"
    }
  },
  "homepage": "https://docs.parallel.ai/integrations/mcp/search-mcp"
}
```

1. 打开「插件」页面，点击右上角的 **+**，选择「选择配置文件」，然后选择 `parallel-search.json`。
2. 在助手设置中启用 **Parallel Search**，并使用支持工具调用的模型。
3. 可以尝试提问：「搜索 Vite 最新版本的发布说明，抓取官方发布页面，并附上来源链接总结变化。」

此示例连接的是托管的 HTTP 服务器，因此不需要安装 Node.js、Python 或 uv。它只添加一个可选插件；启用之前，现有的网络搜索插件和助手设置保持不变。

## 更新

如果 MCP 服务器有破坏性的更新，那么需要卸载并重新安装对应的 MCP 插件，以避免 API 更改带来的冲突。

