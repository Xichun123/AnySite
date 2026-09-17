import React, { useState, useEffect, useRef } from 'react';
import * as localDb from './localDb';
import { detectCodeType, stripCodeFence } from '../shared/code';
import { analyzePrompt, generateScript, getAIConfig, saveAIConfig, AI_PROVIDERS, PROVIDER_MODELS } from './aiService'; // Import local AI service
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
// import ListItem from '@mui/material/ListItem'; // Replaced by ListItemButton for script list
import ListItemText from '@mui/material/ListItemText';
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Profile icon
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'; // Submit icon
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Back icon
import MyLocationIcon from '@mui/icons-material/MyLocation'; // Crosshair/Select icon
import DeleteIcon from '@mui/icons-material/Delete'; // Import Delete icon
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Popover from '@mui/material/Popover';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon'; // Added for modal list icons
import Tabs from '@mui/material/Tabs'; // For settings screen
import Tab from '@mui/material/Tab';   // For settings screen
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress'; // For usage bar
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; // Import Copy icon
import { ListItem } from '@mui/material'; // Keep for Popover
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CloseIcon from '@mui/icons-material/Close';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

// Add pulse animation styles
const pulseKeyframes = `
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.02); }
    100% { opacity: 1; transform: scale(1); }
  }
`;

// Inject the styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = pulseKeyframes;
  document.head.appendChild(styleSheet);
}


// TabPanel component for settings screen
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

// Placeholder suggestions for animation
const placeholderSuggestions = [
  "Add a stopwatch on X",
  "Turn all fonts into comic sans",
  "Place a text to speech button on this blog",
  "Change the theme of this website to cyberpunk vibes",
];


