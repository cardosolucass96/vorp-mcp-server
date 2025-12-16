#!/bin/bash

# Script de teste para Tool Definitions Dinâmicas
# As descrições das tools agora incluem automaticamente os pipelines e etapas do CRM

echo "========================================="
echo "Teste: Tool Definitions Dinâmicas"
echo "========================================="
echo ""

# Substitua pelo seu token válido
TOKEN="SEU_TOKEN_AQUI"

if [ "$TOKEN" = "SEU_TOKEN_AQUI" ]; then
  echo "⚠️  ATENÇÃO: Atualize o TOKEN no script antes de executar!"
  echo ""
  echo "Formato: M0ra1s#3013|grupogx|SEU_ACCESS_TOKEN_DO_KOMMO"
  echo ""
  exit 1
fi

echo "1️⃣  Testando endpoint tools/list (MCP Protocol)"
echo "   Deve retornar as tool definitions com pipelines embutidos..."
echo ""

curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/list"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'result' in data and 'tools' in data['result']:
    tools = data['result']['tools']
    for tool in tools:
        if tool['name'] == 'kommo_list_leads':
            print('✅ Tool kommo_list_leads encontrada!')
            print('')
            desc = tool['description']
            if '📊 PIPELINES E ETAPAS' in desc:
                print('✅ Descrição contém informações de pipelines!')
                print('')
                # Extrair e mostrar a seção de pipelines
                if '📊 PIPELINES' in desc:
                    pipeline_section = desc.split('📊 PIPELINES')[1]
                    print('Pipelines embutidos na descrição:')
                    print(pipeline_section[:500] + '...')
            else:
                print('❌ Descrição NÃO contém informações de pipelines')
                print('Descrição:', desc[:200])
            break
else:
    print('❌ Erro na resposta:', json.dumps(data, indent=2))
" 2>/dev/null

echo ""
echo ""
echo "========================================="
echo "2️⃣  Testando busca de leads (deve funcionar normalmente)"
echo ""

curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_leads",
      "arguments":{"limit":1}
    }
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'result' in data:
    print('✅ Busca de leads funcionou!')
    content = json.loads(data['result']['content'][0]['text'])
    print(f'   Total de leads: {content.get(\"total\", 0)}')
else:
    print('❌ Erro:', data.get('error', {}).get('message', 'Unknown'))
" 2>/dev/null

echo ""
echo "========================================="
echo "✅ Teste concluído!"
echo ""
echo "BENEFÍCIOS:"
echo "• O agente não precisa mais chamar kommo_list_pipelines separadamente"
echo "• As descrições das tools são personalizadas para cada CRM"
echo "• Os pipelines são carregados dinamicamente na primeira requisição"
echo "========================================="
