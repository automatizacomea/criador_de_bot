// Configurações padrão da API
export const defaultApiConfig = {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 300,
    baseUrl: 'https://api.openai.com/v1/chat/completions'
};

// Gera o corpo da requisição para a API
export function generateRequestBody(config, message, conversationHistory = []) {
    const systemMessage = {
        role: "system",
        content: `${config.systemPrompt}\n\nBases de Conhecimento:\n${config.knowledgeBases.map(kb => `${kb.title}:\n${kb.content}`).join('\n\n')}`
    };

    const messages = [
        systemMessage,
        ...conversationHistory,
        { role: "user", content: message }
    ];

    return {
        model: config.model || defaultApiConfig.model,
        messages: messages,
        temperature: config.temperature || defaultApiConfig.temperature,
        max_tokens: config.maxTokens || defaultApiConfig.maxTokens
    };
}
