class MoneyService {
  constructor(configs, permissions, validations) {
    this.configs = configs;
    this.permissions = permissions;
    this.validations = validations;

    this.balance = 0;
  }

  // ✅ Add Funds
  addFunds(userRole, amount) {
    if (
      this.permissions.canInitiateTransaction(userRole) &&
      this.validations.validateTransaction(amount)
    ) {
      this.balance += amount;
      console.log(`💰 Added $${amount}. New balance: $${this.balance}`);
    } else {
      console.warn("❌ Permission denied or invalid transaction.");
    }
  }

  // ✅ Withdraw Funds
  withdrawFunds(userRole, amount) {
    if (
      this.permissions.canInitiateTransaction(userRole) &&
      this.validations.validateTransaction(amount) &&
      (this.balance - amount >= 0 || this.configs.allowNegativeBalance)
    ) {
      this.balance -= amount;
      console.log(`💸 Withdrew $${amount}. New balance: $${this.balance}`);
    } else {
      console.warn("❌ Insufficient funds or permission denied.");
    }
  }

  // ✅ Check Balance
  getBalance(userRole) {
    if (this.permissions.canViewBalance(userRole)) {
      return this.balance;
    } else {
      console.warn("❌ Permission denied to view balance.");
      return null;
    }
  }
}

module.exports = MoneyService;
