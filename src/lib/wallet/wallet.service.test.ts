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

  describe('transferFunds', () => {
    it('should transfer funds between wallets successfully', async () => {
      const [sender, recipient] = await walletService.transferFunds(1, 2, 3000)

      expect(sender.ownerId).toBe(1)
      expect(sender.balance).toBe(7000) // 10000 - 3000
      expect(recipient.ownerId).toBe(2)
      expect(recipient.balance).toBe(8000) // 5000 + 3000

      const [senderRow] = await sql`SELECT owner_id, balance FROM wallets WHERE owner_id = 1`
      const [recipientRow] = await sql`SELECT owner_id, balance FROM wallets WHERE owner_id = 2`

      expect(senderRow.balance).toBe(BigInt(7000))
      expect(recipientRow.balance).toBe(BigInt(8000))
    })

    it('should handle full balance transfer', async () => {
      const [sender, recipient] = await walletService.transferFunds(1, 2, 10000)

      expect(sender.balance).toBe(0)
      expect(recipient.balance).toBe(15000) // 5000 + 10000

      const [senderRow] = await sql`SELECT balance FROM wallets WHERE owner_id = 1`
      expect(senderRow.balance).toBe(BigInt(0))
    })

    it('should throw error for non-existent sender', async () => {
      await expect(
        walletService.transferFunds(999, 2, 1000)
      ).rejects.toThrow('Sender wallet not found')

      const [recipientRow] = await sql`SELECT balance FROM wallets WHERE owner_id = 2`
      expect(recipientRow.balance).toBe(BigInt(5000))
    })

    it('should throw error for non-existent recipient', async () => {
      await expect(
        walletService.transferFunds(1, 999, 1000)
      ).rejects.toThrow('Recipient wallet not found')

      const [senderRow] = await sql`SELECT balance FROM wallets WHERE owner_id = 1`
      expect(senderRow.balance).toBe(BigInt(10000))
    })

    it('should throw error for insufficient funds', async () => {
      await expect(
        walletService.transferFunds(1, 2, 15000)
      ).rejects.toThrow('Insufficient funds for transfer')

      const [senderRow] = await sql`SELECT balance FROM wallets WHERE owner_id = 1`
      const [recipientRow] = await sql`SELECT balance FROM wallets WHERE owner_id = 2`

      expect(senderRow.balance).toBe(BigInt(10000))
      expect(recipientRow.balance).toBe(BigInt(5000))
    })

    it('should throw error for non-positive transfer amount', async () => {
      await expect(
        walletService.transferFunds(1, 2, 0)
      ).rejects.toThrow('Transfer amount must be positive')

      await expect(
        walletService.transferFunds(1, 2, -1000)
      ).rejects.toThrow('Transfer amount must be positive')
    })

    it('should maintain atomicity - both wallets updated or neither', async () => {
      await walletService.transferFunds(1, 2, 2500)

      const [senderRow] = await sql`SELECT balance FROM wallets WHERE owner_id = 1`
      const [recipientRow] = await sql`SELECT balance FROM wallets WHERE owner_id = 2`

      expect(senderRow.balance).toBe(BigInt(7500))
      expect(recipientRow.balance).toBe(BigInt(7500))

      const totalBefore = 10000 + 5000
      const totalAfter = Number(senderRow.balance) + Number(recipientRow.balance)
      expect(totalAfter).toBe(totalBefore)
    })

    it('should handle concurrent transfers with row locking', async () => {
      const transfer1 = walletService.transferFunds(1, 2, 1000)
      const transfer2 = walletService.transferFunds(1, 3, 2000)

      await Promise.all([transfer1, transfer2])

      const [senderRow] = await sql`SELECT balance FROM wallets WHERE owner_id = 1`
      expect(senderRow.balance).toBe(BigInt(7000)) // 10000 - 1000 - 2000
    })
  })
})
