# Mudanças Necessárias na Página Principal

## 1. Modificar handleSendToAgent

Buscar comentários anteriores (de outros agentes) e passar pra API.
Salvar modelo retornado no metadata do comentário.

## 2. Criar handleApprove  

Marca task como "approved_by_agent" no metadata.

## 3. Passar callbacks pro TaskChat

- onSendToAgent (modificado)
- onApprove (novo)
