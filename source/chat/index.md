---
date: 2026-03-27 10:00:00
type: "chat"
top_img: false
comments: false
aside: false
page_title: false
---

<style>
/* 隐藏页面标题区域 */
.article-container > h1,
.article-container > .article-title,
#article-container > h1,
.page-title {
  display: none !important;
}

/* 主容器 - 最大化对话区域 */
.chat-container {
  max-width: 100%;
  margin: -30px 0 0 0;
  padding: 15px;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 消息区域 - 占据最大空间 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: rgba(10, 15, 30, 0.65);
  border-radius: 20px;
  margin-bottom: 12px;
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(198, 120, 221, 0.2);
  scroll-behavior: smooth;
  box-shadow: inset 0 0 60px rgba(198, 120, 221, 0.05);
}

/* 消息样式 */
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  animation: messageIn 0.3s ease-out;
}

@keyframes messageIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  overflow: hidden;
  margin-top: 5px;
}

.message-avatar img {
  width: 110%;
  height: 110%;
  object-fit: cover;
  object-position: center 100%;
  border-radius: 50%;
  margin: -5%;
}

.message.assistant .message-avatar {
  background: linear-gradient(135deg, rgba(198, 120, 221, 0.3), rgba(97, 175, 239, 0.2));
  border: 2px solid rgba(198, 120, 221, 0.4);
  box-shadow: 0 0 15px rgba(198, 120, 221, 0.3);
}

.message.user .message-avatar {
  background: transparent;
  border: 2px solid rgba(198, 120, 221, 0.6);
  box-shadow: 0 0 20px rgba(198, 120, 221, 0.4);
}

.message-content {
  max-width: 80%;
  padding: 14px 18px;
  border-radius: 18px;
  line-height: 1.7;
  word-wrap: break-word;
}

.message.user .message-content {
  background: linear-gradient(135deg, #c678dd, #a85fbb);
  color: white;
  border-bottom-right-radius: 6px;
}

.message.assistant .message-content {
  background: rgba(255, 255, 255, 0.08);
  color: white;
  border-bottom-left-radius: 6px;
  border: 1px solid rgba(198, 120, 221, 0.2);
}

.message-content p {
  margin: 0 0 10px 0;
  color: #ffffff !important;
}

.message-content p:last-child {
  margin-bottom: 0;
}

/* 代码块 */
.message-content pre {
  background: rgba(0, 0, 0, 0.4) !important;
  padding: 14px;
  border-radius: 12px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid rgba(198, 120, 221, 0.2);
}

.message-content code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
}

.message-content pre code {
  background: transparent !important;
  padding: 0;
}

.message-content code:not(pre code) {
  background: rgba(198, 120, 221, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

/* Markdown 样式 */
.message-content h1,
.message-content h2,
.message-content h3 {
  color: #c678dd !important;
  margin: 15px 0 10px 0;
  font-size: 1.1em;
}

.message-content ul,
.message-content ol {
  margin: 10px 0;
  padding-left: 20px;
}

.message-content li {
  margin: 5px 0;
  color: #ffffff !important;
}

.message-content blockquote {
  border-left: 3px solid #c678dd;
  padding-left: 12px;
  margin: 10px 0;
  color: rgba(255, 255, 255, 0.8);
}

.message-content a {
  color: #61afef !important;
}

/* 输入区域 */
.chat-input-container {
  background: rgba(10, 15, 30, 0.6);
  border-radius: 16px;
  padding: 14px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(198, 120, 221, 0.2);
  margin-top: auto;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

#userInput {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(198, 120, 221, 0.2);
  border-radius: 12px;
  padding: 14px 16px;
  color: white;
  font-size: 15px;
  resize: none;
  transition: all 0.3s ease;
  line-height: 1.5;
  font-family: inherit;
}

#userInput:focus {
  outline: none;
  border-color: #c678dd;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(198, 120, 221, 0.2);
}

#userInput::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

#sendBtn {
  background: linear-gradient(135deg, #c678dd, #a85fbb);
  border: none;
  border-radius: 12px;
  width: 48px;
  height: 48px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

#sendBtn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 25px rgba(198, 120, 221, 0.5);
}

#sendBtn:disabled {
  background: rgba(100, 100, 100, 0.3);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.chat-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 0 4px;
}

.chat-tip {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

#clearBtn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 6px 12px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

#clearBtn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(198, 120, 221, 0.5);
}

