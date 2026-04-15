# Migrating to Nya AI

AIaW is no longer maintained. We recommend that existing users migrate to [Nya AI](https://github.com/NitroRCr/nyaai) to continue their experience.

## Why the Change?

As the project evolved, AIaW's original architectural design increasingly became a bottleneck that was difficult to resolve. At the same time, we wanted to implement more advanced features, and making radical overhauls on the existing codebase was no easy task. Therefore, we chose to completely rebuild a new project using a fresh technical architecture. This allowed us to rethink many underlying implementation details, add entirely new features, and even shift the overall positioning of the project.

## What's New?

If AIaW was positioned as a **local-first AI chat client**, Nya AI is positioned as a **collaborative AI platform**. While AI chat was the primary function of AIaW, in Nya AI, it is just one of many core features.

Regarding chat, Nya AI retains most of AIaW’s functionality while adding many optimizations. In other areas, Nya AI introduces several new features:

### Workspaces

In AIaW, workspaces were often used to separate conversations of different topics. In Nya AI, this need is met simply by creating folders within a single workspace; you can still apply different default assistants and configurations to different directories.

Consequently, the primary role of a workspace in Nya AI is **collaboration** rather than **categorization**. Similar to collaboration platforms like Notion, you can invite your team to your workspace to browse and edit content together.

### No More "Cloud Sync" Needed

AIaW was local-first, relying on Dexie Cloud to sync user data across devices. In Nya AI, data is stored with a **server-centric** approach, supported by the **Zero** sync engine to achieve real-time queries, optimistic updates, and hot data caching. This ensures consistent data across all devices natively.

To be clear, Nya AI is **no longer local-first**. While it achieves an interaction experience close to local-first apps thanks to the sync engine, it is essentially a server-priority architecture. Now, you must log in to use it (unauthenticated users can only browse publicly published pages), and offline capabilities are more limited—you can read recent content offline but cannot make modifications. This was a necessary trade-off: the new architecture allows for better data consistency, more complex features, and the ability to handle much larger volumes of data.

Furthermore, a highlight of the new architecture is the achievement of **full data control**. The Dexie Cloud extension used by AIaW is closed-source, meaning you had to use their SaaS for cloud synchronization. However, the sync engine used by Nya AI, `@rocicorp/zero`, is open-source. Nya AI itself is also fully open-source, and the S3 storage it relies on has many compatible open-source alternatives. This means the entire chain is open-source and self-hostable—great news for self-hosting users who want total control over their data.

### Pages

This is an indispensable feature for a collaborative platform. Pages are Notion-like, WYSIWYG collaborative documents. They support:

- **Markdown Compatibility**: Use Markdown syntax to type, paste Markdown, or export to Markdown.
- **Docx Support**: Import from and export to `.docx` files.
- **Edit History**: Browse and revert to previous versions at any time.
- **Integrated AI**: Open an AI chat on the right side to ask questions or have the AI edit the page content.

### Publishing Content

Pages, chats, and files can all be published (Right-click item in the sidebar -> Publish). Once published, they are publicly accessible (read-only) via a link. Sub-items of a published item are automatically published as well.

### Search

This functions like a hybrid of traditional search engines and AI search. The left side shows search results, while the right side generates an AI-summarized answer with the ability to continue the conversation.

### Channels

Similar to a group chat for all workspace members, channels can be used for communication and collaboration, or for individuals to transfer text and files across different devices.

### Files

You can upload files; document-type files are automatically parsed into text for use in AI conversations. You can also reference files in pages or channels. We do not restrict the types of files you can upload—you can even use it as a cloud drive, as long as the file size stays within the limit.

## Migrating Data

If you want to migrate your data from AIaW to Nya AI, please follow these steps:

1. At the bottom of the **AIaW Settings** page, click **User Data -> Export** to export your data as a JSON file.
2. Open and log in to [Nya AI](https://nyaai.cc/).
3. At the bottom of the **Nya AI Settings** page, click **Import Data** and select the JSON file you just exported.
4. Wait for the import to complete. The imported data will be saved in a folder named "AIaW Import" at the root of your current workspace.

This method works whether you are migrating from the official SaaS ([aiaw.app](https://aiaw.app)) or a self-hosted AIaW instance to the official Nya AI ([nyaai.cc](https://nyaai.cc)) or a self-hosted Nya AI instance.

If the import fails due to network fluctuations, try the following:
1. Refresh the page.
2. Delete the partially imported "AIaW Import" folder.
3. Try the import again.

### What is Imported?
Conversations, messages, and assistants—along with message attachments and assistant avatars—will be imported. Workspaces will be converted into folders, maintaining their original nested structure. **However**, other data—including settings, service providers, and plugins—will not be imported and must be reconfigured manually.

## Not Ready to Migrate?

If you are wondering if Nya AI can completely replace AIaW right now, the answer is: **not quite.**

On one hand, Nya AI has simplified some of AIaW’s complex but low-frequency features, such as:
- **Custom Service Providers**: Many users complained that custom provider configurations in AIaW were too complex. Nya AI’s design is simpler and more intuitive but no longer supports complex routing configurations.
- **Prompt Variables**: Nya AI currently does not support custom prompt variables. If you need this feature, please [let us know](https://github.com/NitroRCr/nyaai/issues).

On the other hand, Nya AI is currently only available as a Web version and lacks a native desktop client. This means features like cross-origin requests and local MCP are currently unavailable.

> *It would be easy to build a cross-platform client the same way we did for AIaW, so why haven't we?*
>
> Because I am still not satisfied with that solution (Tauri for desktop + CapacitorJS for mobile); there are still problems without perfect solutions. I will explore better cross-platform options when I have time before building a native client.

So, if you absolutely require these features, you can continue using AIaW for now. However, please note that AIaW will no longer receive functional updates or active maintenance. Nya AI is still in its early stages, and we will continue to add more features. We hope you will eventually migrate to Nya AI for a better experience!

## Thank You for Your Support

Every form of support—whether it’s giving us a Star, submitting an Issue, recommending us to others, subscribing to cloud sync, or simply using AIaW—is the driving force behind this project. We sincerely thank you for your support.

The AI industry is moving incredibly fast. In the past year, we have witnessed so much: MCP, Skills, Deepseek R1, Nano banana, Claude code, OpenClaw... new concepts, protocols, and products are emerging constantly.

While keeping up with the speed of AI development isn't easy, we refuse to stand still at just being a "chatbot." This is one of the reasons we built a new project—a new starting point significantly raises the ceiling of what we can achieve. We will continue to dedicate ourselves to building even better open-source AI projects and products.
