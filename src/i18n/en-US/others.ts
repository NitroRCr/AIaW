export default {
  routes: {
    settings: "Settings",
    shortcutKeys: "Shortcut Keys",
    pluginsMarket: "Plugins",
    assistantsMarket: "Assistants",
    account: "Account",
    modelPricing: "Model Pricing",
    workspaces: "Workspaces",
  },
  common: {
    search: "Search",
    add: "Add",
    contacts: "Contacts",
    addContact: "Add Contact",
    noContacts: "No contacts found",
    noSearchResults: "No results found",
    admin: "Admin",
    member: "Member",
    guest: "Guest",
    owner: "Owner",
    you: "You",
    unknown: "Unknown",
    loginRequired: "Login required to perform this action",
    noAdmin: "Access Denied - Administrator Privileges Required",
    addedSuccessfully: "Added successfully",
    removedSuccessfully: "Removed successfully",
    updatedSuccessfully: "Updated successfully",
    errorFetching: "Error fetching data",
    errorAdding: "Error adding item",
    errorRemoving: "Error removing item",
    errorUpdating: "Error updating item",
    errorCreating: "Error creating item",
    errorDeleting: "Error deleting item",
    errorProcessing: "Error processing request",
    confirmRemove: "Confirm Remove",
    confirmRemoveMessage: "Are you sure you want to remove {name}?",
    pleaseLogin: "Please login to continue",
  },
  participantManager: {
    participants: "Participants",
    addParticipant: "Add Participant",
    removeParticipant: "Remove Participant",
    noParticipants: "No participants found",
  },
  values: {
    apiAddress: "API Address",
    defaultServiceAddress:
      "Default to the official address of the service provider",
    defaultOpenAIAddress: "Default to OpenAI official address",
    organization: "Organization",
    project: "Project",
    optional: "Optional",
    resourceName: "Resource Name",
    apiVersion: "API Version",
    defaultAnthropicAddress: "Default to Anthropic official address",
    defaultGoogleAddress: "Default to Google official address",
    openaiCompatible: "OpenAI Compatible",
    required: "Required",
  },
  templates: {
    defaultWsIndexContent: `> You can change the full--md-description of {'{{ workspace.name }}'} in the workspace settings.`,
  },
  mcpClient: {
    connectingMcpServer: "Connecting to MCP server...",
  },
  presence: {
    online: "Online",
    away: "Away",
    busy: "Busy",
    offline: "Offline",
  },
  plugins: {
    time: {
      title: "Time and Date",
      description:
        "Let AI get the current time and date (not very useful. Can be used to test whether tool calls are normal)",
      prompt: "Get the current time and date",
    },
    calculator: {
      title: "Calculator",
      description:
        "Provide a calculator to allow AI to complete more complex calculations",
    },
    whisper: {
      title: "Speech Recognition: Whisper",
      description:
        "Upload audio files and convert speech to text using the Whisper model",
      transcribe: {
        description: "Convert speech to text",
      },
      taskType: "Task Type",
    },
    flux: {
      title: "Image Generation: FLUX",
      description:
        "Let AI call the FLUX model to generate images. Called through 🤗 Spaces, so it is free",
    },
    videoTranscript: {
      title: "Video to Text",
      description:
        "Extract audio from video and convert it to text. To ask AI about video content",
      transcribe: {
        description: "Convert video to text",
      },
      audioEncoderError:
        "The current browser does not support audio encoding. It is recommended to use the latest version of Chrome/Edge browser.",
      rangeInput: {
        label: "Time Range",
      },
    },
    emotions: {
      title: "Emoticons",
      description:
        "Let AI use emoticons in its answers to make them more vivid",
      displayWidth: {
        label: "Display Size",
      },
    },
    mermaid: {
      title: "Mermaid Chart",
      description: "Let AI use Mermaid syntax to create charts in its answers",
      prompt:
        "In the answer, if you need to draw a chart, you can directly use mermaid syntax to create the chart, which can be rendered normally.",
    },
    docParse: {
      title: "Document Parsing",
      description:
        "Parse document (PDF, Word, Excel, PPT, etc.) content and convert it to Markdown text",
      parse: {
        description: "Parse document content",
      },
      rangeInput: {
        label: "Page Range",
        hint: "Example: 1-3,5",
      },
      ocrLanguage: "OCR Language",
    },
    mcp: {
      runCommand: "Run Command",
      cwd: "Working Directory",
    },
  },
  artifactsPlugin: {
    description: "Modify Artifact",
    success: "Success",
  },
  update: {
    updating: "Updating...",
    updateFound: "Update found: {version}",
    download: "Download",
    ignore: "Ignore",
    install: "Install",
    downloadedNewVersion: "New version downloaded: {version}",
    installedNewVersion: "New version installed: {version}",
    relaunch: "Relaunch",
  },
  stores: {
    plugins: {
      stdioRequireDesktop:
        "STDIO type MCP plugins are only supported on the desktop version",
    },
    assistants: {
      newAssistant: "New Assistant",
    },
    workspaces: {
      newFolder: "New Folder",
      newWorkspace: "New Workspace",
    },
    providers: {
      newProvider: "New Provider",
    },
  },
  db: {
    exampleWorkspace: "Example Workspace",
    defaultAssistant: "Default Assistant",
  },
  webSearchPlugin: {
    title: "Web Search & Crawl",
    description:
      "Provide the ability to use search engines and crawl web content",
    searxngURLCaption: "Customize the address of the SearXNG instance",
    jinaApiKeyCaption:
      "Fill in to improve the rate limit of web crawling, available on jina.ai",
    toolSearchCaption: "Call search engines to search the web",
    toolCrawlCaption: "Crawl web content",
    defaultEngines: "Default Search Engines",
    defaultEnginesCaption:
      "Comma-separated list of search engines, leave blank to follow the server configuration",
    resultsLimit: "Results Limit",
    resultsLimitCaption: "Limit the number of search results per time",
    configureSearxngMessage:
      "Please configure SearXNG instance in the server, or configure SearXNG URL in the plugin settings",
  },
}
