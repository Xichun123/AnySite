// aiService.js - Unified AI service supporting multiple providers

// Available AI Providers
export const AI_PROVIDERS = {
  GEMINI: 'gemini',
  ANTHROPIC: 'anthropic', // Official Anthropic API
  OPENAI: 'openai',
  XAI: 'xai', // Grok models
  OPENROUTER: 'openrouter', // Multi-model aggregator
  CLAUDE_REPLICATE: 'claude_replicate' // Legacy Replicate support
};

// Available models for each provider (Updated Oct 4, 2025 - Verified)
export const PROVIDER_MODELS = {
  gemini: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro 🧠 (Latest)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash ⚡ (Latest)' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (Preview)' },
    { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash Preview (Sep 2025)' },
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image 🎨' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental' },
    { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Legacy)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy)' }
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20251002', name: 'Claude Sonnet 4 🚀 (Oct 2, 2025)' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Sep 29, 2025)' },
    { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1 💎 (Aug 5, 2025)' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4 (May 14, 2025)' },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Feb 2025)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2 (Oct 2024)' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet v1 (Jun 2024)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Legacy)' }
  ],
  openai: [
    { id: 'gpt-4-5', name: 'GPT-4.5 🚀 (Latest - Feb 2025)' },
    { id: 'gpt-5-codex', name: 'GPT-5 Codex 💻 (Coding - Sep 2025)' },
    { id: 'o3-mini', name: 'o3-mini (Reasoning - Dec 2024)' },
    { id: 'o1', name: 'o1 (Advanced Reasoning)' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
  ],
  xai: [
    { id: 'grok-4-fast', name: 'Grok 4 Fast ⚡ (Latest - Sep 2025)' },
    { id: 'grok-3', name: 'Grok 3 🤖 (Jan 2025)' },
    { id: 'grok-3-mini', name: 'Grok 3 Mini (Fast)' },
    { id: 'grok-2', name: 'Grok 2' }
  ],
  openrouter: [
    { id: 'anthropic/claude-sonnet-4-20251002', name: 'Claude Sonnet 4 (Oct 2, 2025)' },
    { id: 'anthropic/claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Sep 29, 2025)' },
    { id: 'anthropic/claude-opus-4-1-20250805', name: 'Claude Opus 4.1 (Latest)' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'google/gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash Preview' },
    { id: 'openai/gpt-5-codex', name: 'GPT-5 Codex' },
    { id: 'openai/gpt-4-5', name: 'GPT-4.5' },
    { id: 'openai/o3-mini', name: 'o3-mini' },
    { id: 'x-ai/grok-4-fast', name: 'Grok 4 Fast' },
    { id: 'x-ai/grok-3', name: 'Grok 3' },
    { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick (400B) 🆓' },
    { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout (109B) 🆓' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B 🆓' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 🆓' },
    { id: 'qwen/qwen3-32b', name: 'Qwen3 32B 🆓' },
    { id: 'mistralai/mistral-large-2411', name: 'Mistral Large' }
  ],
  claude_replicate: [
    { id: 'claude-4.5-sonnet', name: 'Claude 4.5 Sonnet (Replicate - Latest)' },
    { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (Replicate)' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Replicate - Legacy)' }
  ]
};

// System prompts
const SYSTEM_PROMPT_ANALYZE = `
Your name is AnySite. You are an AI assistant helping a user modify web pages from a userscript.
Your task is to analyze the user's request and determine two things:
1.  A short, conversational text response to display to the user immediately. It can be dynamic and cheerful depending on the user request. You need not stick to the same words as in the examples below. Also tell the user not to switch to other tabs when processing until its completed. 
2.  Whether the request requires generating CSS or JavaScript code to modify the current web page.

The user's request might also include:
- An "existing_script_content" if they are trying to modify a script they previously created.
- A "selected_element_selector" if they have selected a specific element on the page to target.

Consider these additional pieces of information when formulating your response and deciding if code is needed.
For example, if an existing script is provided and the user asks to "make it green", your response should acknowledge the script, and is_code_needed would be true.
If the user says "this script is perfect" and provides the script, is_code_needed would be false.

**Output Format:**
- Respond ONLY with a valid JSON object.
- Do NOT include any other text, explanations, or markdown formatting.
- The JSON object must have exactly two keys:
    - "response": (string) The short, conversational text response for the user.
    - "is_code_needed": (boolean) Set to true if CSS/JS code generation is required to fulfill the request, otherwise false.

**Example Request (Simple):** "Make the background blue"
**Example JSON Output:**
{
  "response": "Okay, I can try to make the background blue.",
  "is_code_needed": true
}

**Example Request (With Element):** User wants: "Change text to red". Selected element: "h1.title"
**Example JSON Output:**
{
  "response": "Alright, I'll try to change the text of the selected H1 title to red.",
  "is_code_needed": true
}

**Example Request (With Existing Script):** User wants: "Now make it bold too". Existing script: "document.querySelector('p').style.color = 'blue';"
**Example JSON Output:**
{
  "response": "Okay, I'll try to update your modification to also make the text bold.",
  "is_code_needed": true
}

**Example Request (General Question):** "What is CSS?"
**Example JSON Output:**
{
  "response": "CSS stands for Cascading Style Sheets. It's used to describe the presentation of a document written in HTML.",
  "is_code_needed": false
}
`;

const SYSTEM_PROMPT_GENERATE = `You are an elite web development AI embedded in a userscript called AnySite. Your mission is to generate production-quality, resilient JavaScript code that modifies live websites according to user requests. Generated code will be injected directly into web pages with strict security constraints.

═══════════════════════════════════════════════════════════════════════════════
🎯 CORE OBJECTIVES
═══════════════════════════════════════════════════════════════════════════════

1. **Generate POWERFUL, enterprise-grade scripts** that work reliably across diverse websites
2. **Handle modern web architectures** (SPAs, React, Vue, Angular, Next.js, shadow DOM)
3. **Ensure security compliance** (CSP, Trusted Types, XSS prevention)
4. **Support advanced features** (AI integrations, APIs, real-time data, animations)
5. **Maintain idempotency** - scripts can be re-injected without breaking
6. **Optimize performance** - minimal DOM operations, efficient selectors, proper cleanup

═══════════════════════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT (STRICT)
═══════════════════════════════════════════════════════════════════════════════

✅ DO:
- Output ONLY raw JavaScript code
- Wrap everything in IIFE: (function() { ... })();
- Use modern ES6+ syntax (const/let, arrow functions, async/await, destructuring)

❌ DON'T:
- Include markdown formatting (\`\`\`javascript\`\`\`)
- Add explanations, comments, or apologies
- Generate CSS directly (use JS to inject <style> elements)

═══════════════════════════════════════════════════════════════════════════════
🛡️ SECURITY & SAFETY (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

**ALWAYS USE (Safe Methods):**
✓ textContent, createElement, appendChild, insertBefore, replaceChild, removeChild
✓ setAttribute (ONLY: class, style, id, data-*, href, src, alt, title, aria-*, role, placeholder)
✓ addEventListener with named functions
✓ Element.prototype methods (querySelector, querySelectorAll, classList, style)
✓ Safe APIs: fetch, ResizeObserver, IntersectionObserver, MutationObserver

**NEVER USE (Dangerous Methods):**
✗ eval(), Function constructor
✗ innerHTML, outerHTML, insertAdjacentHTML (XSS risk)
✗ document.write(), document.writeln()
✗ Inline event handlers (onclick=, setAttribute('onclick'))
✗ Creating <script> tags with text content
✗ setTimeout/setInterval with string arguments

═══════════════════════════════════════════════════════════════════════════════
🚀 MODERN WEB ARCHITECTURE HANDLING
═══════════════════════════════════════════════════════════════════════════════

**1. Dynamic Content (SPAs - React/Vue/Angular/Next.js):**
   - Use MutationObserver to detect DOM changes
   - Implement retry logic with exponential backoff
   - Handle route changes and component re-renders
   - Pattern:
   \`\`\`
   const observer = new MutationObserver(() => {
     const target = document.querySelector('...');
     if (target && !target.dataset.modified) {
       target.dataset.modified = 'true';
       // Apply modifications
     }
   });
   observer.observe(document.body, { childList: true, subtree: true });
   \`\`\`

**2. Shadow DOM Support:**
   - Check for shadowRoot: element.shadowRoot
   - Traverse shadow trees recursively
   - Pattern:
   \`\`\`
   function findInShadow(root, selector) {
     let result = root.querySelector(selector);
     if (result) return result;
     root.querySelectorAll('*').forEach(el => {
       if (el.shadowRoot) result = result || findInShadow(el.shadowRoot, selector);
     });
     return result;
   }
   \`\`\`

**3. Lazy-Loaded Content:**
   - Use IntersectionObserver for viewport-based triggers
   - Handle async data fetching delays
   - Implement loading state detection

**4. Iframe Handling:**
   - Access same-origin iframes safely
   - Check window !== window.top for iframe detection
   - Apply modifications to iframe contents when possible

═══════════════════════════════════════════════════════════════════════════════
🎨 STYLING BEST PRACTICES
═══════════════════════════════════════════════════════════════════════════════

**Method 1: Inject Global Styles (Preferred for broad changes)**
\`\`\`
(function() {
  const STYLE_ID = 'anysite-custom-style-' + Date.now();
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = \`
      .target-class { 
        property: value !important;
        /* Use !important judiciously */
      }
      @media (max-width: 768px) {
        .target-class { /* Mobile styles */ }
      }
    \`;
    (document.head || document.documentElement).appendChild(style);
  }
})();
\`\`\`

**Method 2: Direct Style Manipulation (For specific elements)**
\`\`\`
element.style.cssText = 'color: red; font-size: 16px;';
// OR
Object.assign(element.style, {
  color: 'red',
  fontSize: '16px',
  display: 'flex'
});
\`\`\`

**Method 3: CSS Classes (Most maintainable)**
- Inject style tag with class definitions
- Add/remove classes with element.classList

═══════════════════════════════════════════════════════════════════════════════
🎯 SELECTOR STRATEGIES (ROBUST)
═══════════════════════════════════════════════════════════════════════════════

**Priority Order:**
1. **IDs** - #unique-id (if truly unique)
2. **Data attributes** - [data-testid="value"], [data-component="name"]
3. **ARIA attributes** - [aria-label="value"], [role="button"]
4. **Unique class combos** - .parent .child.specific-class
5. **Tag + attribute** - button[type="submit"], input[name="search"]

**Fallback Pattern for Inputs:**
\`\`\`
const input = document.querySelector('textarea, input[type="text"], input[type="search"], [contenteditable="true"], [role="textbox"]');
\`\`\`

**Multi-Target Pattern:**
\`\`\`
const targets = Array.from(document.querySelectorAll('.class1, .class2, [data-attr]'));
targets.forEach(el => { /* modify */ });
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
⚡ PERFORMANCE OPTIMIZATION
═══════════════════════════════════════════════════════════════════════════════

1. **Batch DOM Operations:**
   - Use DocumentFragment for multiple insertions
   - Minimize reflows/repaints
   
2. **Debounce/Throttle Event Handlers:**
   \`\`\`
   function debounce(fn, ms) {
     let timeout;
     return (...args) => {
       clearTimeout(timeout);
       timeout = setTimeout(() => fn(...args), ms);
     };
   }
   \`\`\`

3. **Efficient Observers:**
   - Disconnect observers when no longer needed
   - Use specific subtree: true only when necessary
   
4. **Memory Management:**
   - Remove event listeners on cleanup
   - Clear intervals/timeouts
   - Nullify large objects

═══════════════════════════════════════════════════════════════════════════════
🤖 AI INTEGRATION PATTERNS
═══════════════════════════════════════════════════════════════════════════════

For AI-related requests (ChatGPT features, text generation, image recognition):

**Pattern 1: Browser APIs (No API key needed)**
\`\`\`
// Speech Recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.onresult = (e) => { /* handle */ };

// Text-to-Speech
const utterance = new SpeechSynthesisUtterance(text);
speechSynthesis.speak(utterance);

// File/Image Reading
const reader = new FileReader();
reader.onload = (e) => { /* process */ };
\`\`\`

**Pattern 2: Public APIs (Show API key input if needed)**
- For third-party APIs, create a UI prompt for API key
- Store in localStorage/sessionStorage temporarily
- Show clear instructions to users

**Pattern 3: On-Page AI Features**
- Text summarization: Extract text, process client-side
- Sentiment analysis: Use regex/keyword patterns
- Auto-fill: Detect patterns and suggest completions

═══════════════════════════════════════════════════════════════════════════════
🎭 ADVANCED FEATURES EXAMPLES
═══════════════════════════════════════════════════════════════════════════════

**1. Dark Mode Toggle:**
- Inject comprehensive dark styles
- Toggle body class
- Persist preference in localStorage
- Handle images/videos/iframes

**2. Element Removal/Hiding:**
- Use display: none !important or visibility: hidden
- Option to remove from DOM entirely
- Handle dynamically added elements

**3. Content Replacement:**
- Use MutationObserver for text nodes
- Implement word filters/replacements
- Preserve formatting and structure

**4. Auto-Clickers/Form Fillers:**
- Detect buttons/inputs reliably
- Trigger proper events (click, input, change)
- Handle CAPTCHAs gracefully (inform user)

**5. UI Enhancements:**
- Add floating buttons/panels
- Create tooltips/popovers
- Inject custom controls (speed controls for videos, download buttons)

**6. Data Extraction:**
- Parse structured data from page
- Format and display in custom UI
- Export options (CSV, JSON, copy to clipboard)

═══════════════════════════════════════════════════════════════════════════════
🔧 IDEMPOTENCY PATTERNS
═══════════════════════════════════════════════════════════════════════════════

**Check Before Insert:**
\`\`\`
if (!document.getElementById('my-unique-element')) {
  const el = document.createElement('div');
  el.id = 'my-unique-element';
  // ... setup
  document.body.appendChild(el);
}
\`\`\`

**Mark Modified Elements:**
\`\`\`
elements.forEach(el => {
  if (el.dataset.anysiteModified) return;
  el.dataset.anysiteModified = 'true';
  // ... apply changes
});
\`\`\`

**Single Observer Instance:**
\`\`\`
if (!window.anysiteObserver) {
  window.anysiteObserver = new MutationObserver(callback);
  window.anysiteObserver.observe(document.body, config);
}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
📝 CONTEXT-AWARE GENERATION
═══════════════════════════════════════════════════════════════════════════════

When user provides:
- **selected_element_selector**: Target this element specifically, validate it exists
- **existing_script_content**: Modify/extend this code, maintain its structure and patterns
- **Non-technical language**: Interpret intent, choose appropriate implementation

Remember: Users are often non-technical. Create scripts that:
- Work reliably without configuration
- Provide clear visual feedback
- Handle errors gracefully (don't break the page)
- Include helpful UI elements when needed (buttons, indicators, messages)

**Example Request:** "Make all links on the page open in a new tab"
**Example JS Output:**
(function() {
function modifyLinks() {
document.querySelectorAll('a[href]').forEach(link => {
if (link.href.startsWith('http') && link.target !== '_blank') {
link.setAttribute('target', '_blank');
link.setAttribute('rel', 'noopener noreferrer');
}
});
}
const observer = new MutationObserver(modifyLinks);
observer.observe(document.body, { childList: true, subtree: true });
modifyLinks();
})();`;

// Configuration Storage Keys
export const CONFIG_KEYS = {
  PROVIDER: 'anysite_ai_provider',
  MODEL: 'anysite_ai_model',
  API_KEY: 'anysite_api_key',
  USE_CUSTOM_MODEL: 'anysite_use_custom_model',
  CUSTOM_MODEL_NAME: 'anysite_custom_model_name'
};

// Get AI configuration from chrome storage
export async function getAIConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      CONFIG_KEYS.PROVIDER, 
      CONFIG_KEYS.MODEL, 
      CONFIG_KEYS.API_KEY,
      CONFIG_KEYS.USE_CUSTOM_MODEL,
      CONFIG_KEYS.CUSTOM_MODEL_NAME
    ], (result) => {
      resolve({
        provider: result[CONFIG_KEYS.PROVIDER] || AI_PROVIDERS.GEMINI,
        model: result[CONFIG_KEYS.MODEL] || 'gemini-2.5-pro',
        apiKey: result[CONFIG_KEYS.API_KEY] || '',
        useCustomModel: result[CONFIG_KEYS.USE_CUSTOM_MODEL] || false,
        customModelName: result[CONFIG_KEYS.CUSTOM_MODEL_NAME] || ''
      });
    });
  });
}

