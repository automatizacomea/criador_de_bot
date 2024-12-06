// Variáveis globais
let currentConfig = null;
let conversationHistory = [];
let knowledgeBases = [];

// Atualizar a lista de bases de conhecimento
function updateKnowledgeBaseList() {
    const list = document.getElementById("knowledgeBaseList");
    list.innerHTML = "";
    knowledgeBases.forEach((kb, index) => {
        const li = document.createElement("li");
        li.className = "knowledge-base-item";

        const title = document.createElement("span");
        title.className = "knowledge-base-title";
        title.textContent = kb.title;

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Excluir";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", () => {
            knowledgeBases.splice(index, 1);
            updateKnowledgeBaseList();
        });

        li.appendChild(title);
        li.appendChild(deleteBtn);
        list.appendChild(li);
    });
}

// Adicionar base de conhecimento
document.getElementById("addKnowledgeBase").addEventListener("click", () => {
    const title = document.getElementById("knowledgeBaseTitle").value.trim();
    const content = document.getElementById("knowledgeText").value.trim();

    if (title && content) {
        knowledgeBases.push({ title, content });
        updateKnowledgeBaseList();

        // Limpar campos
        document.getElementById("knowledgeBaseTitle").value = "";
        document.getElementById("knowledgeText").value = "";
    } else {
        alert("Por favor, preencha o título e o conteúdo.");
    }
});

// Resetar conversa
document.getElementById("resetChat").addEventListener("click", () => {
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.innerHTML = "";
    conversationHistory = [];
    document.getElementById("sendMessage").disabled = true;
});

// Criar novo bot
document.getElementById("createNewBot").addEventListener("click", () => {
    if (confirm("Tem certeza de que deseja criar um novo bot? Todos os dados atuais serão perdidos.")) {
        currentConfig = null;
        knowledgeBases = [];
        conversationHistory = [];

        document.getElementById("configName").value = "";
        document.getElementById("apiKey").value = "";
        document.getElementById("systemPrompt").value = "";
        updateKnowledgeBaseList();

        alert("Novo bot criado com sucesso.");
    }
});

// Enviar mensagem no chat
document.getElementById("userInput").addEventListener("input", (e) => {
    const sendMessageBtn = document.getElementById("sendMessage");
    sendMessageBtn.disabled = !e.target.value.trim();
});

document.getElementById("sendMessage").addEventListener("click", () => {
    const userInput = document.getElementById("userInput");
    const message = userInput.value.trim();

    if (message) {
        const chatMessages = document.getElementById("chatMessages");

        // Adicionar mensagem do usuário
        const userMessage = document.createElement("div");
        userMessage.className = "message user-message";
        userMessage.textContent = message;
        chatMessages.appendChild(userMessage);

        // Simular resposta do bot
        const botMessage = document.createElement("div");
        botMessage.className = "message bot-message";
        botMessage.textContent = `Resposta ao: "${message}"`;
        chatMessages.appendChild(botMessage);

        conversationHistory.push({ user: message, bot: botMessage.textContent });
        userInput.value = "";
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// Baixar o Bot em formato TXT
document.getElementById("download-txt").addEventListener("click", () => {
    const botData = {
        name: currentConfig?.name || "BotSemNome",
        apiKey: currentConfig?.apiKey || "",
        systemPrompt: currentConfig?.systemPrompt || "",
        knowledgeBases: knowledgeBases,
    };

    const textContent = `
Bot: ${botData.name}
API Key: ${botData.apiKey}
Prompt do Sistema:
${botData.systemPrompt}

Base de Conhecimento:
${botData.knowledgeBases
        .map(kb => `Título: ${kb.title}\nConteúdo: ${kb.content}`)
        .join("\n\n")}
    `;

    const blob = new Blob([textContent.trim()], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${botData.name || "Bot"}.txt`;
    link.click();
});

// Carregar um Bot de um arquivo JSON
document.getElementById("upload-json").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const botData = JSON.parse(e.target.result);

                // Atualizar configurações
                document.getElementById('configName').value = botData.name || '';
                document.getElementById('apiKey').value = botData.apiKey || '';
                document.getElementById('systemPrompt').value = botData.systemPrompt || '';
                knowledgeBases = botData.knowledgeBases || [];

                updateKnowledgeBaseList();
                alert(`Bot "${botData.name}" carregado com sucesso!`);
            } catch (error) {
                alert("Erro: O arquivo selecionado não é um JSON válido.");
            }
        };
        reader.readAsText(file);
    }
});
