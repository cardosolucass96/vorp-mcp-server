#!/bin/bash

TOKEN="M0ra1s#3013|grupogx|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4M2JkNjQ2ZDdlYmFhNTk5NTAxNzZmNjc1OGU0OTliNDkwMDdiNTNmODI2M2E0MTQ2ODc2MTUwZjcwNTFiMmMxM2FmZGU4ZTFlNjViMjNmIn0.eyJhdWQiOiIzODQ4ZTJkYS0xMjY2LTQ1YjEtODk3ZS00NGMyZGQ0ZDU5YzUiLCJqdGkiOiJkODNiZDY0NmQ3ZWJhYTU5OTUwMTc2ZjY3NThlNDk5YjQ5MDA3YjUzZjgyNjNhNDE0Njg3NjE1MGY3MDUxYjJjMTNhZmRlOGUxZTY1YjIzZiIsImlhdCI6MTc2NTgyNjQyMCwibmJmIjoxNzY1ODI2NDIwLCJleHAiOjE3ODU0NTYwMDAsInN1YiI6Ijk2ODk3NDciLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzEzNDcxMTksImJhc2VfZG9tYWluIjoia29tbW8uY29tIiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyIsInB1c2hfbm90aWZpY2F0aW9ucyJdLCJoYXNoX3V1aWQiOiIzMGUyYzY5NS1kZmFmLTRmNDMtODk5Yi03YTcxNzEzMDZhODQiLCJ1c2VyX2ZsYWdzIjoxLCJhcGlfZG9tYWluIjoiYXBpLWcua29tbW8uY29tIn0.ZNUiC3zHnfX8IWFpt3Op8q1PPQVzreDeFbWJK2dYN65rIAm62zqE71nBgjMNnVgrM0keKRTx82LAYSe-psUMb_uwmkrVuS-m6op6T33ZyQvZdZIsPRUZID0z6Keq2qSe1kiCZqUVwV7hFbUh435akperHkn1PaXaltlTPlhLeZaWMAT93XsNJwwbhivaARMnkJTV8bOvU_ictXXIMoqTHrYRAdBivXiLka6pfsld_u6EO-vSvmErmPpk03dPEFsS6r8Is_WoPlRb1qmhdmHAPD9_4VbHOY9WLNC8sKvtJE7CcjJD4Ub_8rsSo2hKqI-sctfcHCOZOl7Zahn0yMaDUw"

echo "🧪 Testando kommo_get_lead_conversations"
echo "=========================================="
echo ""

echo "📋 Teste 1: Buscar conversas do lead 21320697 (com 5 mensagens por conversa)"
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "kommo_get_lead_conversations",
      "arguments": {
        "lead_id": 21320697,
        "limit_messages": 5
      }
    }
  }' | jq '.result | {
    lead: .lead,
    total_conversations: .total_conversations,
    primeira_conversa: .conversations[0] | {
      talk_id,
      origin,
      status,
      total_messages: (.messages | length),
      ultimas_mensagens: .messages[:2] | .[] | {created_at, type, text}
    }
  }'

echo ""
echo "=========================================="
echo "✅ Teste concluído!"
