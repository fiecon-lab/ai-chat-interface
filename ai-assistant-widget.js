class AIAssistantWidget {
    constructor(config = {}) {
        this.config = {
            primaryColor: config.primaryColor || '#17404b',
            secondaryColor: config.secondaryColor || '#5a9b48',
            fontFamily: config.fontFamily || 'system-ui, -apple-system, sans-serif',
            assistantName: config.assistantName || 'Cria',
            model: config.model || 'qwen2.5:14b',
            ollamaEndpoint: config.ollamaEndpoint || 'http://localhost:11434',
            maxHistoryMessages: config.maxHistoryMessages || 10, // Number of previous messages to include in context
            useCases: config.useCases !== undefined ? config.useCases : []
        };

        this.isOpen = false;
        this.currentView = 'selector'; // 'selector' or 'chat'
        this.currentSystemPrompt = '';
        this.conversationHistory = [];
        
        this.init();
    }

    init() {
        this.loadStyles();
        this.createWidget();
        this.applyCustomColors();
    }

    loadStyles() {
        // Check if styles are already loaded
        if (document.querySelector('link[href*="ai-assistant-widget.css"]')) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'ai-assistant-widget.css';
        document.head.appendChild(link);
    }

    createWidget() {
        // Create FAB button
        this.fab = document.createElement('button');
        this.fab.className = 'ai-widget-fab';
        this.fab.innerHTML = '<i data-feather="message-circle"></i>';
        document.body.appendChild(this.fab);

        // Create chat container
        this.container = document.createElement('div');
        this.container.className = 'ai-widget-container';
        this.container.innerHTML = `
            <!-- Selector Screen -->
            <div class="ai-widget-selector">
                <div class="ai-widget-hero">
                    <div class="ai-widget-hero-header">
                        <div class="ai-widget-hero-avatar">
                            <img src="images/avatar-white.svg" alt="Assistant Avatar">
                        </div>
                    </div>
                    <div class="ai-widget-hero-text">
                        <h1>Hello there</h1>
                        <h2>How can we help?</h2>
                    </div>
                </div>
                <div class="ai-widget-options">
                    <div class="ai-widget-start-chat" data-action="start-chat">
                        <h3>Send us a message</h3>
                        <p>Your AI assistant will respond in seconds</p>
                        <i data-feather="chevron-right" class="ai-widget-start-chat-arrow"></i>
                    </div>
                    ${this.generateUseCasesSection()}
                </div>
            </div>

            <!-- Chat Screen -->
            <div class="ai-widget-chat">
                <div class="ai-widget-chat-header">
                    <button class="ai-widget-back-btn">
                        <i data-feather="arrow-left"></i>
                    </button>
                    <div class="ai-widget-chat-header-info">
                        <div class="ai-widget-chat-avatar">
                            <img src="images/avatar-white.svg" alt="Assistant Avatar">
                        </div>
                        <div class="ai-widget-chat-details">
                            <h3>${this.config.assistantName}</h3>
                            <div class="ai-widget-chat-badges">
                                <img src="images/ai-badge.svg" alt="AI Badge">
                                <span class="ai-widget-bot-label">Assistant</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="ai-widget-messages"></div>
                <div class="ai-widget-input-area">
                    <input type="text" class="ai-widget-input" placeholder="Type a reply...">
                    <div class="ai-widget-input-icons">
                        <button class="ai-widget-send">
                            <i data-feather="send"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.container);

        // Initialize Feather icons first
        if (window.feather) {
            window.feather.replace();
        }
        
        // Attach event listeners after Feather icons are initialized
        this.attachEventListeners();
    }

    attachEventListeners() {
        // FAB button click
        this.fab.addEventListener('click', () => this.toggleWidget());

        // Back button click
        this.container.querySelector('.ai-widget-back-btn').addEventListener('click', () => this.showSelector());

        // Start chat button
        this.container.querySelector('.ai-widget-start-chat').addEventListener('click', () => this.showChat());

        // Use case buttons - using event delegation for better reliability
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.ai-widget-use-case-btn')) {
                const btn = e.target.closest('.ai-widget-use-case-btn');
                const useCaseIndex = parseInt(btn.dataset.useCase);
                this.selectUseCase(useCaseIndex);
            }
        });

        // Send button and Enter key
        const input = this.container.querySelector('.ai-widget-input');
        const sendBtn = this.container.querySelector('.ai-widget-send');

        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.container.contains(e.target) && !this.fab.contains(e.target)) {
                this.closeWidget();
            }
        });
    }

    toggleWidget() {
        if (this.isOpen) {
            this.closeWidget();
        } else {
            this.openWidget();
        }
    }

    openWidget() {
        this.isOpen = true;
        this.container.classList.add('open');
        this.showSelector();
    }

    closeWidget() {
        this.isOpen = false;
        this.container.classList.remove('open');
        this.currentView = 'selector';
    }

    showSelector() {
        this.currentView = 'selector';
        this.container.querySelector('.ai-widget-selector').classList.remove('hidden');
        this.container.querySelector('.ai-widget-chat').classList.remove('active');
    }

    showChat() {
        this.currentView = 'chat';
        this.container.querySelector('.ai-widget-selector').classList.add('hidden');
        this.container.querySelector('.ai-widget-chat').classList.add('active');
        
        // Set a default system prompt if none selected
        if (!this.currentSystemPrompt) {
            this.currentSystemPrompt = 'You are a helpful AI assistant.';
            this.conversationHistory = [{ role: 'system', content: this.currentSystemPrompt }];
        }
    }

    selectUseCase(index) {
        const useCase = this.config.useCases[index];
        this.currentSystemPrompt = useCase.prompt;
        this.conversationHistory = [{ role: 'system', content: useCase.prompt }];
        this.showChat();
        
        // Automatically send an initial message to start the conversation
        setTimeout(() => {
            this.sendInitialMessage(useCase);
        }, 100); // Small delay to ensure chat view is rendered
    }
    
    disableInput() {
        const input = this.container.querySelector('.ai-widget-input');
        const sendBtn = this.container.querySelector('.ai-widget-send');
        
        if (input) {
            input.disabled = true;
            input.placeholder = "AI is responding...";
        }
        if (sendBtn) {
            sendBtn.disabled = true;
        }
    }
    
    enableInput() {
        const input = this.container.querySelector('.ai-widget-input');
        const sendBtn = this.container.querySelector('.ai-widget-send');
        
        if (input) {
            input.disabled = false;
            input.placeholder = "Type a reply...";
        }
        if (sendBtn) {
            sendBtn.disabled = false;
        }
    }

    prepareConversationContext() {
        // Always start with the system prompt
        const context = [];
        
        // Add system prompt if we have one
        if (this.currentSystemPrompt) {
            context.push({ role: 'system', content: this.currentSystemPrompt });
        }
        
        // Get recent conversation history (excluding the initial system message)
        const recentHistory = this.conversationHistory
            .filter(msg => msg.role !== 'system') // Exclude system messages from history count
            .slice(-this.config.maxHistoryMessages); // Take only the most recent messages
        
        // Add conversation flow instruction
        if (recentHistory.length > 0) {
            context.push({
                role: 'system',
                content: 'Please maintain the conversation flow and context from our previous messages. Provide helpful, relevant responses that build on our ongoing discussion.'
            });
        }
        
        // Add the recent history
        context.push(...recentHistory);
        
        return context;
    }

    async sendMessage() {
        const input = this.container.querySelector('.ai-widget-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Disable input while processing
        this.disableInput();

        // Add user message
        this.addMessage('user', message);
        input.value = '';

        // Show thinking indicator
        const thinkingElement = this.addThinkingIndicator();

        try {
            // Add user message to conversation history
            this.conversationHistory.push({ role: 'user', content: message });

            // Prepare context with history limit
            const contextualMessages = this.prepareConversationContext();

            // Send to Ollama with proper context
            const response = await this.callOllama(contextualMessages);
            
            // Remove thinking indicator
            thinkingElement.remove();
            
            // Filter out think blocks from response
            const cleanResponse = this.filterThinkBlocks(response);
            
            // Add assistant response
            this.addMessage('assistant', cleanResponse);
            
            // Add to conversation history (keep original response)
            this.conversationHistory.push({ role: 'assistant', content: response });

        } catch (error) {
            console.error('Error calling Ollama:', error);
            thinkingElement.remove();
            this.addMessage('assistant', 'Sorry, I encountered an error. Please make sure Ollama is running and try again.');
        } finally {
            // Re-enable input after response or error
            this.enableInput();
        }
    }
    
    addConversationDivider() {
        const messagesContainer = this.container.querySelector('.ai-widget-messages');
        const dividerElement = document.createElement('div');
        dividerElement.className = 'ai-widget-divider';
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        dividerElement.innerHTML = `
            <div class="ai-widget-divider-line"></div>
            <div class="ai-widget-divider-text">New conversation • ${timeString}</div>
            <div class="ai-widget-divider-line"></div>
        `;
        
        messagesContainer.appendChild(dividerElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return dividerElement;
    }

    async sendInitialMessage(useCase) {
        // Check if there are existing messages
        const messagesContainer = this.container.querySelector('.ai-widget-messages');
        const existingMessages = messagesContainer.querySelectorAll('.ai-widget-message').length > 0;
        
        if (existingMessages) {
            // Add a divider to separate conversations
            this.addConversationDivider();
        }
        
        // Show the use case selection as a user message
        this.addMessage('user', useCase.label);
        
        // Disable input while processing initial message
        this.disableInput();
        
        // Show thinking indicator
        const thinkingElement = this.addThinkingIndicator();

        try {
            // Add the use case selection to conversation history
            this.conversationHistory.push({ 
                role: 'user', 
                content: useCase.label
            });
            
            // Add a contextual instruction for the AI (this won't be shown in UI)
            this.conversationHistory.push({ 
                role: 'user', 
                content: `Please introduce yourself and explain how you can help with: ${useCase.label}. Be helpful and specific about your capabilities for this use case.`
            });

            // Prepare context (will include system prompt and messages)
            const contextualMessages = this.prepareConversationContext();

            // Send to Ollama with proper context
            const response = await this.callOllama(contextualMessages);
            
            // Remove thinking indicator
            thinkingElement.remove();
            
            // Filter out think blocks from response
            const cleanResponse = this.filterThinkBlocks(response);
            
            // Add assistant response
            this.addMessage('assistant', cleanResponse);
            
            // Add to conversation history (keep original response)
            this.conversationHistory.push({ role: 'assistant', content: response });

        } catch (error) {
            console.error('Error calling Ollama:', error);
            thinkingElement.remove();
            
            // Fallback message if Ollama is not available
            const fallbackMessage = `Hello! I'm your AI assistant, ready to help you with ${useCase.label.toLowerCase()}. What would you like to know?`;
            this.addMessage('assistant', fallbackMessage);
            this.conversationHistory.push({ role: 'assistant', content: fallbackMessage });
        } finally {
            // Re-enable input after response or error
            this.enableInput();
        }
    }

    addMessage(type, content) {
        const messagesContainer = this.container.querySelector('.ai-widget-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `ai-widget-message ${type}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const avatarSrc = type === 'user' ? 'images/avatar-white.svg' : 'images/avatar-grey.svg';
        
        messageElement.innerHTML = `
            <div class="ai-widget-message-avatar">
                <img src="${avatarSrc}" alt="${type} avatar">
            </div>
            <div class="ai-widget-message-content">
                <div class="ai-widget-message-bubble">${this.escapeHtml(content)}</div>
                <div class="ai-widget-message-time">${timeString}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageElement;
    }

    addThinkingIndicator() {
        const messagesContainer = this.container.querySelector('.ai-widget-messages');
        const thinkingElement = document.createElement('div');
        thinkingElement.className = 'ai-widget-message assistant';
        thinkingElement.innerHTML = `
            <div class="ai-widget-message-avatar">
                <img src="images/avatar-grey.svg" alt="assistant avatar">
            </div>
            <div class="ai-widget-message-content">
                <div class="ai-widget-thinking">Thinking...</div>
            </div>
        `;
        
        messagesContainer.appendChild(thinkingElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return thinkingElement;
    }

    async callOllama(messages) {
        const response = await fetch(`${this.config.ollamaEndpoint}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: messages,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.message.content;
    }

    filterThinkBlocks(text) {
        // Remove <think>...</think> blocks from the response
        return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateUseCasesSection() {
        // Check if use cases are configured and not empty
        if (!this.config.useCases || this.config.useCases.length === 0) {
            return '';
        }
        
        return `
            <div class="ai-widget-use-cases-container">
                ${this.config.useCases.map((useCase, index) => 
                    `<button class="ai-widget-use-case-btn" data-use-case="${index}">
                        ${useCase.label}
                        <i data-feather="chevron-right" class="ai-widget-use-case-arrow"></i>
                    </button>`
                ).join('')}
            </div>
        `;
    }

    applyCustomColors() {
        // Create CSS custom properties for dynamic colors
        const style = document.createElement('style');
        style.id = 'ai-widget-custom-colors';
        
        // Remove existing custom colors if they exist
        const existingStyle = document.getElementById('ai-widget-custom-colors');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        style.textContent = `
            :root {
                --ai-widget-primary: ${this.config.primaryColor};
                --ai-widget-secondary: ${this.config.secondaryColor};
                --ai-widget-gradient: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
            }
            
            /* Apply primary/secondary colors to widget elements */
            .ai-widget-fab {
                background: var(--ai-widget-gradient) !important;
            }
            
            .ai-widget-hero {
                background: var(--ai-widget-gradient) !important;
            }
            
            .ai-widget-chat-header {
                background: var(--ai-widget-gradient) !important;
            }
            
            .ai-widget-message.user .ai-widget-message-bubble {
                background: var(--ai-widget-primary) !important;
            }
            
            .ai-widget-send:hover {
                color: var(--ai-widget-primary) !important;
            }
            
            .ai-widget-start-chat-arrow {
                color: var(--ai-widget-primary) !important;
            }
            
            .ai-widget-use-case-arrow {
                color: var(--ai-widget-primary) !important;
            }
            
            /* Custom scrollbar styling for messages */
            .ai-widget-messages::-webkit-scrollbar {
                width: 6px !important;
            }
            
            .ai-widget-messages::-webkit-scrollbar-track {
                background: #f1f1f1 !important;
                border-radius: 3px !important;
            }
            
            .ai-widget-messages::-webkit-scrollbar-thumb {
                background: #c1c1c1 !important;
                border-radius: 3px !important;
            }
            
            .ai-widget-messages::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8 !important;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Auto-initialize if no config is provided
if (typeof window !== 'undefined') {
    window.AIAssistantWidget = AIAssistantWidget;
} 