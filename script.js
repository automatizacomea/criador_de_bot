// Global variables
let currentConfig = null;
let conversationHistory = [];
let knowledgeBases = [];

// Handle file loading
async function handleFileLoad(file) {
    if (!file) return '';

    if (file.type === 'text/plain') {
        return await file.text();
    } else if (file.type === 'application/pdf') {
        return await extractPdfText(file);
    }
    return '';
}

// Extract text from PDF
async function extractPdfText(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const typedarray = new Uint8Array(event.target.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
            resolve(fullText);
        };
        reader.readAsArrayBuffer(file);
    });
}

// Generate cURL command
function generateCurlCommand(config, message) {
    const messages = [
        {
            role: "system",
            content: `${config.systemPrompt}\n\nBases de Conhecimento:\n${config.knowledgeBases.map(kb => `${kb.title}:\n${kb.content}`).join('\n\n')}`
        },
        {
            role: "user",
            content: message
        }
    ];

    const data = {
        model: config.model || 'gpt-4',
        messages: messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 300
    };

    return `curl -X POST https://api.openai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${config.apiKey}" \\
  -d '${JSON.stringify(data, null, 2)}'`;
}

// Download cURL command
function downloadCurlCommand(config, message) {
    const curlCommand = generateCurlCommand(config, message);
    const blob = new Blob([curlCommand], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_curl_command.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Save config to localStorage
function saveConfig(config) {
    const savedConfigs = JSON.parse(localStorage.getItem('botConfigs') || '[]');
    const existingConfigIndex = savedConfigs.findIndex(c => c.name === config.name);

    if (existingConfigIndex !== -1) {
        savedConfigs[existingConfigIndex] = config;
    } else {
        savedConfigs.push(config);
    }

    localStorage.setItem('botConfigs', JSON.stringify(savedConfigs));
    return existingConfigIndex !== -1;
}

// Delete config
function deleteConfig(index) {
    const savedConfigs = JSON.parse(localStorage.getItem('botConfigs') || '[]');
    savedConfigs.splice(index, 1);
    localStorage.setItem('botConfigs', JSON.stringify(savedConfigs));
}

// Get all saved configs
function getSavedConfigs() {
    return JSON.parse(localStorage.getItem('botConfigs') || '[]');
}

// Download config
function downloadConfig(config, format = 'json') {
    let dataStr, mimeType, fileExtension;
    
    if (format === 'txt') {
        dataStr = Object.entries(config).map(([key, value]) => {
            if (key === 'knowledgeBases') {
                return `${key}:\n${value.map(kb => `  ${kb.title}:\n    ${kb.content}`).join('\n')}`;
            }
            return `${key}: ${JSON.stringify(value)}`;
        }).join('\n');
        mimeType = 'text/plain';
        fileExtension = 'txt';
    } else {
        dataStr = JSON.stringify(config, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_config.${fileExtension}`;
    a.click();
    URL.revokeObjectURL(url);
}

// Add message to chat
function addMessageToChat(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message to OpenAI API
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    if (!message) return;

    addMessageToChat('user', message);
    userInput.value = '';

    conversationHistory.push({
        role: "user",
        content: message
    });

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentConfig.apiKey}`
            },
            body: JSON.stringify({
                model: currentConfig.model || 'gpt-4',
                messages: [
                    {
                        role: "system",
                        content: `${currentConfig.systemPrompt}\n\nBases de Conhecimento:\n${currentConfig.knowledgeBases.map(kb => `${kb.title}:\n${kb.content}`).join('\n\n')}`
                    },
                    ...conversationHistory
                ],
                temperature: currentConfig.temperature || 0.7,
                max_tokens: currentConfig.maxTokens || 300
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        const botResponse = data.choices[0].message.content;
        conversationHistory.push({
            role: "assistant",
            content: botResponse
        });
        addMessageToChat('bot', botResponse);
    } catch (error) {
        addMessageToChat('bot', `Erro: ${error.message}`);
    }
}

// Load config from file
function loadConfigFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            loadConfig(config);
            alert('Configuração carregada com sucesso!');
        } catch (error) {
            alert('Erro ao carregar o arquivo: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Load config
function loadConfig(config) {
    document.getElementById('configName').value = config.name;
    document.getElementById('apiKey').value = config.apiKey;
    document.getElementById('systemPrompt').value = config.systemPrompt;
    knowledgeBases = config.knowledgeBases || [];
    updateKnowledgeBaseList();

    currentConfig = config;
    document.getElementById('sendMessage').disabled = false;
    conversationHistory = [];
    document.getElementById('chatMessages').innerHTML = '';
}

// Update knowledge base list
function updateKnowledgeBaseList() {
    const list = document.getElementById('knowledgeBaseList');
    list.innerHTML = '';
    knowledgeBases.forEach((base, index) => {
        const li = document.createElement('li');
        li.className = 'knowledge-base-item';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'knowledge-base-title';
        titleSpan.textContent = base.title;
        titleSpan.onclick = () => showKnowledgeBaseContent(base);
        li.appendChild(titleSpan);
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.className = 'delete-btn';
        deleteButton.onclick = () => {
            knowledgeBases.splice(index, 1);
            updateKnowledgeBaseList();
        };
        li.appendChild(deleteButton);
        list.appendChild(li);
    });
}

// Show knowledge base content
function showKnowledgeBaseContent(base) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>${base.title}</h2>
            <pre>${base.content}</pre>
            <button onclick="downloadKnowledgeBase('${base.title}', \`${base.content}\`)">Download</button>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => document.body.removeChild(modal);

    window.onclick = (event) => {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// Download knowledge base
function downloadKnowledgeBase(title, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Reset chat
function resetChat() {
    conversationHistory = [];
    document.getElementById('chatMessages').innerHTML = '';
    addMessageToChat('bot', 'A conversa foi resetada. Como posso ajudar?');
}

// Create new bot
function createNewBot() {
    document.getElementById('configName').value = '';
    document.getElementById('apiKey').value = '';
    document.getElementById('systemPrompt').value = '';
    document.getElementById('knowledgeBaseTitle').value = '';
    document.getElementById('knowledgeText').value = '';
    knowledgeBases = [];
    updateKnowledgeBaseList();
    currentConfig = null;
    document.getElementById('sendMessage').disabled = true;
    conversationHistory = [];
    document.getElementById('chatMessages').innerHTML = '';
}

// Event Listeners
document.getElementById('knowledgeFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    const text = await handleFileLoad(file);
    document.getElementById('knowledgeText').value = text;
});

document.getElementById('addKnowledgeBase').addEventListener('click', function() {
    const title = document.getElementById('knowledgeBaseTitle').value.trim();
    const content = document.getElementById('knowledgeText').value.trim();
    if (title && content) {
        knowledgeBases.push({ title, content });
        updateKnowledgeBaseList();
        document.getElementById('knowledgeBaseTitle').value = '';
        document.getElementById('knowledgeText').value = '';
    } else {
        alert('Por favor, preencha o título e o conteúdo da base de conhecimento.');
    }
});

document.getElementById('botForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const config = {
        name: document.getElementById('configName').value,
        apiKey: document.getElementById('apiKey').value,
        model: 'gpt-4',
        systemPrompt: document.getElementById('systemPrompt').value,
        temperature: 0.7,
        maxTokens: 300,
        knowledgeBases: knowledgeBases
    };

    const isUpdate = saveConfig(config);
    alert(isUpdate ? 'Configuração atualizada com sucesso!' : 'Nova configuração salva com sucesso!');

    currentConfig = config;
    document.getElementById('sendMessage').disabled = false;
    
    loadSavedConfigs();
});

document.getElementById('sendMessage').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

document.getElementById('resetChat').addEventListener('click', resetChat);
document.getElementById('createNewBot').addEventListener('click', createNewBot);
document.getElementById('loadConfigFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        loadConfigFromFile(file);
    }
});

document.getElementById('downloadConfigTxt').addEventListener('click', function() {
    if (currentConfig) {
        downloadConfig(currentConfig, 'txt');
    } else {
        alert('Nenhuma configuração selecionada para download.');
    }
});

document.getElementById('exportCurl').addEventListener('click', function() {
    if (!currentConfig) {
        alert('Por favor, selecione uma configuração primeiro.');
        return;
    }
    
    const userInput = document.getElementById('userInput').value.trim();
    if (!userInput) {
        alert('Por favor, digite uma mensagem para gerar o comando cURL.');
        return;
    }
    
    downloadCurlCommand(currentConfig, userInput);
});

// Load saved configs on startup
function loadSavedConfigs() {
    const savedConfigs = getSavedConfigs();
    const container = document.getElementById('savedConfigsList');
    container.innerHTML = '';

    savedConfigs.forEach((config, index) => {
        const configElement = document.createElement('div');
        configElement.className = 'saved-config-item';
        
        const configName = document.createElement('span');
        configName.className = 'config-name';
        configName.textContent = config.name;
        configName.onclick = () => loadConfig(config);
        
        const updateBtn = document.createElement('button');
        updateBtn.className = 'update-btn';
        updateBtn.textContent = 'Atualizar';
        updateBtn.onclick = (e) => {
            e.stopPropagation();
            loadConfig(config);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Excluir';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Tem certeza que deseja excluir esta configuração?')) {
                deleteConfig(index);
                loadSavedConfigs();
            }
        };

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'Baixar';
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            downloadConfig(config);
        };

        configElement.appendChild(configName);
        configElement.appendChild(updateBtn);
        configElement.appendChild(deleteBtn);
        configElement.appendChild(downloadBtn);
        container.appendChild(configElement);
    });
}

// Initialize the application
loadSavedConfigs();
