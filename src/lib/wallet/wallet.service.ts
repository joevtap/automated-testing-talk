import { sql as defaultSql } from "../db/db";
import { Wallet, Id } from "./wallet";
import type postgres from 'postgres';

export class WalletService {
  constructor(private sql: postgres.Sql = defaultSql) { }

  public async transferFunds(
    senderWalletId: Id,
    recipientWalletId: Id,
    amount: number
  ): Promise<[Wallet, Wallet]> {
    return await this.sql.begin(async (sql) => {
      const [senderWalletRow] = await sql`
        SELECT *
        FROM wallets
        WHERE id = ${senderWalletId}
        FOR UPDATE
      `

      const [recipientWalletRow] = await sql`
        SELECT *
        FROM wallets
        WHERE id = ${recipientWalletId}
        FOR UPDATE
      `

      if (!senderWalletRow) throw new Error('Sender wallet not found')
      if (!recipientWalletRow) throw new Error('Recipient wallet not found')

      const senderWallet = new Wallet(senderWalletRow.id, senderWalletRow.owner_id, Number(senderWalletRow.balance))
      const recipientWallet = new Wallet(recipientWalletRow.id, recipientWalletRow.owner_id, Number(recipientWalletRow.balance))

      const [newSenderWallet, newRecipientWallet] = senderWallet.transfer(amount, recipientWallet)

      await sql`
        UPDATE wallets
        SET balance = ${newSenderWallet.balance}
        WHERE id = ${newSenderWallet.id}
      `

      await sql`
        UPDATE wallets
        SET balance = ${newRecipientWallet.balance}
        WHERE id = ${newRecipientWallet.id}
      `

      return [newSenderWallet, newRecipientWallet];
    })
  }
}