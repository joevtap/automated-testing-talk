# Testes automatizados com Vitest + Cypress + Testcontainers

## Sobre este repositório

Esse repositório contém o código fonte de uma aplicação Next.js fullstack juntamente com testes de unidade (lógica de negócio e UI), integração e e2e.

Você pode seguir o histórico de commits para entender a evolução desse projeto. Para isso, utilize o comando `git log --oneline` para identificar os commits e `git checkout <hash do commit>` para "viajar" até o estado da codebase naquele ponto.

```sh
git checkout b96f944 # Vai para o commit do início da prática

# Veja o que quiser ver

git checkout main # Volta para o último commit na main
```

## Prática

**Documentação das ferramentas utilizadas:**

- https://nextjs.org/docs/app/guides/testing/vitest#manual-setup
- https://nextjs.org/docs/app/guides/testing/cypress#manual-setup
- https://vitest.dev/guide/
- https://docs.cypress.io/app/get-started/why-cypress
- https://node.testcontainers.org/
- https://testcontainers.com/modules/postgresql

### Configurar o ambiente

```sh
npx create-next-app@latest automated-testing --yes
```

**Instalar e configurar Vitest com React Testing Library:**

```sh
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

**Criar arquivo `vite.config.mts` na raiz do projeto:**

```ts
// vite.config.mts

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
 
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node', // <- IMPORTANTE para o nosso uso!
  },
})
```

**Adicionar script `test` no `package.json`:**

```json
// ...
"scripts": {
	// ...
	"test": "vitest",
	// ...
},
// ...
```

**Instalar e configurar Cypress:**

```sh
npm install -D cypress
```

```json
// ...
"scripts": {
	// ...
    "cypress:open": "cypress open"
	// ...
},
// ...
```

**Instalar módulo do PostgreSQL do Testcontainers:**

```sh
npm -D install @testcontainers/postgresql
```

**Instalar postgres.js:**

```sh
npm i postgres
```

**Adicionar `docker-compose.yaml`:**

```yaml
services:
  db:
    image: postgres:18-alpine3.22
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: walletdb
    ports:
      - 5432:5432
    volumes:
      - ./docker-entrypoint-initdb.d:/docker-entrypoint-initdb.d:ro
      - db-data:/var/lib/postgresql/18/docker

volumes:
  db-data:
```

**Criar pasta  e script `docker-entrypoint-initdb.d/schema.sql`:**

```sql
-- docker-entrypoint-initdb.d/schema.sql

CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    balance BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO TABLE wallets (id, owner_id, balance) VALUES
(1, 1, 10000),
(2, 2, 5000),
(3, 3, 7500)
ON CONFLICT DO NOTHING;
```

### Teste de componentes com Cypress

**Adicionar estilos ao `cypress/support/component.ts`:**

```ts
// cypress/support/component.ts

import '../../src/app/globals.css'
```

Rodar `npm run cypress:open` configurar ambiente para "component testing" e criar primeiro teste.

Docs: https://docs.cypress.io/app/component-testing/get-started

### Teste e2e com Cypress

**Adicionar `baseUrl` no `cypress.config.ts`:**

```ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // <--
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
```

- Rodar `npm run cypress:open` configurar ambiente para "e2e testing"
- Em outro terminal, subir container do banco de dados com `docker compose up -d`
- Em outro terminal, subir a aplicação com `npm run dev`
- Na interface do Cypress criar seu primeiro teste e abrí-lo no editor de preferência.

Docs: https://docs.cypress.io/app/end-to-end-testing/writing-your-first-end-to-end-test

### Outra forma de testar componentes

Em vez de utilizar o Cypress, você pode utilizar o Vitest com a React Testing Library para testar os componentes da interface da sua aplicação Next.js.

Docs: https://nextjs.org/docs/app/guides/testing/vitest#creating-your-first-vitest-unit-test

Certifique-se de [configurar manualmente o ambiente de execução dos testes de componentes que fizer com o Vitest para `jsdom`](https://vitest.dev/guide/environment.html#environments-for-specific-files), caso contrário os testes não executarão corretamente (o padrão deste projeto é `node`, definido em `vite.config.mts`).
