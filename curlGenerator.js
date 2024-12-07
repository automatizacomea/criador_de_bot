import { defaultApiConfig, generateRequestBody } from './apiConfig.js';

// Gera o comando cURL
export function generateCurlCommand(config, message, format = 'curl') {
    const requestBody = generateRequestBody(config, message);
    
    if (format === 'n8n') {
        return generateN8nConfig(config, requestBody);
    }
    
    return `curl -X POST "${defaultApiConfig.baseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${config.apiKey}" \\
  -d '${JSON.stringify(requestBody, null, 2)}'`;
}

// Gera configuração específica para o n8n
function generateN8nConfig(config, requestBody) {
    return {
        url: defaultApiConfig.baseUrl,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: requestBody
    };
}

// Download do comando cURL ou configuração n8n
export function downloadApiConfig(config, message, format = 'curl') {
    let content, filename, mimeType;
    
    if (format === 'n8n') {
        content = JSON.stringify(generateCurlCommand(config, message, 'n8n'), null, 2);
        filename = `${config.name}_n8n_config.json`;
        mimeType = 'application/json';
    } else {
        content = generateCurlCommand(config, message, 'curl');
        filename = `${config.name}_curl_command.txt`;
        mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