// Save AI configuration to chrome storage
export async function saveAIConfig(provider, model, apiKey, useCustomModel = false, customModelName = '') {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({
      [CONFIG_KEYS.PROVIDER]: provider,
      [CONFIG_KEYS.MODEL]: model,
      [CONFIG_KEYS.API_KEY]: apiKey,
      [CONFIG_KEYS.USE_CUSTOM_MODEL]: useCustomModel,
      [CONFIG_KEYS.CUSTOM_MODEL_NAME]: customModelName
    }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Backward compatibility - keep old function names but map to new ones
export async function getApiKeys() {
  const config = await getAIConfig();
  return {
    gemini: config.provider === AI_PROVIDERS.GEMINI ? config.apiKey : '',
    claude: config.provider === AI_PROVIDERS.CLAUDE ? config.apiKey : ''
  };
}

export async function saveApiKeys(geminiKey, claudeKey) {
  // This is for backward compatibility - not used in new UI
  const key = geminiKey || claudeKey;
  const provider = geminiKey ? AI_PROVIDERS.GEMINI : AI_PROVIDERS.CLAUDE;
  const model = geminiKey ? 'gemini-2.5-flash' : 'claude-4.5-sonnet';
  return saveAIConfig(provider, model, key);
}

// Unified analyze prompt function - works with any provider
export async function analyzePrompt(prompt, selectedElementSelector = '', existingScriptContent = '') {
  const config = await getAIConfig();
  
  if (!config.apiKey) {
    throw new Error('API key not configured. Please configure it in Settings → API Keys.');
  }

  // Construct the full prompt
  let fullUserPrompt = `User wants: "${prompt}"`;
  if (selectedElementSelector) {
    fullUserPrompt += `\nSelected element: "${selectedElementSelector}"`;
  }
  if (existingScriptContent) {
    fullUserPrompt += `\nExisting script to consider: "${existingScriptContent}"`;
  }

  // Use custom model name if enabled
  const modelToUse = config.useCustomModel && config.customModelName ? config.customModelName : config.model;
  const configWithModel = { ...config, model: modelToUse };

  try {
    if (config.provider === AI_PROVIDERS.GEMINI) {
      return await analyzeWithGemini(configWithModel, fullUserPrompt);
    } else if (config.provider === AI_PROVIDERS.ANTHROPIC) {
      return await analyzeWithAnthropic(configWithModel, fullUserPrompt);
    } else if (config.provider === AI_PROVIDERS.OPENAI) {
      return await analyzeWithOpenAI(configWithModel, fullUserPrompt);
    } else if (config.provider === AI_PROVIDERS.XAI) {
      return await analyzeWithXAI(configWithModel, fullUserPrompt);
    } else if (config.provider === AI_PROVIDERS.OPENROUTER) {
      return await analyzeWithOpenRouter(configWithModel, fullUserPrompt);
    } else if (config.provider === AI_PROVIDERS.CLAUDE_REPLICATE) {
      return await analyzeWithClaudeReplicate(configWithModel, fullUserPrompt);
    } else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }
  } catch (error) {
    console.error('Error in analyzePrompt:', error);
    throw error;
  }
}

// Analyze with Gemini
async function analyzeWithGemini(config, fullUserPrompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT_ANALYZE }]
      },
      {
        role: 'model',
        parts: [{ text: 'Okay, I understand the JSON format and how to consider existing scripts or selected elements. Ready for the user\'s request.' }]
      },
      {
        role: 'user',
        parts: [{ text: fullUserPrompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
    if (typeof parsed.response === 'string' && typeof parsed.is_code_needed === 'boolean') {
      return parsed;
    }
  }
  
  throw new Error('Unexpected response format from Gemini');
}

// Analyze with Claude (via Replicate) - Legacy
async function analyzeWithClaudeReplicate(config, fullUserPrompt) {
  const endpoint = 'https://api.replicate.com/v1/models/anthropic/' + config.model + '/predictions';

  const requestBody = {
    input: {
      prompt: fullUserPrompt + '\n\nRespond ONLY with valid JSON in this format: {"response": "your response", "is_code_needed": true/false}',
      system_prompt: SYSTEM_PROMPT_ANALYZE,
      max_tokens: 1000
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Prefer': 'wait'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  let text = Array.isArray(data.output) ? data.output.join('') : data.output.toString();
  
  const parsed = JSON.parse(text);
  if (typeof parsed.response === 'string' && typeof parsed.is_code_needed === 'boolean') {
    return parsed;
  }
  
  throw new Error('Unexpected response format from Claude');
}

// Analyze with OpenAI
async function analyzeWithOpenAI(config, fullUserPrompt) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const requestBody = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_ANALYZE },
      { role: 'user', content: fullUserPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  
  if (text) {
    const parsed = JSON.parse(text);
    if (typeof parsed.response === 'string' && typeof parsed.is_code_needed === 'boolean') {
      return parsed;
    }
  }
  
  throw new Error('Unexpected response format from OpenAI');
}

// Analyze with Anthropic (Official API)
async function analyzeWithAnthropic(config, fullUserPrompt) {
  const endpoint = 'https://api.anthropic.com/v1/messages';

  const requestBody = {
    model: config.model,
    max_tokens: 1000,
    system: SYSTEM_PROMPT_ANALYZE,
    messages: [
      { role: 'user', content: fullUserPrompt }
    ]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  
  if (text) {
    const parsed = JSON.parse(text);
    if (typeof parsed.response === 'string' && typeof parsed.is_code_needed === 'boolean') {
      return parsed;
    }
  }
  
  throw new Error('Unexpected response format from Anthropic');
}

// Analyze with xAI (Grok)
async function analyzeWithXAI(config, fullUserPrompt) {
  const endpoint = 'https://api.x.ai/v1/chat/completions';

  const requestBody = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_ANALYZE },
      { role: 'user', content: fullUserPrompt }
    ],
    temperature: 0.3,
    max_tokens: 1000
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  
  if (text) {
    const parsed = JSON.parse(text);
    if (typeof parsed.response === 'string' && typeof parsed.is_code_needed === 'boolean') {
      return parsed;
    }
  }
  
  throw new Error('Unexpected response format from xAI');
}

// Analyze with OpenRouter
async function analyzeWithOpenRouter(config, fullUserPrompt) {
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  const requestBody = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_ANALYZE },
      { role: 'user', content: fullUserPrompt }
    ],
    temperature: 0.3,
    max_tokens: 1000
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://github.com/Xichun123/magix-extension',
      'X-Title': 'AnySite'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  
  if (text) {
    const parsed = JSON.parse(text);
    if (typeof parsed.response === 'string' && typeof parsed.is_code_needed === 'boolean') {
      return parsed;
    }
  }
  
  throw new Error('Unexpected response format from OpenRouter');
}

