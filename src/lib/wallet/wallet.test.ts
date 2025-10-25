import { expect, describe, it } from 'vitest'
import { Wallet } from './wallet'

const createWallet = (ownerId = 1, balance = 100) => new Wallet(ownerId, balance)

describe('Wallet', () => {
  describe('constructor', () => {
    it('should create a wallet with valid parameters', () => {
      const wallet = createWallet(1, 100)

      expect(wallet.ownerId).toBe(1)
      expect(wallet.balance).toBe(100)
    })

    it('should be frozen (immutable)', () => {
      const wallet = createWallet(1, 100)

      expect(Object.isFrozen(wallet)).toBe(true)
    })

    it('should throw an error for negative balance', () => {
      expect(() => createWallet(1, -50)).toThrow('Balance cannot be negative')
    })

    it('should throw an error for non-positive owner ID', () => {
      const error = 'Owner ID must be positive'

      expect(() => createWallet(0, 100)).toThrow(error)
      expect(() => createWallet(-1, 100)).toThrow(error)
    })
  })

  describe('deposit', () => {
    it('should deposit money correctly', () => {
      const wallet = createWallet(1, 100)
      const newWallet = wallet.deposit(50)

      expect(newWallet.balance).toBe(150)
      expect(wallet.balance).toBe(100)
    })

    it('should return new wallet instances', () => {
      const wallet = createWallet(1, 100)
      const newWallet = wallet.deposit(50)

      expect(newWallet).not.toBe(wallet)
    })

    it('should throw an error for non-positive deposit amount', () => {
      const wallet = createWallet(1, 100)

      expect(() => wallet.deposit(0)).toThrow('Deposit amount must be positive')
      expect(() => wallet.deposit(-20)).toThrow('Deposit amount must be positive')
    })
  })

  describe('withdraw', () => {
    it('should withdraw money correctly', () => {
      const wallet = createWallet(1, 100)
      const newWallet = wallet.withdraw(40)

      expect(newWallet.balance).toBe(60)
      expect(wallet.balance).toBe(100)
    })

    it('should throw an error for non-positive withdrawal amount', () => {
      const wallet = createWallet(1, 100)

      expect(() => wallet.withdraw(0)).toThrow('Withdrawal amount must be positive')
      expect(() => wallet.withdraw(-30)).toThrow('Withdrawal amount must be positive')
    })

    it('should throw an error for insufficient funds on withdrawal', () => {
      const wallet = createWallet(1, 100)

      expect(() => wallet.withdraw(150)).toThrow('Insufficient funds')
    })
  })

  describe('transfer', () => {
    it('should transfer money correctly', () => {
      const sender = createWallet(1, 200)
      const recipient = createWallet(2, 50)
      const [newSender, newRecipient] = sender.transfer(100, recipient)

      expect(newSender.balance).toBe(100)
      expect(newRecipient.balance).toBe(150)
      expect(sender.balance).toBe(200)
      expect(recipient.balance).toBe(50)
    })

    it('should throw an error for non-positive transfer amount', () => {
      const sender = createWallet(1, 200)
      const recipient = createWallet(2, 50)

      expect(() => sender.transfer(0, recipient)).toThrow('Transfer amount must be positive')
      expect(() => sender.transfer(-50, recipient)).toThrow('Transfer amount must be positive')
    })

    it('should throw an error for insufficient funds on transfer', () => {
      const sender = createWallet(1, 100)
      const recipient = createWallet(2, 50)

      expect(() => sender.transfer(150, recipient)).toThrow('Insufficient funds for transfer')
    })
  })
})