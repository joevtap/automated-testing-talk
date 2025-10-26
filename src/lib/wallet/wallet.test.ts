import { expect, describe, it } from 'vitest'
import { Wallet } from './wallet'

const createWallet = (id = 1, ownerId = 1, balance = 10000) => new Wallet(id, ownerId, balance)

describe('Wallet', () => {
  describe('constructor', () => {
    it('should create a wallet with valid parameters', () => {
      const wallet = createWallet(1, 1, 10000)

      expect(wallet.ownerId).toBe(1)
      expect(wallet.balance).toBe(10000)
    })

    it('should be frozen (immutable)', () => {
      const wallet = createWallet(1, 1, 10000)

      expect(Object.isFrozen(wallet)).toBe(true)
    })

    it.each([
      { balance: -5000, expected: 'Balance cannot be negative' },
      { balance: -1, expected: 'Balance cannot be negative' },
      { balance: -99900, expected: 'Balance cannot be negative' },
    ])('should throw an error for negative balance: $balance cents', ({ balance, expected }) => {
      expect(() => createWallet(1, 1, balance)).toThrow(expected)
    })

    it.each([
      { ownerId: 0, expected: 'Owner ID must be positive' },
      { ownerId: -1, expected: 'Owner ID must be positive' },
      { ownerId: -10, expected: 'Owner ID must be positive' },
      { ownerId: -999, expected: 'Owner ID must be positive' },
    ])('should throw an error for non-positive owner ID: $ownerId', ({ ownerId, expected }) => {
      expect(() => createWallet(1, ownerId, 10000)).toThrow(expected)
    })

    it.each([
      { id: 0, expected: 'Owner ID must be positive' },
      { id: -1, expected: 'Owner ID must be positive' },
    ])('should throw an error for non-positive ID: $id', ({ id, expected }) => {
      expect(() => createWallet(1, id, 10000)).toThrow(expected)
    })
  })

  describe('deposit', () => {
    it.each([
      { initial: 10000, amount: 5000, expected: 15000 }, // $100 + $50 = $150
      { initial: 0, amount: 10000, expected: 10000 }, // $0 + $100 = $100
      { initial: 5050, amount: 2525, expected: 7575 }, // $50.50 + $25.25 = $75.75
      { initial: 100000, amount: 1, expected: 100001 }, // $1000 + $0.01 = $1000.01
    ])('should deposit $amount cents to balance $initial cents correctly', ({ initial, amount, expected }) => {
      const wallet = createWallet(1, 1, initial)
      const newWallet = wallet.deposit(amount)

      expect(newWallet.balance).toBe(expected)
      expect(wallet.balance).toBe(initial) // Original unchanged
    })

    it('should return new wallet instances', () => {
      const wallet = createWallet(1, 1, 10000)
      const newWallet = wallet.deposit(5000)

      expect(newWallet).not.toBe(wallet)
    })

    it.each([
      { amount: 0, expected: 'Deposit amount must be positive' },
      { amount: -2000, expected: 'Deposit amount must be positive' },
      { amount: -1, expected: 'Deposit amount must be positive' },
    ])('should throw an error for non-positive deposit amount: $amount cents', ({ amount, expected }) => {
      const wallet = createWallet(1, 1, 10000)

      expect(() => wallet.deposit(amount)).toThrow(expected)
    })
  })

  describe('withdraw', () => {
    it.each([
      { initial: 10000, amount: 4000, expected: 6000 }, // $100 - $40 = $60
      { initial: 10000, amount: 10000, expected: 0 }, // $100 - $100 = $0
      { initial: 5050, amount: 2525, expected: 2525 }, // $50.50 - $25.25 = $25.25
      { initial: 100000, amount: 1, expected: 99999 }, // $1000 - $0.01 = $999.99
    ])('should withdraw $amount cents from balance $initial cents correctly', ({ initial, amount, expected }) => {
      const wallet = createWallet(1, 1, initial)
      const newWallet = wallet.withdraw(amount)

      expect(newWallet.balance).toBe(expected)
      expect(wallet.balance).toBe(initial) // Original unchanged
    })

    it.each([
      { amount: 0, expected: 'Withdrawal amount must be positive' },
      { amount: -3000, expected: 'Withdrawal amount must be positive' },
      { amount: -1, expected: 'Withdrawal amount must be positive' },
    ])('should throw an error for non-positive withdrawal amount: $amount cents', ({ amount, expected }) => {
      const wallet = createWallet(1, 1, 10000)

      expect(() => wallet.withdraw(amount)).toThrow(expected)
    })

    it.each([
      { balance: 10000, amount: 15000 }, // $100 balance, try to withdraw $150
      { balance: 5000, amount: 10000 }, // $50 balance, try to withdraw $100
      { balance: 0, amount: 1 }, // $0 balance, try to withdraw $0.01
    ])('should throw an error for insufficient funds: balance=$balance cents, withdraw=$amount cents', ({ balance, amount }) => {
      const wallet = createWallet(1, 1, balance)

      expect(() => wallet.withdraw(amount)).toThrow('Insufficient funds')
    })
  })

  describe('transfer', () => {
    it.each([
      { senderBalance: 20000, recipientBalance: 5000, amount: 10000, expectedSender: 10000, expectedRecipient: 15000 }, // $200, $50, transfer $100
      { senderBalance: 10000, recipientBalance: 0, amount: 10000, expectedSender: 0, expectedRecipient: 10000 }, // $100, $0, transfer $100
      { senderBalance: 15050, recipientBalance: 2525, amount: 5025, expectedSender: 10025, expectedRecipient: 7550 }, // $150.50, $25.25, transfer $50.25
    ])('should transfer $amount cents from sender($senderBalance) to recipient($recipientBalance)',
      ({ senderBalance, recipientBalance, amount, expectedSender, expectedRecipient }) => {
        const sender = createWallet(1, 1, senderBalance)
        const recipient = createWallet(2, 2, recipientBalance)
        const [newSender, newRecipient] = sender.transfer(amount, recipient)

        expect(newSender.balance).toBe(expectedSender)
        expect(newRecipient.balance).toBe(expectedRecipient)
        expect(sender.balance).toBe(senderBalance) // Original unchanged
        expect(recipient.balance).toBe(recipientBalance) // Original unchanged
      })

    it.each([
      { amount: 0, expected: 'Transfer amount must be positive' },
      { amount: -5000, expected: 'Transfer amount must be positive' },
      { amount: -1, expected: 'Transfer amount must be positive' },
    ])('should throw an error for non-positive transfer amount: $amount cents', ({ amount, expected }) => {
      const sender = createWallet(1, 1, 20000)
      const recipient = createWallet(2, 2, 5000)

      expect(() => sender.transfer(amount, recipient)).toThrow(expected)
    })

    it.each([
      { balance: 10000, amount: 15000 }, // $100 balance, try to transfer $150
      { balance: 5000, amount: 10000 }, // $50 balance, try to transfer $100
      { balance: 0, amount: 1 }, // $0 balance, try to transfer $0.01
    ])('should throw an error for insufficient funds on transfer: balance=$balance cents, transfer=$amount cents',
      ({ balance, amount }) => {
        const sender = createWallet(1, 1, balance)
        const recipient = createWallet(2, 2, 5000)

        expect(() => sender.transfer(amount, recipient)).toThrow('Insufficient funds for transfer')
      })
  })
})