let currentConfig = null;
let conversationHistory = [];
let knowledgeBases = [];

// Lida com o carregamento de arquivos
document.getElementById('knowledgeFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'text/plain') {
        const text = await file.text();
        document.getElementById('knowledgeText').value = text;
    } else if (file.type === 'application/pdf') {
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
            document.getElementById('knowledgeText').value = fullText;
        };
        reader.readAsArrayBuffer(file);
    }
});

// Adiciona base de conhecimento
document.getElementById('addKnowledgeBase').addEventListener('click', function() {
    const knowledgeTitle = document.getElementById('knowledgeBaseTitle').value.trim();
    const knowledgeText = document.getElementById('knowledgeText').value.trim();
    if (knowledgeTitle && knowledgeText) {
        knowledgeBases.push({ title: knowledgeTitle, content: knowledgeText });
        updateKnowledgeBaseList();
        document.getElementById('knowledgeBaseTitle').value = '';
        document.getElementById('knowledgeText').value = '';
    } else {
        alert('Por favor, preencha o título e o conteúdo da base de conhecimento.');
    }
});

// Atualiza a lista de bases de conhecimento
function updateKnowledgeBaseList() {
    const list = document.getElementById('knowledgeBaseList');
    list.innerHTML = '';
    knowledgeBases.forEach((base, index) => {
        const li = document.createElement('li');
        li.className = 'knowledge-base-item';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'knowledge-base-title';
        titleSpan.textContent = base.title;
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

// Salva ou atualiza configuração
document.getElementById('botForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const config = {
        name: document.getElementById('configName').value,
        apiKey: document.getElementById('apiKey').value,
        model: 'gpt-4o-mini-2024-07-18', // Modelo fixo
        systemPrompt: document.getElementById('systemPrompt').value,
        temperature: 0.7, // Temperatura fixa
        maxTokens: 150, // Tokens fixos
        knowledgeBases: knowledgeBases
    };

    // Verifica se é uma atualização ou uma nova configuração
    const savedConfigs = JSON.parse(localStorage.getItem('botConfigs') || '[]');
    const existingConfigIndex = savedConfigs.findIndex(c => c.name === config.name);

    if (existingConfigIndex !== -1) {
        // Atualiza a configuração existente
        savedConfigs[existingConfigIndex] = config;
        alert('Configuração atualizada com sucesso!');
    } else {
        // Adiciona nova configuração
        savedConfigs.push(config);
        alert('Nova configuração salva com sucesso!');
    }

    localStorage.setItem('botConfigs', JSON.stringify(savedConfigs));

    currentConfig = config;
    document.getElementById('sendMessage').disabled = false;
    
    loadSavedConfigs();
});

// Carrega configurações salvas
function loadSavedConfigs() {
    const savedConfigs = JSON.parse(localStorage.getItem('botConfigs') || '[]');
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
            showConfirmDialog(index);
        };
        
        configElement.appendChild(configName);
        configElement.appendChild(updateBtn);
        configElement.appendChild(deleteBtn);
        container.appendChild(configElement);
    });
}

// Carrega uma configuração
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

// Envia mensagem para o bot
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    if (!message) return;

    // Adiciona mensagem do usuário ao chat
    addMessageToChat('user', message);
    userInput.value = '';

    // Prepara o histórico da conversa
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
                model: currentConfig.model,
                messages: [
                    {
                        role: "system",
                        content: `${currentConfig.systemPrompt}\n\nBases de Conhecimento:\n${currentConfig.knowledgeBases.map(kb => `${kb.title}:\n${kb.content}`).join('\n\n')}`
                    },
                    ...conversationHistory
                ],
                temperature: currentConfig.temperature,
                max_tokens: currentConfig.maxTokens
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

// Adiciona mensagem ao chat
function addMessageToChat(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Mostra diálogo de confirmação
function showConfirmDialog(index) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <p>Tem certeza que deseja excluir esta configuração?</p>
        <div class="dialog-buttons">
            <button class="cancel-btn">Cancelar</button>
            <button class="confirm-btn">Confirmar</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    dialog.querySelector('.cancel-btn').onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    };

    dialog.querySelector('.confirm-btn').onclick = () => {
        deleteConfig(index);
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    };
}

// Deleta configuração
function deleteConfig(index) {
    const savedConfigs = JSON.parse(localStorage.getItem('botConfigs') || '[]');
    savedConfigs.splice(index, 1);
    localStorage.setItem('botConfigs', JSON.stringify(savedConfigs));
    loadSavedConfigs();
}

// Reseta a conversa
function resetChat() {
    conversationHistory = [];
    document.getElementById('chatMessages').innerHTML = '';
    addMessageToChat('bot', 'A conversa foi resetada. Como posso ajudar?');
}

// Cria um novo bot
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

// Adiciona informações sobre como usar os bots em outras automações
function addApiInstructions() {
    const container = document.querySelector('.container');
    const apiInstructions = document.createElement('div');
    apiInstructions.className = 'api-instructions';
    apiInstructions.innerHTML = `
        <h3>Usar Bots em Outras Automações</h3>
        <p>Para usar os bots criados em outras automações, use as seguintes rotas API:</p>
        <ul>
            <li><strong>GET /api/bots</strong>: Lista todos os bots disponíveis</li>
            <li><strong>POST /api/use-bot/:id</strong>: Usa um bot específico (substitua :id pelo nome do bot)</li>
        </ul>
        <p>Exemplo de uso com curl:</p>
        <pre>
curl -X POST http://localhost:3000/api/use-bot/MeuBot -H "Content-Type: application/json" -d '{"message":"Olá, como posso te ajudar?"}'
        </pre>
    `;
    container.appendChild(apiInstructions);
}

// Chama a função para adicionar as instruções da API
addApiInstructions();

// Event listeners
document.getElementById('sendMessage').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
document.getElementById('resetChat').addEventListener('click', resetChat);
document.getElementById('createNewBot').addEventListener('click', createNewBot);

// Carrega configurações salvas ao iniciar
loadSavedConfigs();

