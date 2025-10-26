import TransferForm from "@/src/components/transfer-form"

describe('<TransferForm />', () => {
  beforeEach(() => {
    cy.mount(<TransferForm />)
  })

  it('should start empty', () => {
    cy.get('#senderWalletId').should('be.empty')
    cy.get('#recipientWalletId').should('be.empty')
    cy.get('#amount').should('be.empty')
  })

  it('should allow inputs', () => {
    cy.get('#senderWalletId').type("1")
    cy.get('#recipientWalletId').type("2")
    cy.get('#amount').type("2000")
  })

  it('should react to the button click', () => {
    cy.get('#senderWalletId').type("1")
    cy.get('#recipientWalletId').type("2")
    cy.get('#amount').type("2000")

    cy.intercept('POST', '/api/transfer').as('transferRequest')
    cy.contains("Transfer Funds").click()
    cy.wait('@transferRequest')
  })
})