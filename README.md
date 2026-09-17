# AnySite

AnySite is a Tampermonkey userscript for modifying websites through natural-language AI instructions. It runs locally in the browser, sends requests directly to the AI provider selected by the user, and stores generated scripts and chat history in Tampermonkey storage.

## Features

- Natural-language website modification
- JavaScript and CSS generation
- Element selection from the current page
- Per-site script activation and persistence
- Local chat and script history
- Multiple AI providers and custom model names
- No account, hosted backend, telemetry, or cloud database

## Requirements

- A browser supported by Tampermonkey
- Tampermonkey
- Node.js and npm for local builds
- An API key for a supported AI provider

## Build

```bash
git clone https://github.com/Xichun123/magix-extension.git
cd magix-extension
npm install
npm run build
```

The build runs in two stages:

1. `npm run build:panel` bundles the React panel into the temporary `.build/` directory.
2. `npm run build:host` embeds the panel and produces `dist/anysite.user.js`.

Build order matters because the host bundle imports the generated panel bundle. Use `npm run build` for a clean build. The only installable file in `dist/` is `anysite.user.js`.

## Install

1. Build the project.
2. Open the Tampermonkey dashboard.
3. Install `dist/anysite.user.js`.
4. Open any supported website and click the AnySite button.
5. Open Settings, select an AI provider, enter an API key, and save.

AnySite can also be opened from the Tampermonkey menu with `Open AnySite Panel`.

## Development

```bash
npm run dev          # watch the panel bundle
npm run build        # build panel and userscript
npm test             # run bridge and local-storage tests
```

## Project Structure

```text
host/                  Tampermonkey host runtime
  host.js              Entry point and script dispatcher
  db.js                GM-backed local storage
  bridgeServer.js      Panel-to-host messaging and GM API access
  panel.js             Isolated iframe panel manager
  fab.js               Floating AnySite button
  elementSelector.js   Page element selection
panel/                 React interface, AI integrations, and host API shim
shared/                Shared code utilities
test/                  Bridge and local data end-to-end tests
vite.panel.config.js   Panel build configuration
vite.host.config.js    Userscript build configuration
```

## Local Data

AnySite does not read legacy project data. Its primary Tampermonkey storage keys are:

- `anysite_scripts`
- `anysite_chats`
- `anysite_ai_provider`
- `anysite_ai_model`
- `anysite_api_key`
- `anysite_use_custom_model`
- `anysite_custom_model_name`

API requests are sent directly from the userscript to the configured provider through `GM_xmlhttpRequest`. API keys and local history are not sent to an AnySite backend.

## Supported Providers

- Google Gemini
- Anthropic Claude
- OpenAI
- xAI
- OpenRouter
- Replicate

Available models are configured in `panel/aiService.js`.

## Limitations

- Data is local to the current Tampermonkey/browser profile.
- There is no built-in cloud sync or community sharing.
- The userscript is excluded from domains configured in `vite.host.config.js`.
- Generated scripts execute on matching websites. Review generated behavior and only use API keys you control.

## License

Licensed under the [MIT License](./LICENSE). The license file retains the copyright notice required by the upstream license.
