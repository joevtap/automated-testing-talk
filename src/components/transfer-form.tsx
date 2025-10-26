'use client';

import { useState, FormEvent } from 'react';

interface TransferResult {
  success: boolean;
  sender?: {
    id: number;
    balance: number;
  };
  recipient?: {
    id: number;
    balance: number;
  };
  error?: string;
}

export default function TransferForm() {
  const [senderWalletId, setSenderWalletId] = useState('');
  const [recipientWalletId, setRecipientWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);

  // Helper function to format cents to Brazilian Real
  const formatCurrency = (cents: number): string => {
    const reais = cents / 100;
    return reais.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderWalletId,
          recipientWalletId,
          amount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setSenderWalletId('');
        setRecipientWalletId('');
        setAmount('');
      } else {
        setResult({ success: false, error: data.error || 'Transfer failed' });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error: Unable to complete transfer',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Wallet Transfer
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="senderWalletId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Sender Wallet ID
              </label>
              <input
                type="number"
                id="senderWalletId"
                value={senderWalletId}
                onChange={(e) => setSenderWalletId(e.target.value)}
                required
                min="1"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter sender wallet ID"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="recipientWalletId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Recipient Wallet ID
              </label>
              <input
                type="number"
                id="recipientWalletId"
                value={recipientWalletId}
                onChange={(e) => setRecipientWalletId(e.target.value)}
                required
                min="1"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter recipient wallet ID"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Amount (in cents)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter amount in cents (e.g., 1000 = R$ 10,00)"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Transfer Funds'}
            </button>
          </form>

          {result && (
            <div className="mt-6">
              {result.success ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2">
                    ✓ Transfer Successful
                  </h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>
                      <strong>Sender (ID {result.sender?.id}):</strong> New balance:{' '}
                      {formatCurrency(result.sender?.balance ?? 0)}
                    </p>
                    <p>
                      <strong>Recipient (ID {result.recipient?.id}):</strong> New balance:{' '}
                      {formatCurrency(result.recipient?.balance ?? 0)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">
                    ✗ Transfer Failed
                  </h3>
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            ℹ️ Information
          </h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Wallet IDs must be positive integers</li>
            <li>Amount must be entered in cents (e.g., 100 cents = R$ 1,00)</li>
            <li>Sender must have sufficient funds</li>
            <li>Both wallets must exist in the database</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
