const express = require('express');
const router = express.Router();

// Função para obter os bots salvos
function getSavedBots() {
    const savedConfigs = JSON.parse(localStorage.getItem('botConfigs') || '[]');
    return savedConfigs;
}

// Rota para listar todos os bots
router.get('/bots', (req, res) => {
    const bots = getSavedBots();
    res.json(bots.map(bot => ({ id: bot.name, name: bot.name })));
});

// Rota para usar um bot específico
router.post('/use-bot/:id', async (req, res) => {
    const botId = req.params.id;
    const message = req.body.message;

    const bots = getSavedBots();
    const bot = bots.find(b => b.name === botId);

    if (!bot) {
        return res.status(404).json({ error: 'Bot não encontrado' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bot.apiKey}`
            },
            body: JSON.stringify({
                model: bot.model,
                messages: [
                    {
                        role: "system",
                        content: `${bot.systemPrompt}\n\nBases de Conhecimento:\n${bot.knowledgeBases.map(kb => `${kb.title}:\n${kb.content}`).join('\n\n')}`
                    },
                    { role: "user", content: message }
                ],
                temperature: bot.temperature,
                max_tokens: bot.maxTokens
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        const botResponse = data.choices[0].message.content;
        res.json({ response: botResponse });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

