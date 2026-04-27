export const mockTransactions = [
  {
    id: "1",
    amount: 120.50,
    category: "Groceries",
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    description: "Weekly grocery shopping at Whole Foods",
    type: "expense"
  },
  {
    id: "2",
    amount: 50.00,
    category: "Transport",
    date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    description: "Uber ride",
    type: "expense"
  },
  {
    id: "3",
    amount: 3000.00,
    category: "Salary",
    date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    description: "Monthly Salary",
    type: "income"
  },
  {
    id: "4",
    amount: 85.00,
    category: "Entertainment",
    date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    description: "Movie tickets and snacks",
    type: "expense"
  },
  {
    id: "5",
    amount: 15.99,
    category: "Subscriptions",
    date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    description: "Netflix Subscription",
    type: "expense"
  }
];

export const MOCK_CATEGORIES = [
  "Groceries",
  "Transport",
  "Entertainment",
  "Dining Out",
  "Utilities",
  "Rent",
  "Subscriptions",
  "Salary",
  "Other"
];
