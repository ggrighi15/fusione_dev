# FusioneCore - Padrões e Boas Práticas

Versão: 1.0  
Data: 2026-02-17  
Objetivo: manter código consistente, seguro e manutenível.

## Princípios

1. AI-First
- ChatGPT/Gemini para planejamento.
- Copilot/Codex para produtividade e refatoração.

2. Type-Safe
- TypeScript strict.
- Contratos tipados e validação de entrada.

3. Test-Driven
- Testes junto com implementação.
- Cobertura alvo >= 80%.

4. Documentation-First
- Documento de feature antes de codar.
- Atualização de README/docs no mesmo ciclo.

5. Security-First
- Nunca expor segredo.
- Validar input.
- RLS e least privilege em dados sensíveis.

## Padrões de Código

## TypeScript
- Ativar `strict`, `noImplicitAny`, `strictNullChecks`.
- Tipos explícitos em funções públicas.

## React
- Componentes funcionais + hooks.
- Custom hooks com tipo de retorno explícito.
- Evitar repetição de classes utilitárias; criar componentes reutilizáveis.

## API
- Validar input com schema.
- Separar rotas por domínio.
- Endpoints de escrita com autenticação/autorização.

## Banco e ORM
- Schema organizado por domínio.
- Índices para filtros de alta frequência.
- Nome de tabela/coluna em `snake_case` quando aderente ao domínio de dados.

## Convenções de Nomenclatura

- `PascalCase`: componentes e classes.
- `camelCase`: variáveis, funções e hooks.
- `kebab-case`: páginas/rotas e nomes de artefatos de deploy.
- `snake_case`: tabelas/colunas de banco.
- `UPPER_SNAKE_CASE`: constantes.

## Conventional Commits

Formato:

```text
<tipo>(<escopo>): <descricao curta>
```

Tipos recomendados:
- `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`.

## Testes

- Unitário: fluxo feliz + erros principais.
- Integração: contratos de API e persistência.
- CI obrigatório para merge em `main`/`develop`.

## Segurança

- Segredos apenas em variáveis de ambiente.
- Sem log de token/chave.
- Validar e sanitizar entradas.
- Aplicar RLS nas tabelas críticas quando houver Supabase/Postgres.

## Checklist de PR

- [ ] Tipagem sem erro.
- [ ] Lint/format aplicados.
- [ ] Testes passando.
- [ ] Cobertura >= 80% no escopo alterado.
- [ ] Documentação atualizada.
- [ ] Sem segredo em código/log.
- [ ] Commit message em Conventional Commits.