/* 正在输入指示器 */
.typing-indicator {
  display: inline-flex;
  gap: 5px;
  padding: 10px 14px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #c678dd, #61afef);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-8px); opacity: 1; }
}

/* 滚动条 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(198, 120, 221, 0.3);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(198, 120, 221, 0.5);
}

/* 响应式 */
@media (max-width: 768px) {
  .chat-container {
    padding: 10px;
    height: calc(100vh - 40px);
  }
  
  .message-content {
    max-width: 85%;
    padding: 12px 14px;
  }
}
</style>

<div class="chat-container">
  <div class="chat-messages" id="chatMessages">
    <div class="message assistant">
      <div class="message-avatar">✨</div>
      <div class="message-content">
        <p>你好！我是 point_xuan AI，很高兴见到你！</p>
        <p>我可以帮你回答问题、创作文字、编写代码、逻辑推理等。有什么我可以帮你的吗？</p>
      </div>
    </div>
  </div>
  
  <div class="chat-input-container">
    <div class="input-wrapper">
      <textarea id="userInput" placeholder="输入你的问题..." rows="1"></textarea>
      <button id="sendBtn" onclick="sendMessage()">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
    <div class="chat-footer">
      <span class="chat-tip">按 Enter 发送，Shift + Enter 换行</span>
      <button id="clearBtn" onclick="clearChat()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
        清空对话
      </button>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
// 配置
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const API_KEY = 'sk-REPLACE_ME';
const MODEL = 'qwen-plus';
const SYSTEM_PROMPT = '你是 point_xuan AI，一个友好、专业的AI助手。请用中文回答问题，回答要简洁明了，有条理。在适当的时候使用 Markdown 格式来让回答更清晰。';

// 全局变量
let messages = [{ role: 'system', content: SYSTEM_PROMPT }];
let isTyping = false;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  setupEventListeners();
  marked.setOptions({
    breaks: true,
    gfm: true
  });
});

// 设置事件监听
function setupEventListeners() {
  const userInput = document.getElementById('userInput');
  
  userInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
}

// 发送消息
async function sendMessage() {
  const userInput = document.getElementById('userInput');
  const message = userInput.value.trim();
  
  if (!message || isTyping) return;
  
  addMessage('user', message);
  messages.push({ role: 'user', content: message });
  
  userInput.value = '';
  userInput.style.height = 'auto';
  
  isTyping = true;
  showTypingIndicator();
  
  try {
    await callAPI();
  } catch (error) {
    console.error('API Error:', error);
    addMessage('assistant', '抱歉，发生了错误。请稍后再试。');
  } finally {
    isTyping = false;
    hideTypingIndicator();
  }
}

// 调用 API
async function callAPI() {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      stream: true
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  await handleStream(response);
}

// 处理流式响应
async function handleStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = '';
  let element = null;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || '';
          
          if (text) {
            content += text;
            if (!element) {
              element = addMessage('assistant', '');
            }
            element.querySelector('.message-content').innerHTML = marked.parse(content);
            scrollToBottom();
          }
        } catch (e) {}
      }
    }
  }
  
  if (content) {
    messages.push({ role: 'assistant', content: content });
  }
}

// 添加消息
function addMessage(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  if (role === 'user') {
    avatar.innerHTML = '<img src="/img/photo.jpg" alt="user">';
  } else {
    avatar.textContent = '✨';
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  if (role === 'assistant' && content) {
    contentDiv.innerHTML = marked.parse(content);
  } else {
    contentDiv.innerHTML = `<p>${escapeHtml(content)}</p>`;
  }
  
  div.appendChild(avatar);
  div.appendChild(contentDiv);
  chatMessages.appendChild(div);
  
  scrollToBottom();
  return div;
}

// 显示正在输入
function showTypingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="message-avatar">✨</div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
}

// 隐藏正在输入
function hideTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// 清空对话
function clearChat() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = `
    <div class="message assistant">
      <div class="message-avatar">✨</div>
      <div class="message-content">
        <p>你好！我是 point_xuan AI，很高兴见到你！</p>
        <p>我可以帮你回答问题、创作文字、编写代码、逻辑推理等。有什么我可以帮你的吗？</p>
      </div>
    </div>
  `;
  messages = [{ role: 'system', content: SYSTEM_PROMPT }];
}

// 滚动到底部
function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 转义 HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
</script>
