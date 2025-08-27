

***

# Website Automation Agent

Automate any browser task using an OpenAI-powered agent and Playwright. Let the agent handle navigation, clicking, form filling, and screenshot analysis for end-to-end web workflow automation.

***

## Demo

Check out a walkthrough of this agent in action:

[Watch Demo Video](https://drive.google.com/file/d/10ouEvqlGbrhLH0I79jdar2pn_cAY23zN/view)

***

## Features

- Automates navigation, clicking, typing, and scrolling in your browser
- Uses OpenAI Vision and Playwright for visual page analysis
- Adapts between CSS selectors and coordinates for interactive reliability
- Comprehensive toolset for web UI automation
- Smart error-handling and adaptive retries

***

## Installation

```bash
git clone https://github.com/yourusername/agent_sdk.git
cd agent_sdk
npm install
```
Create a `.env` file:
```
OPENAI_API_KEY=your-api-key-here
```

***

## Usage Guide

```js
import 'dotenv/config';
// ...rest of main JS file
chatWithAgent(`
    Open ui.chaicode.com
    Locate the login section automatically via screenshot
    click on it and after locating form via screenshot
    Fill in the necessary details:
    - email: example@gmail.com
    - password: 123456
    Click the action/submit button
`)
```

***

## Tools Overview

| Tool Name                 | Description                                   |
|---------------------------|-----------------------------------------------|
| `open_browser`            | Launches a Chromium browser window            |
| `open_url`                | Opens any website URL in the browser          |
| `get_page_info_via_ss`    | Screenshot + Vision AI page analysis          |
| `click_element_via_css`   | Clicks element by CSS selector                |
| `click_screen`            | Clicks any desired screen coordinates         |
| `send_keys`               | Types text in input fields                    |
| `double_click`            | Double-clicks specified coordinates           |
| `scroll`                  | Scrolls vertically by pixel count             |

***

## Example Workflow

1. **open_browser**
2. **open_url({url: 'your.site.com'})**
3. **get_page_info_via_ss({query: 'Describe page structure'})**
4. **click_element_via_css({selector: 'text=Sign Up'})** _(fallbacks to coordinates if not found)_
5. **send_keys({selector: 'input[type="email"]', text: 'john@example.com'})**
6. **send_keys({selector: 'input[type="password"]', text: '123456'})**
7. **click_element_via_css({selector: 'form button[type="submit"]'})**

Each step is verified and retried if needed for robust automation.

***

## Environment Variables

- `OPENAI_API_KEY` – OpenAI API access key

***

## Troubleshooting

- **Viewport**: Default 1280x720. Adjust screen coordinates accordingly.
- **Dependency errors**: Run `npm install` to ensure all modules are present.
- **Browser not launching**: Confirm Playwright browser binaries are installed.

***

For more information, check source files and package.json for requirements.

***


