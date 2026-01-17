const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('🚀 Iniciando Setup do Projeto Supabase...');

  let token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.log('\nPara obter seu token de acesso, visite: https://supabase.com/dashboard/account/tokens');
    token = await askQuestion('Digite seu Supabase Access Token: ');
  }

  if (!token) {
    console.error('❌ Access token é obrigatório.');
    rl.close();
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. List Organizations
    console.log('\n🔍 Buscando organizações...');
    const orgsRes = await fetch('https://api.supabase.com/v1/organizations', { headers });
    
    if (!orgsRes.ok) {
      throw new Error(`Falha ao buscar organizações: ${orgsRes.status} ${orgsRes.statusText}`);
    }

    const orgs = await orgsRes.json();
    if (orgs.length === 0) {
      console.error('❌ Nenhuma organização encontrada. Por favor crie uma no painel do Supabase primeiro.');
      rl.close();
      return;
    }

    console.log('\nOrganizações Disponíveis:');
    orgs.forEach((org) => {
      console.log(`- [${org.id}] ${org.name}`);
    });

    // 2. Select Organization
    let orgId = process.env.SUPABASE_ORG_ID;
    if (!orgId) {
        orgId = await askQuestion('\nDigite o ID da Organização para usar: ');
    }
    
    // Validate Org ID exists in the list
    const selectedOrg = orgs.find(o => o.id === orgId);
    if (!selectedOrg) {
        console.warn(`⚠️  Aviso: Organization ID "${orgId}" não foi encontrado na lista acima.`);
        if (!process.env.SUPABASE_ORG_ID) { // Only ask if not automated
             const confirm = await askQuestion('Continuar mesmo assim? (s/n): ');
             if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'y') {
                 rl.close();
                 return;
             }
        }
    }

    // 3. Project Details
    const projectName = process.env.SUPABASE_PROJECT_NAME || await askQuestion('Digite o Nome do Projeto (padrão: "My Project"): ') || "My Project";
    
    let dbPass = process.env.SUPABASE_DB_PASS;
    if (!dbPass) {
        dbPass = await askQuestion('Digite a Senha do Banco de Dados: ');
    }

    if (!dbPass) {
        console.error('❌ Senha do banco de dados é obrigatória.');
        rl.close();
        return;
    }

    // 4. Create Project
    console.log(`\n🛠  Criando projeto "${projectName}"...`);
    const createRes = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            organization_id: orgId,
            name: projectName,
            region: 'us-east-1',
            db_pass: dbPass
        })
    });

    if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Falha ao criar projeto: ${createRes.status} ${createRes.statusText} - ${errText}`);
    }

    const projectData = await createRes.json();
    console.log('\n✅ Projeto criado com sucesso!');
    console.log(JSON.stringify(projectData, null, 2));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    rl.close();
  }
}

main();
