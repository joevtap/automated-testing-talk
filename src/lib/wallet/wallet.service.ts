import { sql as defaultSql } from "../db/db";
import { Wallet, Id } from "./wallet";
import type postgres from 'postgres';

export class WalletService {
  constructor(private sql: postgres.Sql = defaultSql) { }

  public async transferFunds(
    senderId: Id,
    recipientId: Id,
    amount: number
  ): Promise<[Wallet, Wallet]> {
    const [newSender, newRecipient] = await this.sql.begin(async (sql) => {
      const [senderRow] = await sql`
        SELECT owner_id, balance
        FROM wallets
        WHERE owner_id = ${senderId}
        FOR UPDATE
      `

      const [recipientRow] = await sql`
        SELECT owner_id, balance
        FROM wallets
        WHERE owner_id = ${recipientId}
        FOR UPDATE
      `

      if (!senderRow) throw new Error('Sender wallet not found')
      if (!recipientRow) throw new Error('Recipient wallet not found')

      const sender = new Wallet(senderRow.owner_id, Number(senderRow.balance))
      const recipient = new Wallet(recipientRow.owner_id, Number(recipientRow.balance))

      const [newSender, newRecipient] = sender.transfer(amount, recipient)

      await sql`
        UPDATE wallets
        SET balance = ${newSender.balance}
        WHERE owner_id = ${newSender.ownerId}
      `

      await sql`
        UPDATE wallets
        SET balance = ${newRecipient.balance}
        WHERE owner_id = ${newRecipient.ownerId}
      `

      return [newSender, newRecipient];
    })

    return [newSender, newRecipient];
  }
}