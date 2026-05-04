(function () {

const scriptTag = document.currentScript;

const BASE_URL = "https://chatbot.janzarieldiaz.com";
const USE_KB = scriptTag.getAttribute("data-use-kb") === "true";
const TITLE = scriptTag.getAttribute("data-title") || "Assistant";
const KB_NAME = scriptTag.getAttribute("kb_name") || "default";
const PREVIEW_TEXT = "Ask me anything 👇"
// ------------------------
// LOAD CSS
// ------------------------
const css = document.createElement("link");
css.rel = "stylesheet";
css.href ="widget.css";
css.onerror = () => {
    console.error("Chatbot CSS failed to load.");
};
document.head.appendChild(css);

// ------------------------
// WIDGET HTML
// ------------------------
const widget = document.createElement("div");

widget.innerHTML = `
<div id="chatbot-launcher">💬</div>

<div id="chatbot-bubble-preview">${PREVIEW_TEXT}</div>

<div id="chatbot-box">
    <div id="chatbot-header">
        ${escapeHtml(TITLE)}
        <span id="chatbot-close">✕</span>
    </div>

    <div id="chatbot-messages"></div>

    <div id="chatbot-input-area">
        <input id="chatbot-input" placeholder="Type message..." maxlength="1000" />
        <button id="chatbot-send">➤</button>
    </div>
</div>
`;

document.body.appendChild(widget);

// ------------------------
// ELEMENTS
// ------------------------
const launcher = document.getElementById("chatbot-launcher");
const box = document.getElementById("chatbot-box");
const close = document.getElementById("chatbot-close");
const messages = document.getElementById("chatbot-messages");
const bubble = document.getElementById("chatbot-bubble-preview");
const input = document.getElementById("chatbot-input");
const sendBtn = document.getElementById("chatbot-send");

let isSending = false;

// ------------------------
// HELPERS
// ------------------------
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function scroll() {
    messages.scrollTop = messages.scrollHeight;
}

function setSending(state) {
    isSending = state;
    sendBtn.disabled = state;
    input.disabled = state;
}

// ------------------------
// INITIAL MESSAGE
// ------------------------
function addInitialMessage() {
    setTimeout(() => {
        if (USE_KB) {
            if (KB_NAME === "knowledge_base_privacy_policy") {
                addBotMessage("👋 Hi! Do you have any questions about the Privacy Policy?");
            } else {
                addBotMessage("👋 Hi! How can I assist you today?");
            }
        } else {
            addBotMessage("👋 Hi! How can I assist you today?");
        }
    }, 600);
}

// ------------------------
// OPEN CHAT
// ------------------------
launcher.onclick = () => {
    box.classList.add("open");
    launcher.classList.remove("pulse");
    bubble.style.display = "none";
    input.focus();
};

// ------------------------
// CLOSE CHAT
// ------------------------
close.onclick = () => {
    box.classList.remove("open");
    launcher.classList.add("pulse");
    bubble.style.display = "block";
};

// ------------------------
// MESSAGE UI
// ------------------------
function addUserMessage(text) {
    const main_div = document.createElement("div");
    main_div.className = "message-container-user";
    const div = document.createElement("div");
    div.className = "user message";
    div.textContent = text;
    main_div.appendChild(div);
    messages.appendChild(main_div);
    scroll();
}

function addBotMessage(text) {
    const main_div = document.createElement("div");
    main_div.className = "message-container-bot";
    const div = document.createElement("div");
    div.className = "bot message";
    div.innerHTML = text;
    main_div.appendChild(div);
    messages.appendChild(main_div);
    scroll();
}

function addErrorMessage(text) {
    const main_div = document.createElement("div");
    main_div.className = "message-container-bot";
    const div = document.createElement("div");
    div.className = "bot message error";
    div.textContent = text;
    main_div.appendChild(div);
    messages.appendChild(main_div);
    scroll();
}

// ------------------------
// LOADING ANIMATION
// ------------------------
function showLoading() {
    hideLoading();

    const main_div = document.createElement("div");
    main_div.className = "message-container-bot";
    const div = document.createElement("div");
    div.className = "bot message loading";
    div.id = "loading";
    div.innerHTML = `<span></span><span></span><span></span>`;
    main_div.appendChild(div);
    messages.appendChild(main_div);
    scroll();
}

function hideLoading() {
    const el = document.getElementById("loading");
    if (el) el.remove();
}

// ------------------------
// SEND MESSAGE
// ------------------------
async function sendMessage() {

    if (isSending) return;

    const msg = input.value.trim();

    if (!msg) return;

    if (msg.length > 1000) {
        addErrorMessage("Message is too long.");
        return;
    }

    addUserMessage(msg);
    input.value = "";

    showLoading();
    setSending(true);

    try {

        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 60000);

        const res = await fetch("https://llm.janzarieldiaz.com", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: msg
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        hideLoading();

        if (!res.ok) {

            if (res.status === 403) {
                addErrorMessage("This website is not authorized to use the chatbot.");
            }
            else if (res.status >= 500) {
                addErrorMessage("Server error. Please try again later.");
            }
            else {
                addErrorMessage(`Request failed (${res.status}).`);
            }

            return;
        }

        let data;

        try {
            data = await res.json();
        } catch {
            addErrorMessage("Invalid server response.");
            return;
        }

        if (!data || typeof data[0].response.response !== "string") {
            addErrorMessage("Unexpected response format.");
            return;
        }

        addBotMessage(data.reply);

    } catch (err) {

        hideLoading();

        if (err.name === "AbortError") {
            addErrorMessage("Request timed out. Please try again.");
        }
        else if (!navigator.onLine) {
            addErrorMessage("No internet connection.");
        }
        else {
            console.error("Chatbot error:", err);
            addErrorMessage("Unable to contact assistant right now. Please try again later.");
        }

    } finally {
        setSending(false);
        input.focus();
    }
}

// ------------------------
// EVENTS
// ------------------------
sendBtn.onclick = sendMessage;

input.addEventListener("keypress", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

// ------------------------
// INIT
// ------------------------
launcher.classList.add("pulse");
bubble.style.display = "block";
addInitialMessage();

})();