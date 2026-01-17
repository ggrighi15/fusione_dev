const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('🚀 Iniciando Configuração de Autenticação Supabase...');

  // 1. Get Access Token
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

  // 2. Get Project Ref
  let projectRef = process.env.PROJECT_REF;
  if (!projectRef) {
    console.log('\nPara obter seu Project Ref, verifique a URL do projeto: https://supabase.com/dashboard/project/<project-ref>');
    projectRef = await askQuestion('Digite seu Project Reference ID: ');
  }

  if (!projectRef) {
    console.error('❌ Project Reference é obrigatório.');
    rl.close();
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('\nSelecione o Provedor para Configurar:');
    console.log('1. GitHub');
    console.log('2. Apple');
    console.log('3. Azure');
    const choice = await askQuestion('Digite sua escolha (1, 2 ou 3): ');

    let body = {};
    let providerName = '';

    if (choice === '1') {
      providerName = 'GitHub';
      const clientId = await askQuestion('Digite o GitHub Client ID: ');
      const secret = await askQuestion('Digite o GitHub Client Secret: ');
      
      body = {
        external_github_enabled: true,
        external_github_client_id: clientId,
        external_github_secret: secret
      };
    } else if (choice === '2') {
      providerName = 'Apple';
      const clientId = await askQuestion('Digite o Apple Services ID (Client ID): ');
      const secret = await askQuestion('Digite a Apple Secret Key: ');
      
      body = {
        external_apple_enabled: true,
        external_apple_client_id: clientId,
        external_apple_secret: secret
      };
    } else if (choice === '3') {
      providerName = 'Azure';
      const clientId = await askQuestion('Digite o Azure Client ID: ');
      const secret = await askQuestion('Digite o Azure Secret: ');
      const tenant = await askQuestion('Digite o Azure Tenant (opcional/padrão): ');
      
      body = {
        external_azure_enabled: true,
        external_azure_client_id: clientId,
        external_azure_secret: secret,
        // external_azure_url is often tenant specific, check docs if needed
      };
      if (tenant) body.external_azure_tenant = tenant;
      
    } else {
        console.error('Escolha inválida');
        rl.close();
        return;
    }

    console.log(`\n⚙️  Configurando ${providerName}...`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Falha ao configurar auth: ${res.status} ${res.statusText} - ${errText}`);
    }

    const data = await res.json();
    console.log(`\n✅ Autenticação ${providerName} configurada com sucesso!`);
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    rl.close();
  }
}

main();
