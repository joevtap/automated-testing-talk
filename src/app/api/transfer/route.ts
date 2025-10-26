import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '../../../lib/wallet/wallet.service';

const walletService = new WalletService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderWalletId, recipientWalletId, amount } = body;

    if (!senderWalletId || !recipientWalletId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: senderWalletId, recipientWalletId, and amount are required' },
        { status: 400 }
      );
    }

    const parsedSenderId = parseInt(senderWalletId);
    const parsedRecipientId = parseInt(recipientWalletId);
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedSenderId) || isNaN(parsedRecipientId) || isNaN(parsedAmount)) {
      return NextResponse.json(
        { error: 'Invalid input: wallet IDs and amount must be valid numbers' },
        { status: 400 }
      );
    }

    if (parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Transfer amount must be positive' },
        { status: 400 }
      );
    }

    const [senderWallet, recipientWallet] = await walletService.transferFunds(
      parsedSenderId,
      parsedRecipientId,
      parsedAmount
    );

    return NextResponse.json({
      success: true,
      sender: {
        id: senderWallet.id,
        balance: senderWallet.balance
      },
      recipient: {
        id: recipientWallet.id,
        balance: recipientWallet.balance
      }
    });
  } catch (error) {
    console.error('Transfer error:', error);

    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage.includes('not found')) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 404 }
        );
      }

      if (errorMessage.includes('Insufficient funds')) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