// Unified generate script function - works with any provider
export async function generateScript(userInstruction, selectedElementSelector = '', existingScriptContent = '') {
  const config = await getAIConfig();
  
  if (!config.apiKey) {
    throw new Error('API key not configured. Please configure it in Settings → API Keys.');
  }

  // Construct the prompt
  let finalPrompt = `User instruction: "${userInstruction}"`;
  
  if (selectedElementSelector) {
    finalPrompt += `\nTarget element selector: "${selectedElementSelector}"`;
  }
  
  if (existingScriptContent) {
    finalPrompt = `You are tasked with modifying an existing JavaScript script.
Below is the original script:
\`\`\`javascript
${existingScriptContent}
\`\`\`

Based on the original script, apply the following user instruction: "${userInstruction}"`;
    
    if (selectedElementSelector) {
      finalPrompt += `\nThe user has also specified a target element selector for this modification: "${selectedElementSelector}"`;
    }
    
    finalPrompt += `\n\nYour response should be the complete, new version of the script with the modifications applied. Adhere strictly to all guidelines in your system prompt.`;
  }

  // Use custom model name if enabled
  const modelToUse = config.useCustomModel && config.customModelName ? config.customModelName : config.model;
  const configWithModel = { ...config, model: modelToUse };

  try {
    if (config.provider === AI_PROVIDERS.GEMINI) {
      return await generateWithGemini(configWithModel, finalPrompt);
    } else if (config.provider === AI_PROVIDERS.ANTHROPIC) {
      return await generateWithAnthropic(configWithModel, finalPrompt);
    } else if (config.provider === AI_PROVIDERS.OPENAI) {
      return await generateWithOpenAI(configWithModel, finalPrompt);
    } else if (config.provider === AI_PROVIDERS.XAI) {
      return await generateWithXAI(configWithModel, finalPrompt);
    } else if (config.provider === AI_PROVIDERS.OPENROUTER) {
      return await generateWithOpenRouter(configWithModel, finalPrompt);
    } else if (config.provider === AI_PROVIDERS.CLAUDE_REPLICATE) {
      return await generateWithClaudeReplicate(configWithModel, finalPrompt);
    } else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }
  } catch (error) {
    console.error('Error in generateScript:', error);
    throw error;
  }
}

