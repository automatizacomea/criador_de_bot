// Classe para gerenciar a API dos bots
class BotAPI {
    constructor() {
        this.storageKey = 'botConfigs';
    }

    // Obtém todos os bots disponíveis
    getAllBots() {
        const configs = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        return configs.map(config => ({
            id: config.name,
            name: config.name
        }));
    }

    // Obtém um bot específico pelo ID (nome)
    getBot(botId) {
        const configs = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        return configs.find(config => config.name === botId);
    }

    // Envia uma mensagem para um bot específico
    async sendMessage(botId, message) {
        const bot = this.getBot(botId);
        if (!bot) {
            throw new Error('Bot não encontrado');
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bot.apiKey}`
                },
                body: JSON.stringify({
                    model: bot.model || 'gpt-4o-mini-2024-07-18',
                    messages: [
                        {
                            role: "system",
                            content: `${bot.systemPrompt}\n\nBases de Conhecimento:\n${bot.knowledgeBases.map(kb => `${kb.title}:\n${kb.content}`).join('\n\n')}`
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    temperature: bot.temperature || 0.7,
                    max_tokens: bot.maxTokens || 150
                })
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }

            return {
                success: true,
                response: data.choices[0].message.content
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Exporta a API para uso global
window.BotAPI = new BotAPI();
