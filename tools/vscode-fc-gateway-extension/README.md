# FusioneCore Gateway VS Code Extension

Extensao minima para enviar prompt ao gateway interno:

- Endpoint: `POST /llm/chat`
- URL base configuravel em `fcGateway.url`

## Uso rapido

1. No VS Code, abra esta pasta de extensao.
2. Pressione `F5` para abrir uma janela de Development Host.
3. Execute o comando:
   - `FusioneCore: Ask LLM Gateway`
4. Se houver texto selecionado, ele vira o prompt.
5. A resposta abre em um novo documento.

## Configuracao

No `settings.json` do VS Code:

```json
{
  "fcGateway.url": "http://127.0.0.1:8000",
  "fcGateway.bearerToken": "<jwt>",
  "fcGateway.userId": "gustavo",
  "fcGateway.teamId": "juridico",
  "fcGateway.sendUserInBody": false,
  "fcGateway.confidentiality": "medium",
  "fcGateway.urgency": "normal",
  "fcGateway.preferLowCost": false
}
```

Com `LLM_REQUIRE_TRUSTED_IDENTITY=true`, use `fcGateway.bearerToken`.
