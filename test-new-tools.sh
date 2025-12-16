#!/bin/bash

# Script de teste para as 5 novas ferramentas
echo "========================================="
echo "🧪 Teste das Novas Ferramentas - Kommo MCP"
echo "========================================="
echo ""

# Substitua pelo seu token válido
TOKEN="SEU_TOKEN_AQUI"

if [ "$TOKEN" = "SEU_TOKEN_AQUI" ]; then
  echo "⚠️  ATENÇÃO: Atualize o TOKEN no script antes de executar!"
  echo "Formato: M0ra1s#3013|grupogx|SEU_ACCESS_TOKEN_DO_KOMMO"
  exit 1
fi

BASE_URL="http://localhost:3000/mcp"

echo "1️⃣  Testando kommo_list_users (Listar usuários/vendedores)"
echo "   Retorna todos os usuários do CRM..."
echo ""

curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_users"
    }
  }' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'result' in data:
        content = json.loads(data['result']['content'][0]['text'])
        print(f\"✅ Total de usuários: {content.get('total', 0)}\")
        users = content.get('users', [])
        if users:
            print(\"\\nUsuários encontrados:\")
            for user in users[:3]:  # Mostrar primeiros 3
                print(f\"   • {user['name']} (ID: {user['id']}) - {user['email']}\")
    else:
        print(f\"❌ Erro: {data.get('error', {}).get('message', 'Unknown')}\")
except Exception as e:
    print(f\"❌ Erro ao processar: {str(e)}\")
"

echo ""
echo "========================================="
echo "2️⃣  Testando kommo_list_contacts (Listar contatos)"
echo "   Retorna primeiros 5 contatos..."
echo ""

curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_contacts",
      "arguments":{"limit":5}
    }
  }' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'result' in data:
        content = json.loads(data['result']['content'][0]['text'])
        print(f\"✅ Total de contatos: {content.get('total', 0)}\")
        contacts = content.get('contacts', [])
        if contacts:
            print(\"\\nContatos encontrados:\")
            for contact in contacts[:3]:
                phones = ', '.join(map(str, contact.get('phones', []))) or 'Sem telefone'
                print(f\"   • {contact['name']} (ID: {contact['id']}) - {phones}\")
    else:
        print(f\"❌ Erro: {data.get('error', {}).get('message', 'Unknown')}\")
except Exception as e:
    print(f\"❌ Erro ao processar: {str(e)}\")
"

echo ""
echo "========================================="
echo "3️⃣  Testando kommo_get_lead_by_id (Buscar lead específico)"
echo "   Buscando o primeiro lead disponível..."
echo ""

# Primeiro, pegar ID de um lead existente
LEAD_ID=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc":"2.0",
    "id":999,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_leads",
      "arguments":{"limit":1}
    }
  }' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    content = json.loads(data['result']['content'][0]['text'])
    leads = content.get('leads', [])
    if leads:
        print(leads[0]['id'])
    else:
        print('0')
except:
    print('0')
" 2>/dev/null)

if [ "$LEAD_ID" != "0" ] && [ -n "$LEAD_ID" ]; then
    echo "   Lead ID encontrado: $LEAD_ID"
    echo ""
    
    curl -s -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"jsonrpc\":\"2.0\",
        \"id\":3,
        \"method\":\"tools/call\",
        \"params\":{
          \"name\":\"kommo_get_lead_by_id\",
          \"arguments\":{\"lead_id\":$LEAD_ID}
        }
      }" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'result' in data:
        content = json.loads(data['result']['content'][0]['text'])
        print(f\"✅ Lead encontrado: {content.get('name', 'Sem nome')}\")
        print(f\"   Valor: R\$ {content.get('price', 0)}\")
        contact_info = content.get('contact_info')
        if contact_info:
            print(f\"   Contato: {contact_info.get('name', 'N/A')} - {contact_info.get('phone', 'N/A')}\")
    else:
        print(f\"❌ Erro: {data.get('error', {}).get('message', 'Unknown')}\")
except Exception as e:
    print(f\"❌ Erro ao processar: {str(e)}\")
"
else
    echo "❌ Nenhum lead encontrado para testar"
fi

echo ""
echo "========================================="
echo "4️⃣  Testando kommo_search_leads_by_phone (Buscar por telefone)"
echo "   Buscando leads por telefone..."
echo ""

# Primeiro, pegar um telefone de um lead existente
PHONE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc":"2.0",
    "id":998,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_leads",
      "arguments":{"limit":5}
    }
  }' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    content = json.loads(data['result']['content'][0]['text'])
    leads = content.get('leads', [])
    for lead in leads:
        contact_info = lead.get('contact_info')
        if contact_info and contact_info.get('phone'):
            print(contact_info['phone'])
            break
    else:
        print('')
except:
    print('')
" 2>/dev/null)

if [ -n "$PHONE" ]; then
    echo "   Telefone encontrado: $PHONE"
    echo ""
    
    curl -s -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"jsonrpc\":\"2.0\",
        \"id\":4,
        \"method\":\"tools/call\",
        \"params\":{
          \"name\":\"kommo_search_leads_by_phone\",
          \"arguments\":{\"phone\":\"$PHONE\"}
        }
      }" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'result' in data:
        content = json.loads(data['result']['content'][0]['text'])
        print(f\"✅ Leads encontrados: {content.get('total', 0)}\")
        print(f\"   Contatos encontrados: {content.get('contacts_found', 0)}\")
    else:
        print(f\"❌ Erro: {data.get('error', {}).get('message', 'Unknown')}\")
except Exception as e:
    print(f\"❌ Erro ao processar: {str(e)}\")
"
else
    echo "❌ Nenhum telefone encontrado para testar"
fi

echo ""
echo "========================================="
echo "5️⃣  Testando kommo_create_lead (Criar novo lead)"
echo "   ATENÇÃO: Esta tool CRIA um lead real no CRM!"
echo "   Descomente as linhas abaixo para testar"
echo ""

# DESCOMENTE PARA TESTAR A CRIAÇÃO DE LEAD:
# curl -s -X POST "$BASE_URL" \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer $TOKEN" \
#   -d '{
#     "jsonrpc":"2.0",
#     "id":5,
#     "method":"tools/call",
#     "params":{
#       "name":"kommo_create_lead",
#       "arguments":{
#         "name":"Lead Teste MCP",
#         "price":1500,
#         "contact_name":"João Teste",
#         "contact_phone":"+5511999999999"
#       }
#     }
#   }' | python3 -c "
# import sys, json
# try:
#     data = json.load(sys.stdin)
#     if 'result' in data:
#         content = json.loads(data['result']['content'][0]['text'])
#         print(f\"✅ Lead criado com sucesso!\")
#         print(f\"   ID: {content.get('id')}\")
#         print(f\"   Nome: {content.get('name')}\")
#         print(f\"   Valor: R\$ {content.get('price', 0)}\")
#     else:
#         print(f\"❌ Erro: {data.get('error', {}).get('message', 'Unknown')}\")
# except Exception as e:
#     print(f\"❌ Erro ao processar: {str(e)}\")
# "

echo "⚠️  Teste de criação de lead desabilitado por padrão"
echo "   Descomente as linhas no script para testar"

echo ""
echo "========================================="
echo "✅ Testes concluídos!"
echo ""
echo "FERRAMENTAS DISPONÍVEIS:"
echo "✅ kommo_list_users - Listar usuários/vendedores"
echo "✅ kommo_list_contacts - Listar contatos"
echo "✅ kommo_get_lead_by_id - Buscar lead específico"
echo "✅ kommo_search_leads_by_phone - Buscar por telefone"
echo "✅ kommo_create_lead - Criar novo lead (com contato)"
echo ""
echo "Total de ferramentas: 12 (7 antigas + 5 novas)"
echo "========================================="