// Generate with Gemini
async function generateWithGemini(config, finalPrompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT_GENERATE }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I will generate only raw JavaScript code following all the guidelines.' }]
      },
      {
        role: 'user',
        parts: [{ text: finalPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8000
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const generatedCode = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  if (!generatedCode) {
    throw new Error('No code generated from Gemini');
  }

  return { generatedCode: generatedCode.trim() };
}

// Generate with Claude (via Replicate) - Legacy
async function generateWithClaudeReplicate(config, finalPrompt) {
  const endpoint = 'https://api.replicate.com/v1/models/anthropic/' + config.model + '/predictions';

  const requestBody = {
    input: {
      prompt: finalPrompt,
      system_prompt: SYSTEM_PROMPT_GENERATE,
      max_tokens: 64000
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Prefer': 'wait'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  let generatedCode = '';
  if (data.output) {
    if (Array.isArray(data.output)) {
      generatedCode = data.output.join('');
    } else {
      generatedCode = data.output.toString();
    }
  } else {
    throw new Error('Unexpected response format from Claude');
  }

  return { generatedCode: generatedCode.trim() };
}

// Generate with OpenAI
async function generateWithOpenAI(config, finalPrompt) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const requestBody = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_GENERATE },
      { role: 'user', content: finalPrompt }
    ],
    temperature: 0.7,
    max_tokens: 8000
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const generatedCode = data.choices?.[0]?.message?.content || '';
  
  if (!generatedCode) {
    throw new Error('No code generated from OpenAI');
  }

  return { generatedCode: generatedCode.trim() };
}

// Generate with Anthropic (Official API)
async function generateWithAnthropic(config, finalPrompt) {
  const endpoint = 'https://api.anthropic.com/v1/messages';

  const requestBody = {
    model: config.model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT_GENERATE,
    messages: [
      { role: 'user', content: finalPrompt }
    ]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  let text = data.content?.[0]?.text || '';

  // Extract code from markdown
  const codeMatch = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
  let generatedCode = codeMatch ? codeMatch[1].trim() : text.trim();

  if (!generatedCode) {
    throw new Error('No code generated from Anthropic');
  }

  return { generatedCode: generatedCode.trim() };
}

// Generate with xAI (Grok)
async function generateWithXAI(config, finalPrompt) {
  const endpoint = 'https://api.x.ai/v1/chat/completions';

  const requestBody = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_GENERATE },
      { role: 'user', content: finalPrompt }
    ],
    temperature: 0.3,
    max_tokens: 4096
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || '';

  // Extract code from markdown
  const codeMatch = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
  let generatedCode = codeMatch ? codeMatch[1].trim() : text.trim();

  if (!generatedCode) {
    throw new Error('No code generated from xAI');
  }

  return { generatedCode: generatedCode.trim() };
}

// Generate with OpenRouter
async function generateWithOpenRouter(config, finalPrompt) {
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  const requestBody = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_GENERATE },
      { role: 'user', content: finalPrompt }
    ],
    temperature: 0.3,
    max_tokens: 4096
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://github.com/Xichun123/magix-extension',
      'X-Title': 'AnySite'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || '';

  // Extract code from markdown
  const codeMatch = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
  let generatedCode = codeMatch ? codeMatch[1].trim() : text.trim();

  if (!generatedCode) {
    throw new Error('No code generated from OpenRouter');
  }

  return { generatedCode: generatedCode.trim() };
}
