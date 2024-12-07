import { downloadApiConfig } from '../utils/curlGenerator.js';

export function createExportButtons(container) {
    // Botão para exportar como cURL
    const curlButton = document.createElement('button');
    curlButton.id = 'exportCurl';
    curlButton.textContent = 'Exportar como cURL';
    curlButton.className = 'export-btn curl';
    
    // Botão para exportar configuração n8n
    const n8nButton = document.createElement('button');
    n8nButton.id = 'exportN8n';
    n8nButton.textContent = 'Exportar para n8n';
    n8nButton.className = 'export-btn n8n';
    
    container.appendChild(curlButton);
    container.appendChild(n8nButton);
    
    return { curlButton, n8nButton };
}
