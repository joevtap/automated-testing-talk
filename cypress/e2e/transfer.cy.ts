describe('Transfer funds', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Page Load', () => {
    it('should load the transfer form with all required fields', () => {
      cy.get('h1').contains('Wallet Transfer').should('exist');
      cy.get('#senderWalletId').should('exist');
      cy.get('#recipientWalletId').should('exist');
      cy.get('#amount').should('exist');
      cy.get('button').contains('Transfer Funds').should('exist');
    });

    it('should display information section', () => {
      cy.contains('Information').should('exist');
      cy.contains('Wallet IDs must be positive integers').should('exist');
      cy.contains('Amount must be entered in cents').should('exist');
    });
  });

  describe('Successful Transfers', () => {
    it('should transfer 1 cent from wallet 1 to wallet 2', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#recipientWalletId').type('2');
      cy.get('#amount').type('1');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Successful').should('be.visible');
      cy.contains('Sender (ID 1)').should('be.visible');
      cy.contains('Recipient (ID 2)').should('be.visible');
      // Check for Brazilian Real formatting
      cy.contains('R$').should('exist');
    });

    it('should transfer 1 cent from wallet 2 to wallet 1', () => {
      cy.get('#senderWalletId').type('2');
      cy.get('#recipientWalletId').type('1');
      cy.get('#amount').type('1');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Successful').should('be.visible');
      cy.contains('Sender (ID 2)').should('be.visible');
      cy.contains('Recipient (ID 1)').should('be.visible');
    });

    it('should clear form fields after successful transfer', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#recipientWalletId').type('2');
      cy.get('#amount').type('100');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Successful').should('be.visible');

      cy.get('#senderWalletId').should('have.value', '');
      cy.get('#recipientWalletId').should('have.value', '');
      cy.get('#amount').should('have.value', '');
    });
  });

  describe('Validation Errors', () => {
    it('should not allow negative amounts', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#recipientWalletId').type('2');
      cy.get('#amount').type('-100');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Successful').should('not.exist');
    });

    it('should not allow zero amount', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#recipientWalletId').type('2');
      cy.get('#amount').type('0');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Successful').should('not.exist');
    });

    it('should require all fields to be filled', () => {
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Successful').should('not.exist');
      cy.contains('Transfer Failed').should('not.exist');
    });

    it('should validate sender wallet ID is required', () => {
      cy.get('#recipientWalletId').type('2');
      cy.get('#amount').type('100');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Successful').should('not.exist');
    });

    it('should validate recipient wallet ID is required', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#amount').type('100');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Successful').should('not.exist');
    });
  });

  describe('Business Logic Errors', () => {
    it('should show error when sender wallet does not exist', () => {
      cy.get('#senderWalletId').type('999999');
      cy.get('#recipientWalletId').type('1');
      cy.get('#amount').type('100');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Failed').should('be.visible');
      cy.contains('Sender wallet not found').should('be.visible');
    });

    it('should show error when recipient wallet does not exist', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#recipientWalletId').type('999999');
      cy.get('#amount').type('100');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Failed').should('be.visible');
      cy.contains('Recipient wallet not found').should('be.visible');
    });

    it('should show error when sender has insufficient funds', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#recipientWalletId').type('2');
      cy.get('#amount').type('9999999999');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Transfer Failed').should('be.visible');
      cy.contains('Insufficient funds').should('be.visible');
    });
  });

  describe('UI State Management', () => {
    it('should show loading state during transfer', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#recipientWalletId').type('2');
      cy.get('#amount').type('100');

      cy.intercept('POST', '/api/transfer', (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send();
        });
      });

      cy.get('button').contains('Transfer Funds').click();
      cy.get('button').contains('Processing...').should('exist');
    });

    it('should disable form fields while processing', () => {
      cy.get('#senderWalletId').type('1');
      cy.get('#recipientWalletId').type('2');
      cy.get('#amount').type('100');

      cy.intercept('POST', '/api/transfer', (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send();
        });
      });

      cy.get('button').contains('Transfer Funds').click();

      cy.get('#senderWalletId').should('be.disabled');
      cy.get('#recipientWalletId').should('be.disabled');
      cy.get('#amount').should('be.disabled');
    });

    it('should hide previous error message on new submission', () => {
      cy.get('#senderWalletId').type('999999');
      cy.get('#recipientWalletId').type('1');
      cy.get('#amount').type('100');
      cy.get('button').contains('Transfer Funds').click();
      cy.contains('Transfer Failed').should('be.visible');

      cy.get('#senderWalletId').clear().type('1');
      cy.get('#recipientWalletId').clear().type('2');
      cy.get('#amount').clear().type('50');
      cy.get('button').contains('Transfer Funds').click();

      cy.contains('Sender wallet not found').should('not.exist');
      cy.contains('Transfer Successful').should('be.visible');
    });
  });

  describe('Input Validation', () => {
    it('should only accept integer values for wallet IDs', () => {
      cy.get('#senderWalletId').should('have.attr', 'type', 'number');
      cy.get('#senderWalletId').should('have.attr', 'step', '1');
      cy.get('#recipientWalletId').should('have.attr', 'type', 'number');
      cy.get('#recipientWalletId').should('have.attr', 'step', '1');
    });

    it('should only accept integer values for amount (cents)', () => {
      cy.get('#amount').should('have.attr', 'type', 'number');
      cy.get('#amount').should('have.attr', 'step', '1');
      cy.get('#amount').should('have.attr', 'min', '1');
    });

    it('should have proper placeholder text', () => {
      cy.get('#senderWalletId').should('have.attr', 'placeholder', 'Enter sender wallet ID');
      cy.get('#recipientWalletId').should('have.attr', 'placeholder', 'Enter recipient wallet ID');
      cy.get('#amount').should('have.attr', 'placeholder').and('include', 'cents');
    });
  });
});