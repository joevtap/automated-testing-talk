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
      INSERT INTO wallets (owner_id, balance) VALUES
      (1, 10000),
      (2, 5000),
      (3, 7500),
      (1, 2000),
      (2, 1000)
    `
  })

  describe('transferFunds', () => {
    it('should transfer funds between wallets successfully', async () => {
      const [senderWallet, recipientWallet] = await walletService.transferFunds(1, 2, 3000)

      expect(senderWallet.id).toBe(1)
      expect(senderWallet.balance).toBe(7000) // 10000 - 3000
      expect(recipientWallet.id).toBe(2)
      expect(recipientWallet.balance).toBe(8000) // 5000 + 3000

      const [senderWalletRow] = await sql`SELECT * FROM wallets WHERE id = 1`
      const [recipientWalletRow] = await sql`SELECT * FROM wallets WHERE id = 2`

      expect(senderWalletRow.balance).toBe(BigInt(7000))
      expect(recipientWalletRow.balance).toBe(BigInt(8000))
    })

    it('should handle full balance transfer', async () => {
      const [senderWallet, recipientWallet] = await walletService.transferFunds(1, 2, 10000)

      expect(senderWallet.balance).toBe(0)
      expect(recipientWallet.balance).toBe(15000) // 5000 + 10000

      const [senderWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 1`
      expect(senderWalletRow.balance).toBe(BigInt(0))
    })

    it('should throw error for non-existent sender wallet', async () => {
      await expect(
        walletService.transferFunds(999, 2, 1000)
      ).rejects.toThrow('Sender wallet not found')

      const [recipientWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 2`
      expect(recipientWalletRow.balance).toBe(BigInt(5000))
    })

    it('should throw error for non-existent recipient wallet', async () => {
      await expect(
        walletService.transferFunds(1, 999, 1000)
      ).rejects.toThrow('Recipient wallet not found')

      const [senderWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 1`
      expect(senderWalletRow.balance).toBe(BigInt(10000))
    })

    it('should throw error for insufficient funds', async () => {
      await expect(
        walletService.transferFunds(1, 2, 15000)
      ).rejects.toThrow('Insufficient funds for transfer')

      const [senderWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 1`
      const [recipientWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 2`

      expect(senderWalletRow.balance).toBe(BigInt(10000))
      expect(recipientWalletRow.balance).toBe(BigInt(5000))
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

      const [senderWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 1`
      const [recipientWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 2`

      expect(senderWalletRow.balance).toBe(BigInt(7500))
      expect(recipientWalletRow.balance).toBe(BigInt(7500))

      const totalBefore = 10000 + 5000
      const totalAfter = Number(senderWalletRow.balance) + Number(recipientWalletRow.balance)
      expect(totalAfter).toBe(totalBefore)
    })

    it('should handle concurrent transfers with row locking', async () => {
      const transfer1 = walletService.transferFunds(1, 2, 1000)
      const transfer2 = walletService.transferFunds(1, 3, 2000)

      await Promise.all([transfer1, transfer2])

      const [senderWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 1`
      expect(senderWalletRow.balance).toBe(BigInt(7000)) // 10000 - 1000 - 2000
    })

    it('shouldn\'t update all wallets from the same user in a transfer', async () => {
      await walletService.transferFunds(1, 2, 1000)

      const [senderWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 1`
      const [senderAnotherWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 4`
      const [recipientWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 2`
      const [recipientAnotherWalletRow] = await sql`SELECT balance FROM wallets WHERE id = 5`

      expect(senderWalletRow.balance).toBe(BigInt(9000))
      expect(recipientWalletRow.balance).toBe(BigInt(6000))
      expect(senderAnotherWalletRow.balance).toBe(BigInt(2000)) // Unchanged
      expect(recipientAnotherWalletRow.balance).toBe(BigInt(1000)) // Unchanged
    })
  })
})
