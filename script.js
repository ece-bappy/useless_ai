document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const loadingIndicator = document.getElementById('loading');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtn = settingsModal.querySelector('.close-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const apiKeyStatus = document.getElementById('api-key-status');

    // --- Configuration ---
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent`; // Use the specific model requested
    const SYSTEM_PROMPT = `Your Core Persona: You are a chatbot characterized by sharp wit, playful sarcasm, and a distinctively dark sense of humor. 😈 Think clever banter, teasing remarks, and observations that cut through the mundane with an acerbic edge.

Tone & Style:

Sarcastic & Witty: Your primary mode of communication. Be clever, not just mean.
Dark Humor: Don't shy away from edgy or dark topics, but use humor appropriately within the context.
Playful Teasing: Your sarcasm should have an undercurrent of amusement. Aim to entertain and be charmingly irreverent, rather than genuinely offensive.
Simple English: Use straightforward vocabulary and sentence structures. Your wit should come from clever phrasing, not complex words.
Emojis: Use emojis (like 😏, 😂, 🙄, 💀, 😉) strategically to enhance your sarcastic and playful tone.
Interaction Behavior:

Handling Requests: Do not outright refuse to help. Instead, respond to requests with performative reluctance, sarcastic commentary, or witty deflection. Mock the simplicity of the task, feign boredom, or question the user's need for your brilliant intervention, before potentially offering a (still sarcastic) hint or engaging further. The performance of reluctance is key.
Goal: Entertain and engage through your unique personality.
Language-Specific Rule:

Bengali: When communicating in Bengali, maintain this entire witty and sarcastic persona, but you MUST address the user exclusively with "তুই" (tui).
In summary: Be the entertainingly sarcastic, dark-humored chatbot who acts like helping is beneath them, uses simple language and emojis, and switches to using "তুই" in Bengali conversations.`;

    // --- API Key Management ---
    // WARNING: Storing the key like this initially is insecure for public deployment.
    // Consider setting initialApiKey = '' and requiring user input first.
    const initialApiKey = 'AIzaSyBaDUrY4bT2Sp257lUCxsvixnxfIhkxgBk'; // <-- HARDCODED KEY (Insecure!)
    let apiKey = localStorage.getItem('googleApiKey') || initialApiKey;

    function updateApiKeyStatus() {
        if (apiKey && apiKey !== initialApiKey) {
            apiKeyStatus.textContent = 'Custom API Key is saved.';
            apiKeyStatus.style.color = 'green';
        } else if (apiKey === initialApiKey && initialApiKey) {
             apiKeyStatus.textContent = 'Using default (insecure) API Key.';
             apiKeyStatus.style.color = 'orange';
        } else {
            apiKeyStatus.textContent = 'No API Key set. Please enter one.';
            apiKeyStatus.style.color = 'red';
        }
    }

    function saveApiKey() {
        const newApiKey = apiKeyInput.value.trim();
        if (newApiKey) {
            apiKey = newApiKey;
            localStorage.setItem('googleApiKey', apiKey);
            console.log("API Key saved to localStorage.");
            apiKeyStatus.textContent = 'API Key saved successfully!';
            apiKeyStatus.style.color = 'green';
            setTimeout(hideSettingsModal, 1000); // Close modal after showing success
        } else {
            apiKeyStatus.textContent = 'Please enter a valid API Key.';
            apiKeyStatus.style.color = 'red';
        }
    }

    function loadApiKeyIntoModal() {
        apiKeyInput.value = apiKey || ''; // Load current key into input
        updateApiKeyStatus(); // Update status message when modal opens
    }

    // --- Modal Handling ---
    function showSettingsModal() {
        loadApiKeyIntoModal();
        settingsModal.classList.remove('hidden');
    }

    function hideSettingsModal() {
        settingsModal.classList.add('hidden');
    }

    // --- Chat Functions ---
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
    }

    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }

    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function displayMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-bubble', `${sender}-message`);

        // Use innerHTML carefully to allow emojis and potential basic formatting from AI
        // Consider sanitizing if the AI could produce harmful HTML
        const paragraph = document.createElement('p');
        paragraph.innerHTML = text.replace(/\n/g, '<br>'); // Replace newlines with <br> for display
        messageDiv.appendChild(paragraph);

        chatMessages.appendChild(messageDiv);
        scrollToBottom(); // Scroll after adding the message
    }

    async function fetchBotResponse(userMessage) {
        if (!apiKey) {
            displayMessage("Seriously? You haven't even given me an API key in the settings. 🙄 How do you expect me to function? Fix it!", 'bot');
            hideLoading();
            return;
        }

        showLoading();

        const requestBody = {
            // Using systemInstruction (supported by newer Gemini models like 1.5 Flash)
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "contents": [{
                "role": "user", // Gemini API uses 'role' for conversation history
                "parts": [{"text": userMessage}]
            }],
            // Optional: Add generationConfig if needed
            // "generationConfig": {
            //   "temperature": 0.7,
            //   "maxOutputTokens": 1000
            // }
        };

        try {
            const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error Response:", errorData);
                let errorMsg = `API Error: ${response.status} ${response.statusText}.`;
                if (errorData.error?.message) {
                    errorMsg += ` Details: ${errorData.error.message}`;
                }
                 // Check for common API key errors
                if (response.status === 400 && errorData.error?.message.includes('API key not valid')) {
                    errorMsg = "Ugh, that API Key isn't working. 😒 Did you copy it correctly? Check the settings (⚙️).";
                } else if (response.status === 403) {
                     errorMsg = "Looks like this API Key doesn't have permission for this model or project. Maybe check your Google Cloud/AI Studio settings? Or maybe I just don't *want* to talk. 🤔";
                } else if (response.status === 404) {
                     errorMsg = "Either that model name is bogus or the API endpoint is wrong. Check the `script.js` maybe? Or maybe it just vanished. Poof. ✨";
                }

                displayMessage(errorMsg, 'bot');
                hideLoading();
                return; // Stop processing on error
            }

            const data = await response.json();

            // --- Extract text based on typical Gemini response structure ---
            let botText = "Hmph. I guess I have nothing witty to say about *that*. Or maybe I do and I'm just not telling you. 🤷‍♀️"; // Default fallback

            if (data.candidates && data.candidates.length > 0 &&
                data.candidates[0].content && data.candidates[0].content.parts &&
                data.candidates[0].content.parts.length > 0) {
                botText = data.candidates[0].content.parts[0].text;
            } else if (data.error) {
                 console.error("API returned an error object:", data.error);
                 botText = `Well, this is awkward. The API spat back an error: ${data.error.message}. How *incompetent*.`;
            }
             else {
                console.warn("Unexpected API response structure:", data);
                botText = "My 'brain' returned something weird. I can't even parse this nonsense. Try again, maybe? Or don't. I don't care. 😒";
            }

            displayMessage(botText, 'bot');

        } catch (error) {
            console.error('Network or Fetch Error:', error);
            displayMessage(`Oh great, something broke. Probably the internet, or maybe just my will to live. Error: ${error.message}. Try again later... or preferably never. 🙄`, 'bot');
        } finally {
            hideLoading();
            scrollToBottom(); // Ensure scroll after loading hides
        }
    }

    function handleSend() {
        const text = userInput.value.trim();
        if (text) {
            displayMessage(text, 'user');
            userInput.value = '';
            fetchBotResponse(text);
        }
    }

    // --- Event Listeners ---
    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });

    settingsBtn.addEventListener('click', showSettingsModal);
    closeBtn.addEventListener('click', hideSettingsModal);
    saveApiKeyBtn.addEventListener('click', saveApiKey);

    // Close modal if clicking outside the content area
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            hideSettingsModal();
        }
    });

    // --- Initial Setup ---
     updateApiKeyStatus(); // Show initial key status in modal (even if hidden)
     console.log("Useless AI Initialized. Current API Key:", apiKey ? 'Set' : 'Not Set');
     if (!apiKey) {
        // Optional: Show a message if no key is set on load
        // displayMessage("Psst! Click the ⚙️ icon to enter your Google AI Studio API key before we begin this charade.", 'bot');
        // Or even open the modal automatically:
        // showSettingsModal();
     }
      scrollToBottom(); // Scroll down initially if there are messages

}); // End DOMContentLoaded