function App() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currentView, setCurrentView] = useState('home');
  const [messages, setMessages] = useState([]);
  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const [accountMenuAnchorEl, setAccountMenuAnchorEl] = useState(null);
  const [settingsTab, setSettingsTab] = useState(0);
  const [aiProvider, setAiProvider] = useState(AI_PROVIDERS.GEMINI);
  const [aiModel, setAiModel] = useState('gemini-2.5-pro-preview');
  const [apiKey, setApiKey] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState('');
  const [userScripts, setUserScripts] = useState([]);
  const [activeScripts, setActiveScripts] = useState([]); // Scripts currently registered in browser
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const [selectedElementPath, setSelectedElementPath] = useState('');

  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentScriptContentForChat, setCurrentScriptContentForChat] = useState('');
  const [currentChatTitle, setCurrentChatTitle] = useState('');
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [currentScriptTitle, setCurrentScriptTitle] = useState('');

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');

  // State for delete confirmation dialog
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [scriptPendingDeletion, setScriptPendingDeletion] = useState(null);
  const triggerRef = useRef(null); // Ref to store the element that triggered the dialog

  const fetchUserScripts = async () => {
    try {
      const data = await localDb.listScripts();
      setUserScripts(data || []);
    } catch (fetchError) {
      console.error("Error fetching user scripts:", fetchError);
      setError(`Failed to load your scripts: ${fetchError.message}`);
      setUserScripts([]);
    }
  };

  const fetchActiveScripts = async () => {
    try {
      chrome.runtime.sendMessage({
        type: 'GET_REGISTERED_SCRIPTS'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Could not fetch registered scripts:", chrome.runtime.lastError.message);
          setActiveScripts([]);
        } else if (response && response.success) {
          // console.log("Active scripts:", response.scripts);
          setActiveScripts(response.scripts || []);
        } else {
          console.warn("Failed to fetch registered scripts:", response?.error);
          setActiveScripts([]);
        }
      });
    } catch (error) {
      console.error("Error fetching active scripts:", error);
      setActiveScripts([]);
    }
  };

  // Function to get only active scripts to display
  const getDisplayedScripts = () => {
    // Always show only scripts that are currently active/registered
    const activeScriptIds = new Set(activeScripts.map(script => script.id));
    return userScripts.filter(script => activeScriptIds.has(script.id));
  };

  // Load AI config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getAIConfig();
        setAiProvider(config.provider);
        setAiModel(config.model);
        setApiKey(config.apiKey);
        setUseCustomModel(config.useCustomModel || false);
        setCustomModelName(config.customModelName || '');
      } catch (error) {
        console.error('Error loading AI config:', error);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    fetchUserScripts();
    fetchActiveScripts();
  }, []);

  // Effect to load chat data when currentChatId changes
  useEffect(() => {
    const loadChatData = async () => {
      if (currentChatId) {
        setIsLoading(true);
        setError(null);
        try {
          const chatData = await localDb.getChat(currentChatId);

          if (chatData) {
            setCurrentChatTitle(chatData.title || 'Chat');
            const scripts = await localDb.listScripts();
            const scriptRow = chatData.script_id ? scripts.find((s) => s.id === chatData.script_id) : null;
            setCurrentScriptContentForChat(scriptRow?.code || '');

            setMessages(
              (chatData.messages || []).map((msg) => ({
                id: msg.id,
                sender: msg.sender,
                text: msg.text,
                status: msg.status,
                chat_id: chatData.id,
              }))
            );
            setCurrentView('chat');
          } else {
            setError("Could not load the selected chat or chat not found.");
            setCurrentChatId(null); // Reset if chat is invalid
            setCurrentView('home');
          }
        } catch (e) {
          console.error("Error loading chat data:", e);
          setError(`Failed to load chat: ${e.message}`);
        } finally {
          setIsLoading(false);
        }
      } else if (!currentChatId && currentView === 'chat') {
        // If currentChatId becomes null (e.g., user clicks back from chat), go home
        setCurrentView('home');
        setMessages([]);
        setCurrentScriptContentForChat('');
        setCurrentChatTitle('');
      }
    };
    loadChatData();
  }, [currentChatId]);

  // When entering a chat, fetch its script_id and set
  useEffect(() => {
    if (!currentChatId) return;
    (async () => {
      try {
        const chatRow = await localDb.getChat(currentChatId);
        const scriptId = chatRow?.script_id || null;
        setCurrentScriptId(scriptId);

        if (scriptId) {
          const scripts = await localDb.listScripts();
          const scriptRow = scripts.find((s) => s.id === scriptId);
          setCurrentScriptTitle(scriptRow?.title || '');
        } else {
          setCurrentScriptTitle('');
        }
      } catch (e) {
        console.warn('Could not fetch chat/script details:', e.message);
      }
    })();
  }, [currentChatId]);


  useEffect(() => {
    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'ELEMENT_SELECTED') {
        setSelectedElementPath(message.selector || '');
        setIsSelectingElement(false);
        sendResponse({ status: "Selector received by panel" });
        return true;
      }
      return false;
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  useEffect(() => {
    if (currentView === 'chat') chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentView]);

  useEffect(() => {
    if (currentView !== 'home' || currentChatId) {
      setAnimatedPlaceholder(''); return;
    }
    let timeoutId;
    if (subIndex < placeholderSuggestions[placeholderIndex].length && !reverse) {
      timeoutId = setTimeout(() => { setAnimatedPlaceholder(p => p + placeholderSuggestions[placeholderIndex][subIndex]); setSubIndex(i => i + 1); }, 100);
    } else if (subIndex === placeholderSuggestions[placeholderIndex].length && !reverse) {
      timeoutId = setTimeout(() => setReverse(true), 1500);
    } else if (subIndex > 0 && reverse) {
      timeoutId = setTimeout(() => { setAnimatedPlaceholder(p => p.slice(0, -1)); setSubIndex(i => i - 1); }, 50);
    } else if (subIndex === 0 && reverse) {
      setReverse(false); setPlaceholderIndex(i => (i + 1) % placeholderSuggestions.length);
    }
    return () => clearTimeout(timeoutId);
  }, [subIndex, placeholderIndex, reverse, currentView, currentChatId]);

  const handleAccountMenuOpen = (event) => setAccountMenuAnchorEl(event.currentTarget);
  const handleAccountMenuClose = () => setAccountMenuAnchorEl(null);
  const openAccountMenu = Boolean(accountMenuAnchorEl);
  const accountMenuId = openAccountMenu ? 'account-popover' : undefined;
  const handleSettingsTabChange = (event, newValue) => setSettingsTab(newValue);

  const handleSaveApiConfig = async () => {
    setApiKeySaveStatus('saving');
    setError(null);
    try {
      await saveAIConfig(aiProvider, aiModel, apiKey.trim(), useCustomModel, customModelName.trim());
      setApiKeySaveStatus('success');
      setTimeout(() => setApiKeySaveStatus(''), 3000);
    } catch (e) {
      console.error('Error saving AI config:', e);
      setError(`Failed to save configuration: ${e.message}`);
      setApiKeySaveStatus('error');
      setTimeout(() => setApiKeySaveStatus(''), 3000);
    }
  };

  const handleProviderChange = (newProvider) => {
    setAiProvider(newProvider);
    // Set default model for the new provider
    const defaultModel = PROVIDER_MODELS[newProvider][0].id;
    setAiModel(defaultModel);
  };

  const handleInputChange = (event) => setInputValue(event.target.value);

  const handleSubmit = async () => {
    if (isLoading) return;
    const originalMessageText = inputValue.trim();
    if (!originalMessageText && !currentChatId) return;

    const userId = 'local';

    // Check if API key is configured before proceeding
    const config = await getAIConfig();
    if (!config.apiKey || config.apiKey.trim() === '') {
      setError('Please configure your API key in Settings → API Keys before using AnySite.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInputValue('');

    let activeChatId = currentChatId;
    let scriptContentForThisInteraction = currentScriptContentForChat;
    let isNewChat = false;

    try {
      // No usage limits - users bring their own API keys!

      if (!activeChatId) {
        isNewChat = true;
        const chatTitle = originalMessageText.substring(0, 75) + (originalMessageText.length > 75 ? '...' : '');
        const newChatData = await localDb.createChat(chatTitle);
        if (!newChatData) throw new Error("Failed to create chat.");
        activeChatId = newChatData.id;
        setCurrentChatId(activeChatId);
        setCurrentChatTitle(chatTitle);
        setCurrentScriptContentForChat('');
        scriptContentForThisInteraction = '';
        setMessages([]);
      }

      await localDb.addMessage(activeChatId, 'user', originalMessageText);
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: originalMessageText, chat_id: activeChatId }]);
      if(currentView !== 'chat') setCurrentView('chat');

      let promptForBackend = originalMessageText;
      const currentSelectedElemPath = selectedElementPath;
      if (currentSelectedElemPath) {
        promptForBackend = `${originalMessageText} (Selected Element: ${currentSelectedElemPath})`;
        setSelectedElementPath('');
      }

      const analysis = await analyzePrompt(promptForBackend, currentSelectedElemPath, scriptContentForThisInteraction);
      if (!analysis || typeof analysis.response !== 'string' || typeof analysis.is_code_needed !== 'boolean') throw new Error("Unexpected analysis response.");

      await localDb.addMessage(activeChatId, 'ai', analysis.response);
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, sender: 'assistant', text: analysis.response, chat_id: activeChatId }]);

      if (analysis.is_code_needed) {
        const procId = `proc-${Date.now()}`;
        setMessages(prev => [...prev, { id: procId, sender: 'assistant', status: 'processing', chat_id: activeChatId }]);
        try {
          const script = await generateScript(promptForBackend, currentSelectedElemPath, scriptContentForThisInteraction);
          if (script?.generatedCode) {
            const newCode = stripCodeFence(script.generatedCode);
            setCurrentScriptContentForChat(newCode);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error("No active tab.");
            const type = detectCodeType(newCode);

            // Save or update first so registration uses the persisted script ID.
            const savedScriptId = await saveScriptLocal(
              userId,
              newCode,
              originalMessageText,
              tab.url,
              activeChatId,
              !isNewChat && !!scriptContentForThisInteraction // isUpdating flag
            );

            if (!savedScriptId) {
              console.error("Stopping handleSubmit: Failed to save the script.");
              return;
            }

            // 2. Inject/Register based on type, using the savedScriptId for JS registration
            if (type === 'CSS') {
              // Inject CSS directly
              await chrome.scripting.insertCSS({ target: { tabId: tab.id }, css: newCode });
              // console.log(`CSS injected for script ${savedScriptId}`);
              // CSS doesn't need separate registration via background script currently
              if (savedScriptId) { // Ensure DB save was successful before adding success message
                // Auto-refresh the current tab to show changes immediately
                chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                  if (activeTab?.id) {
                    chrome.tabs.reload(activeTab.id);
                  }
                });
                
                setMessages(prev => [...prev, { 
                  id: `ai-code-success-${Date.now()}`, 
                  sender: 'assistant',
                  text: 'Perfect! Your modification has been applied. Take a look and let me know what you think or if there\'s anything else you\'d like to change!', 
                  chat_id: activeChatId 
                }]);
              }
            } else {
              // Register JS using the database ID
              chrome.runtime.sendMessage({
                type: 'REGISTER_USER_SCRIPT',
                scriptId: savedScriptId, // Pass the database ID
                code: newCode,
                targetUrl: tab.url
              }, (res) => {
                if (chrome.runtime.lastError || (res && !res.success)) {
                  const eMsg = chrome.runtime.lastError?.message || res?.error || "Unknown script registration error.";
                  console.error(`Script registration failed for ${savedScriptId}: ${eMsg}`);
                  setError(`Script registration failed: ${eMsg}`);
                  setMessages(p => [...p, {id: `err-${Date.now()}`, sender:'assistant', text: `Script registration error: ${eMsg}`, chat_id: activeChatId}]);
                } else if (res?.success) {
                  // Refresh active scripts list after successful registration
                  fetchActiveScripts();
                  
                  // Auto-refresh the current tab to show changes immediately
                  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                    if (activeTab?.id) {
                      chrome.tabs.reload(activeTab.id);
                    }
                  });
                  
                  setMessages(prev => [...prev, { 
                    id: `ai-code-success-${Date.now()}`, 
                    sender: 'assistant',
                    text: 'Perfect! Your modification has been applied. Take a look and let me know what you think or if there\'s anything else you\'d like to change!', 
                    chat_id: activeChatId 
                  }]);
                }
              });
            }
          } else throw new Error("Unexpected code format.");
        } catch (e) {
          setError(`Script error: ${e.message}`);
          setMessages(p => [...p, {id: `err-${Date.now()}`, sender:'assistant', text: `Script error: ${e.message}`, chat_id: activeChatId}]);
        } finally {
          setMessages(p => p.filter(m => m.id !== procId));
        }
      }

      // No usage tracking needed - users manage their own API costs!

    } catch (e) {
      setError(`Error: ${e.message}`);
      setMessages(p => [...p, {id: `err-${Date.now()}`, sender:'assistant', text: `Error: ${e.message}`, chat_id: activeChatId || 'unknown'}]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveScriptLocal = async (userId, code, promptText, tabUrl, chatId, isUpdatingExistingScriptInChat = false) => {
    let domain = '*';
    try { if (tabUrl && !tabUrl.startsWith('chrome://')) domain = new URL(tabUrl).hostname; } catch (e) { console.error("URL parse error:", e); }
    let scriptIdToReturn = null; // Variable to hold the ID to return

    try {
      if (isUpdatingExistingScriptInChat && chatId) {
        // --- 更新已有脚本 ---
        const chat = await localDb.getChat(chatId);
        if (!chat?.script_id) throw new Error("Chat is not linked to a script, cannot update.");

        const scriptId = chat.script_id;
        await localDb.updateScriptCode(scriptId, code);

        setCurrentScriptContentForChat(code);
        fetchUserScripts();
        scriptIdToReturn = scriptId;
      } else {
        // --- 新建脚本 ---
        const title = promptText.substring(0, 50) + (promptText.length > 50 ? '...' : '');
        const newScript = await localDb.createScript({ code, title, domain });
        if (!newScript?.id) throw new Error("Failed to save new script.");

        scriptIdToReturn = newScript.id;
        setCurrentScriptContentForChat(code);

        if (chatId) {
          await localDb.linkChatScript(chatId, scriptIdToReturn);
        }
        fetchUserScripts();
      }
    } catch (e) {
      console.error("Error in saveScriptLocal:", e);
      setError(e.message || "An unknown error occurred while saving the script.");
      scriptIdToReturn = null; // Ensure null is returned on error
    }

    return scriptIdToReturn; // Return the ID (or null if error occurred)
  };

  const handleScriptItemClick = async (script) => {
    setIsLoading(true); setError(null);

    try {
      const chats = await localDb.listChats();
      const existing = chats.find((c) => c.script_id === script.id);

      if (existing) {
        setCurrentChatId(existing.id); // 触发 useEffect 加载消息并切换视图
      } else {
        const newChatTitle = script.title || 'Chat about script';
        const newChatData = await localDb.createChat(newChatTitle);
        await localDb.linkChatScript(newChatData.id, script.id);

        setCurrentChatId(newChatData.id);
        setCurrentChatTitle(newChatData.title);
        setCurrentScriptContentForChat(script.code || '');
        setMessages([]);
        setCurrentView('chat');
      }
    } catch (e) {
      console.error("Error in handleScriptItemClick:", e);
      setError(`Failed to process script click: ${e.message}`);
    } 
    // setIsLoading(false); // isLoading will be handled by the useEffect for currentChatId
  };

  const handleCloseConfirmDialog = () => {
    setIsConfirmDeleteDialogOpen(false);
    setScriptPendingDeletion(null);
    // Return focus after a short delay to ensure dialog is closed
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  };

  const handleConfirmDeleteScript = async () => {
    if (!scriptPendingDeletion) {
      handleCloseConfirmDialog();
      return;
    }

    const scriptToDelete = scriptPendingDeletion;
    setIsLoading(true);
    setError(null);

    try {
      // 1. 从本地存储删除
      await localDb.deleteScript(scriptToDelete.id);

      // 2. Remove script effect from browser
    chrome.runtime.sendMessage({
      type: 'REMOVE_SCRIPT_EFFECT',
      scriptId: scriptToDelete.id,
      scriptCode: scriptToDelete.code
      }, (response) => {
       if (chrome.runtime.lastError) {
          console.warn("Warning: Could not remove script effect:", chrome.runtime.lastError.message);
       } else if (response && !response.success) {
          console.warn("Warning: Script effect removal failed:", response.error);
        }
      });

      // 3. Update local state - remove from scripts list
      setUserScripts(prev => prev.filter(script => script.id !== scriptToDelete.id));
      
      // 4. Refresh active scripts to update the UI
      fetchActiveScripts();

      // 4. Handle chat cleanup if current chat is linked to this script
      if (currentChatId) {
        try {
          const chatData = await localDb.getChat(currentChatId);
          if (chatData?.script_id === scriptToDelete.id) {
            await localDb.linkChatScript(currentChatId, null);
            setCurrentScriptContentForChat('');
          }
        } catch (chatError) {
          console.warn("Warning: Could not update chat linkage:", chatError.message);
        }
      }

      console.log(`Script ${scriptToDelete.id} deleted successfully`);
      
      // 5. Refresh the current tab after successful deletion
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          chrome.tabs.reload(tab.id);
        }
      } catch (refreshError) {
        console.warn("Could not refresh tab:", refreshError.message);
        // Don't show error to user since deletion was successful
      }
      
    } catch (error) {
      console.error("Error deleting script:", error);
      setError(error.message || "Failed to delete script");
    } finally {
      setIsLoading(false);
    handleCloseConfirmDialog();
    }
  };


  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const renderHomeInputArea = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', p: 1, borderRadius: 6, bgcolor: 'grey.100', border: '1px solid #e0e0e0', position: 'relative', mb: 2, pb: selectedElementPath ? '48px' : '40px' }}>
      <Chip icon={<MyLocationIcon sx={{ fontSize: '1rem', color: (isSelectingElement || selectedElementPath) ? 'primary.main' : 'grey.500' }} />} label={isSelectingElement ? "Selecting..." : selectedElementPath ? "Element Selected" : "Select Element"} size="small" variant={(isSelectingElement || selectedElementPath) ? "filled" : "outlined"} color={(isSelectingElement || selectedElementPath) ? "primary" : "default"} clickable onClick={async () => { if (isSelectingElement) return; if (selectedElementPath) { setSelectedElementPath(''); } else { setIsSelectingElement(true); setSelectedElementPath(''); setError(null); try { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_SELECTION' }, r => { if (chrome.runtime.lastError) { setError(`Selection error: ${chrome.runtime.lastError.message}`); setIsSelectingElement(false); }}); else throw new Error("No active tab."); } catch (e) { setError(`Selection error: ${e.message}`); setIsSelectingElement(false); }}}} sx={{ position: 'absolute', bottom: 8, left: 8, fontSize: '0.75rem', height: '28px', borderColor: '#e0e0e0', '& .MuiChip-label': { px: '8px' }, '& .MuiChip-icon': { ml: '6px', mr: '-4px' }}} />
      <TextField fullWidth multiline minRows={2} maxRows={3} variant="standard" placeholder={animatedPlaceholder + '|'} value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} InputProps={{ disableUnderline: true, sx: { fontSize: '0.9rem' } }} sx={{ flexGrow: 1, '& .MuiInputBase-root': { py: 0.5 } }} disabled={isLoading} />
      <IconButton onClick={handleSubmit} disabled={isLoading || (!inputValue.trim() && !currentChatId) } sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'common.black', color: 'common.white', width: 28, height: 28, borderRadius: '50%', '&:hover': { bgcolor: 'grey.800' }, '&.Mui-disabled': { backgroundColor: 'grey.300', color: 'grey.500' }}}>{isLoading ? <CircularProgress size={16} sx={{ color: 'white' }}/> : <ArrowUpwardIcon sx={{ fontSize: '1rem' }} />}</IconButton>
    </Box>
  );

  const renderChatInputArea = () => (
    <Box sx={{ p: 2, pt: 1 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        bgcolor: 'white',
        border: '1px solid', 
        borderColor: 'grey.200',
        borderRadius: 6, 
        px: 2, 
        py: 1.5,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        '&:focus-within': {
          borderColor: 'grey.400',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }
      }}>
        <TextField 
          fullWidth 
          multiline={false} 
          variant="standard" 
          placeholder="Ask AnySite to modify this page..."
          value={inputValue} 
          onChange={handleInputChange} 
          onKeyDown={handleKeyDown} 
          InputProps={{ 
            disableUnderline: true, 
            sx: { 
              fontSize: '0.9rem',
              color: 'text.primary',
              '& input::placeholder': {
                color: 'grey.400',
                opacity: 1
              }
            } 
          }} 
          sx={{ 
            '& .MuiInputBase-root': { 
              py: 0
            } 
          }} 
          disabled={isLoading} 
        />
        <IconButton 
          onClick={handleSubmit} 
          disabled={isLoading || !inputValue.trim()} 
                     sx={{ 
             bgcolor: isLoading || !inputValue.trim() ? 'grey.200' : 'common.black', 
             color: isLoading || !inputValue.trim() ? 'grey.400' : 'white', 
             width: 32, 
             height: 32, 
             ml: 1,
             borderRadius: '50%',
             '&:hover': { 
               bgcolor: isLoading || !inputValue.trim() ? 'grey.200' : 'grey.800' 
             },
             '&.Mui-disabled': { 
               backgroundColor: 'grey.200', 
               color: 'grey.400' 
             }
           }}
        >
          {isLoading ? (
            <CircularProgress size={16} sx={{ color: 'grey.400' }}/> 
          ) : (
            <ArrowUpwardIcon sx={{ fontSize: '1.1rem' }} />
          )}
        </IconButton>
      </Box>
    </Box>
  );

  const renderHomeScreen = () => {
    const displayedScripts = getDisplayedScripts();
    
    return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1, overflowY: 'auto' }}>
        <Typography variant="h6" component="h1" sx={{ 
          textAlign: 'center', 
          mb: 2, 
          fontSize: '1rem', 
          fontWeight: 400,
          color: 'grey.500',
          fontFamily: '"Instrument Serif", serif'
        }}>
          Modify Any Website
        </Typography>
      {renderHomeInputArea()}
      {(
        <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 400, color: 'grey.500', fontSize: '0.75rem' }}>Active Modifications</Typography>
          <List dense sx={{ pt: 0, maxHeight: '350px', overflowY: 'auto', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
              {displayedScripts.length > 0 ? (
                displayedScripts.map((script) => (
                <ListItemButton key={script.id} onClick={() => handleScriptItemClick(script)} sx={{ border: '1px solid #e0e0e0', borderRadius: 4, mb: 1, py: 0.5 }}>
                  <ListItemText id={`script-list-item-${script.id}`} primary={script.title} secondary={script.domain_pattern || 'All sites'} primaryTypographyProps={{ sx: { fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }} secondaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    size="small"
                    onClick={(e) => {
                      triggerRef.current = e.currentTarget; // Store the clicked button
                      e.stopPropagation(); // Prevent ListItemButton click
                      setScriptPendingDeletion(script); // Store the script object
                      setIsConfirmDeleteDialogOpen(true); // Open the dialog
                    }}
                  >
                    <DeleteIcon sx={{ color: 'grey.500', fontSize: '1.1rem' }} />
                  </IconButton>
                </ListItemButton>
              )) ) : ( 
                <Typography variant="caption" sx={{ 
                  textAlign: 'center', 
                  display: 'block', 
                  mt: 3, 
                  mx: 2,
                  fontSize: '0.75rem',
                  color: 'grey.400',
                  fontWeight: 400,
                  lineHeight: 1.4
                }}>
                  No active modifications. Create one using the input above
                </Typography> 
              )}
          </List>
         </Box>
       )}

     </Box>
   );
  };

  const renderChatScreen = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', p: 1, mb: 1, display: 'flex', alignItems: 'center' }}>
         <IconButton onClick={() => { setCurrentChatId(null); /* useEffect will handle view change */ }} size="small" sx={{ mr: 1, borderRadius: 2, '&:hover': { bgcolor: 'grey.50' } }}><ArrowBackIcon sx={{ fontSize: '1.1rem', color: 'grey.500' }} /></IconButton>
         <Typography variant="subtitle1" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 400, fontSize: '0.85rem', color: 'grey.500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentChatTitle || "Chat"}</Typography>
         <IconButton
           size="small"
           onClick={() => { chrome.runtime.sendMessage({ type: 'CLOSE_PANEL' }); }}
           sx={{ ml: 1, borderRadius: 2, '&:hover': { bgcolor: 'grey.50' } }}
           title="Close panel"
         >
           <CloseIcon sx={{ fontSize: '1.1rem', color: 'grey.500' }} />
         </IconButton>
      </Box>
      <Box ref={chatContainerRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.map((msg) => (
          <Box key={msg.id} sx={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            {msg.status === 'processing' ? ( <Paper className="shimmer-bubble" elevation={0} sx={{ px: 2, py: 1, borderRadius: 20, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', position: 'relative' }}><Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.9rem' }}>Working...</Typography></Paper>
            ) : msg.sender === 'user' ? ( <Paper elevation={0} sx={{ p: 1.5, borderRadius: 6, bgcolor: '#f4c2c4' }}><Typography variant="body2" sx={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'black' }}>{msg.text}</Typography></Paper>
            ) : msg.codeToCopy ? ( <Box><Typography variant="body2" sx={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 1 }}>{msg.text}</Typography><Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.100', position: 'relative', borderRadius: 1, overflowX: 'auto' }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem' }}><code>{msg.codeToCopy}</code></pre><IconButton size="small" onClick={() => navigator.clipboard.writeText(msg.codeToCopy)} sx={{ position: 'absolute', top: 4, right: 4 }} title="Copy code"><ContentCopyIcon sx={{ fontSize: '0.9rem' }} /></IconButton></Paper></Box>
            ) : ( <Typography variant="body2" sx={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', alignSelf: 'flex-start' }}>{msg.text}</Typography> )}
          </Box>
        ))}
        <div ref={chatEndRef} />
      </Box>
      {renderChatInputArea()}
    </Box>
  );

  const renderAccountSettingsScreen = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
       {/* Header */}
       <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2, borderBottom: '1px solid', borderColor: 'grey.100' }}>
         <IconButton onClick={() => setCurrentView('home')} size="small" sx={{ mr: 1, borderRadius: 2, '&:hover': { bgcolor: 'grey.50' } }}>
           <ArrowBackIcon sx={{ fontSize: '1.1rem', color: 'grey.500' }} />
         </IconButton>
         <Typography variant="h6" sx={{ 
           fontSize: '0.85rem', 
           fontWeight: 400, 
           color: 'grey.500'
         }}>
           Settings
         </Typography>
       </Box>

       {/* Tab Navigation */}
       <Box sx={{ borderBottom: '1px solid', borderColor: 'grey.100', px: 2 }}>
         <Tabs 
           value={settingsTab} 
           onChange={handleSettingsTabChange} 
           aria-label="settings tabs"
           textColor="inherit" 
           sx={{ 
             '& .MuiTabs-indicator': { 
               backgroundColor: 'common.black',
               height: 2,
               borderRadius: 1
             }, 
             '& .Mui-selected': { 
               color: 'common.black', 
               fontWeight: 500 
             },
             '& .MuiTab-root': {
               fontSize: '0.85rem',
               fontWeight: 400,
               textTransform: 'none',
               color: 'grey.500',
               minHeight: 48
             }
           }}
         >
           <Tab label="About" {...a11yProps(0)} />
           <Tab label="API Keys" {...a11yProps(1)} />
         </Tabs>
       </Box>

       {/* Content Area */}
       <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
       <TabPanel value={settingsTab} index={0}>
           <Box sx={{ p: 3 }}>
             {/* Project information */}
             <Box sx={{ mb: 4 }}>
               <Typography variant="subtitle2" sx={{ 
                 mb: 2, 
                 fontSize: '0.75rem', 
                 fontWeight: 500, 
                 color: 'grey.500',
                 textTransform: 'uppercase',
                 letterSpacing: '0.5px'
               }}>
                 Project Information
               </Typography>
               
               {/* Local userscript metadata */}
               <TextField 
                 label="Project"
                 variant="outlined" 
                 size="small" 
                 disabled 
                 value="AnySite"
                 fullWidth 
                 InputProps={{ sx: { fontSize: '0.85rem' } }}
                 InputLabelProps={{ sx: { fontSize: '0.85rem' } }}
                 sx={{ 
                   '& .MuiOutlinedInput-root': { 
                     borderRadius: 3,
                     bgcolor: 'grey.50'
                   }
                 }} 
               />
             </Box>

        </Box>
       </TabPanel>

       <TabPanel value={settingsTab} index={1}>
           <Box sx={{ p: 3 }}>
             {/* API Keys Configuration */}
             <Box sx={{ mb: 4 }}>
               <Typography variant="subtitle2" sx={{ 
                 mb: 2, 
                 fontSize: '0.75rem', 
                 fontWeight: 500, 
                 color: 'grey.500',
                 textTransform: 'uppercase',
                 letterSpacing: '0.5px'
               }}>
                 AI Configuration
               </Typography>
               
               <Typography variant="body2" sx={{ mb: 3, fontSize: '0.85rem', color: 'grey.600' }}>
                 Choose your AI provider and model. Configure once and use the same model for both analysis and code generation.
               </Typography>

               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                 <FormControl fullWidth size="small">
                   <InputLabel sx={{ fontSize: '0.85rem' }}>AI Provider</InputLabel>
                   <Select
                     value={aiProvider}
                     label="AI Provider"
                     onChange={(e) => handleProviderChange(e.target.value)}
                     sx={{ 
                       fontSize: '0.85rem',
                       '& .MuiOutlinedInput-notchedOutline': {
                         borderRadius: 3
                       }
                     }}
                   >
                     <MenuItem value={AI_PROVIDERS.GEMINI}>Google Gemini</MenuItem>
                     <MenuItem value={AI_PROVIDERS.ANTHROPIC}>Anthropic Claude (Official)</MenuItem>
                     <MenuItem value={AI_PROVIDERS.OPENAI}>OpenAI GPT</MenuItem>
                     <MenuItem value={AI_PROVIDERS.XAI}>xAI Grok</MenuItem>
                     <MenuItem value={AI_PROVIDERS.OPENROUTER}>OpenRouter (Multi-Model)</MenuItem>
                     <MenuItem value={AI_PROVIDERS.CLAUDE_REPLICATE}>Claude via Replicate (Legacy)</MenuItem>
                   </Select>
                 </FormControl>

                 {!useCustomModel && (
                   <FormControl fullWidth size="small">
                     <InputLabel sx={{ fontSize: '0.85rem' }}>Model</InputLabel>
                     <Select
                       value={aiModel}
                       label="Model"
                       onChange={(e) => setAiModel(e.target.value)}
                       sx={{ 
                         fontSize: '0.85rem',
                         '& .MuiOutlinedInput-notchedOutline': {
                           borderRadius: 3
                         }
                       }}
                     >
                       {PROVIDER_MODELS[aiProvider] && PROVIDER_MODELS[aiProvider].map(model => (
                         <MenuItem key={model.id} value={model.id}>{model.name}</MenuItem>
                       ))}
                     </Select>
                   </FormControl>
                 )}

                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   <FormControlLabel
                     control={
                       <Checkbox
                         checked={useCustomModel}
                         onChange={(e) => {
                           setUseCustomModel(e.target.checked);
                           if (!e.target.checked) setCustomModelName('');
                         }}
                         size="small"
                         sx={{ py: 0 }}
                       />
                     }
                     label={<Typography sx={{ fontSize: '0.8rem' }}>Use custom model name</Typography>}
                   />
                 </Box>

                 {useCustomModel && (
                   <TextField
                     label="Custom Model Name"
                     variant="outlined"
                     size="small"
                     fullWidth
                     value={customModelName}
                     onChange={(e) => setCustomModelName(e.target.value)}
                     placeholder="e.g., gpt-4-turbo-preview, claude-3-opus-20240229"
                     InputProps={{ sx: { fontSize: '0.85rem' } }}
                     InputLabelProps={{ sx: { fontSize: '0.85rem' } }}
                     sx={{
                       '& .MuiOutlinedInput-root': {
                         borderRadius: 3
                       }
                     }}
                     helperText="Enter the exact model name compatible with your provider's API"
                     FormHelperTextProps={{ sx: { fontSize: '0.7rem' } }}
                   />
                 )}

                 <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                   <TextField 
                     label="API Key" 
                     variant="outlined" 
                     size="small" 
                     type="password"
                     value={apiKey} 
                     onChange={(e) => setApiKey(e.target.value)} 
                     placeholder={`Enter your ${
                       aiProvider === AI_PROVIDERS.GEMINI ? 'Gemini' :
                       aiProvider === AI_PROVIDERS.ANTHROPIC ? 'Anthropic' :
                       aiProvider === AI_PROVIDERS.OPENAI ? 'OpenAI' :
                       aiProvider === AI_PROVIDERS.XAI ? 'xAI' :
                       aiProvider === AI_PROVIDERS.OPENROUTER ? 'OpenRouter' :
                       aiProvider === AI_PROVIDERS.CLAUDE_REPLICATE ? 'Replicate' : ''
                     } API key`}
                     InputProps={{ sx: { fontSize: '0.85rem' } }}
                     InputLabelProps={{ sx: { fontSize: '0.85rem' } }}
                     sx={{ 
                       flexGrow: 1,
                       '& .MuiOutlinedInput-root': { 
                         borderRadius: 3,
                         '&:hover .MuiOutlinedInput-notchedOutline': {
                           borderColor: 'grey.400'
                         }
                       }
                     }}
                   />
                   <Button 
                     variant="contained" 
                     size="small" 
                     onClick={handleSaveApiConfig}
                     disabled={apiKeySaveStatus === 'saving'}
                     disableElevation 
                     sx={{ 
                       textTransform: 'none', 
                       borderRadius: 3, 
                       bgcolor: 'common.black',
                       fontSize: '0.8rem',
                       fontWeight: 500,
                       px: 2,
                       py: 1,
                       '&:hover': { bgcolor: 'grey.800' } 
                     }}
                   >
                     {apiKeySaveStatus === 'saving' ? 'Saving...' : apiKeySaveStatus === 'success' ? '✓ Saved' : 'Update'}
                   </Button>
                 </Box>

                 {apiKeySaveStatus === 'success' && (
                   <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.75rem', mt: -1 }}>
                     Configuration saved successfully!
                   </Typography>
                 )}

                 <Typography variant="caption" sx={{ color: 'grey.500', fontSize: '0.75rem', display: 'block', mt: -0.5 }}>
                   {aiProvider === AI_PROVIDERS.GEMINI && (
                     <>Get your API key from <Link href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener" sx={{ fontSize: '0.75rem' }}>Google AI Studio</Link></>
                   )}
                   {aiProvider === AI_PROVIDERS.ANTHROPIC && (
                     <>Get your API key from <Link href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" sx={{ fontSize: '0.75rem' }}>Anthropic Console</Link></>
                   )}
                   {aiProvider === AI_PROVIDERS.OPENAI && (
                     <>Get your API key from <Link href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" sx={{ fontSize: '0.75rem' }}>OpenAI Platform</Link></>
                   )}
                   {aiProvider === AI_PROVIDERS.XAI && (
                     <>Get your API key from <Link href="https://console.x.ai/" target="_blank" rel="noopener" sx={{ fontSize: '0.75rem' }}>xAI Console</Link></>
                   )}
                   {aiProvider === AI_PROVIDERS.OPENROUTER && (
                     <>Get your API key from <Link href="https://openrouter.ai/keys" target="_blank" rel="noopener" sx={{ fontSize: '0.75rem' }}>OpenRouter</Link></>
                   )}
                   {aiProvider === AI_PROVIDERS.CLAUDE_REPLICATE && (
                     <>Get your API key from <Link href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener" sx={{ fontSize: '0.75rem' }}>Replicate</Link></>
                   )}
                 </Typography>
               </Box>
             </Box>
           </Box>
       </TabPanel>
     </Box>

    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.paper', justifyContent: 'flex-start' }}>
      {currentView === 'home' && (
        <IconButton onClick={handleAccountMenuOpen} size="small" sx={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>
           <AccountCircleIcon sx={{ color: 'grey.400', fontSize: '1.4rem' }} />
        </IconButton>
      )}
      <Popover id={accountMenuId} open={openAccountMenu} anchorEl={accountMenuAnchorEl} onClose={handleAccountMenuClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left'}} slotProps={{ paper: { sx: { width: '220px', mt: 1, borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.04)' } } }} >
        <List dense sx={{ py: 1 }}>
            {currentView === 'chat' ? (
            <ListItemButton onClick={() => { setCurrentView('home'); setCurrentChatId(null); setMessages([]); setCurrentScriptContentForChat(''); setCurrentChatTitle(''); handleAccountMenuClose(); }} sx={{ mx: 1, borderRadius: 2, py: 1, '&:hover': { bgcolor: 'grey.50' } }}>
              <ListItemText primary="Go to dashboard" primaryTypographyProps={{ sx: { fontSize: '0.85rem', fontWeight: 400 } }} />
              </ListItemButton>
            ) : (
            <ListItemButton onClick={() => { setCurrentView('settings'); handleAccountMenuClose(); }} sx={{ mx: 1, borderRadius: 2, py: 1, '&:hover': { bgcolor: 'grey.50' } }}>
              <ListItemText primary="Settings" primaryTypographyProps={{ sx: { fontSize: '0.85rem', fontWeight: 400 } }} />
              </ListItemButton>
            )}
             {currentView === 'chat' && (
               <ListItemButton onClick={() => { setCurrentView('settings'); handleAccountMenuClose(); }} sx={{ mx: 1, borderRadius: 2, py: 1, '&:hover': { bgcolor: 'grey.50' } }}>
                  <ListItemText primary="Settings" primaryTypographyProps={{ sx: { fontSize: '0.85rem', fontWeight: 400 } }} />
                 </ListItemButton>
             )}
             {currentView !== 'chat' && (
               <ListItemButton onClick={() => { 
                 chrome.runtime.sendMessage({ type: 'CLOSE_PANEL' });
                 handleAccountMenuClose(); 
               }} sx={{ mx: 1, borderRadius: 2, py: 1, '&:hover': { bgcolor: 'grey.50' } }}>
                 <ListItemText primary="Close panel" primaryTypographyProps={{ sx: { fontSize: '0.85rem', fontWeight: 400 } }} />
                 </ListItemButton>
             )}
          </List>
        </Popover>

      {currentView === 'chat' ? renderChatScreen()
       : currentView === 'settings' ? renderAccountSettingsScreen()
       : renderHomeScreen()}

      {/* Confirmation Dialog */}
      <Dialog
        open={isConfirmDeleteDialogOpen}
        onClose={handleCloseConfirmDialog}
        PaperProps={{ 
          sx: { 
            borderRadius: 4,
            p: 2.5,
            minWidth: '280px',
            maxWidth: '320px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          } 
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 600, pb: 1, px: 1 }}>
          {"Delete Modification"}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 0, px: 1 }}>
          <DialogContentText sx={{ mb: 2, fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.4 }}>
            Are you sure you want to delete this modification?
          </DialogContentText>
          
          {/* Important Notice Box */}
          <Box sx={{ textAlign: 'left', bgcolor: 'orange.50', border: '1px solid', borderColor: 'orange.200', p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.85rem', color: 'orange.800' }}>
              📍 Important:
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.3, color: 'orange.700' }}>
              Make sure you're on <strong>{scriptPendingDeletion?.domain_pattern || 'the target site'}</strong> to completely remove this modification.
            </Typography>
          </Box>
          
          <DialogContentText variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            This will permanently remove the modification from your list.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1.5 }}>
          <Button 
            onClick={handleConfirmDeleteScript} 
            variant="contained"
            size="medium"
            fullWidth
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
            sx={{ 
              borderRadius: 2,
              py: 1, 
              fontSize: '0.9rem',
              fontWeight: 500,
              bgcolor: '#f44336',
              color: 'white',
              textTransform: 'none',
              boxShadow: '0 2px 8px rgba(244,67,54,0.25)',
              '&:hover': { 
                bgcolor: '#d32f2f',
                boxShadow: '0 4px 12px rgba(244,67,54,0.35)'
              },
              '&:disabled': {
                bgcolor: 'grey.400'
              }
            }}
          >
            {isLoading ? 'Deleting...' : 'Delete Modification'}
          </Button>
          <Button 
            onClick={handleCloseConfirmDialog} 
            size="small"
            disabled={isLoading}
            sx={{ 
              fontSize: '0.8rem', 
              textTransform: 'none',
              color: 'text.secondary',
              minHeight: 'auto',
              '&:hover': {
                bgcolor: 'transparent',
                color: 'text.primary'
              }
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>


      {error && (
        <Typography color="error" sx={{ mt: 2, textAlign: 'center', p: 2 }}>
          Error: {error}
        </Typography>
      )}
    </Box>
  );
}

export default App;
