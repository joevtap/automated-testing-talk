export type Id = number;
export type Money = number;

export class Wallet {
  constructor(
    public readonly id: Id,
    public readonly ownerId: Id,
    public readonly balance: Money
  ) {
    if (id <= 0) throw new Error('ID must be positive');
    if (ownerId <= 0) throw new Error('Owner ID must be positive');
    if (balance < 0) throw new Error('Balance cannot be negative');
    Object.freeze(this);
  }

  public deposit(amount: Money): Wallet {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    return new Wallet(this.id, this.ownerId, this.balance + amount);
  }

  public withdraw(amount: Money): Wallet {
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }
    if (amount > this.balance) {
      throw new Error('Insufficient funds');
    }

    return new Wallet(this.id, this.ownerId, this.balance - amount);
  }

  public transfer(amount: Money, recipient: Wallet): [Wallet, Wallet] {
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }
    if (amount > this.balance) {
      throw new Error('Insufficient funds for transfer');
    }

    const newSender = new Wallet(this.id, this.ownerId, this.balance - amount);
    const newRecipient = new Wallet(recipient.id, recipient.ownerId, recipient.balance + amount);

    return [newSender, newRecipient];
  }
}