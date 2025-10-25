import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres from 'postgres'
import { WalletService } from './wallet.service'

describe('WalletService Integration Tests', () => {
  let container: StartedPostgreSqlContainer
  let sql: ReturnType<typeof postgres>
  let walletService: WalletService

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18-alpine3.22')
      .withExposedPorts(5432)
      .start()

    const connectionString = container.getConnectionUri()

    sql = postgres(connectionString, {
      transform: {
        undefined: null,
      },
      types: {
        bigint: postgres.BigInt,
      },
    })

    await sql`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL,
        balance BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    walletService = new WalletService(sql)
  }, 60000)

  afterAll(async () => {
    await sql.end()
    await container.stop()
  })

  beforeEach(async () => {
    await sql`TRUNCATE TABLE wallets RESTART IDENTITY`
    await sql`
      INSERT INTO wallets (id, owner_id, balance) VALUES
      (1, 1, 10000),
      (2, 2, 5000),
      (3, 3, 7500)
    `
  })
})
