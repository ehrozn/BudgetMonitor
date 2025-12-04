import { Category } from "../types";

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, "id">[] = [
    { type: "income", name: "Salary", icon: "Briefcase", isUserDefined: false },
    { type: "income", name: "Bonus", icon: "Gift", isUserDefined: false },
    { type: "income", name: "Side job", icon: "Laptop", isUserDefined: false },
    { type: "income", name: "Refund", icon: "Undo", isUserDefined: false },
    { type: "income", name: "Transfer In", icon: "ArrowDownToLine", isUserDefined: false },
    { type: "income", name: "Other", icon: "Plus", isUserDefined: false },
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, "id">[] = [
    { type: "expense", name: "Rent", icon: "Home", isUserDefined: false },
    { type: "expense", name: "Food", icon: "UtensilsCrossed", isUserDefined: false },
    { type: "expense", name: "Transport", icon: "Bus", isUserDefined: false },
    { type: "expense", name: "Car", icon: "Car", isUserDefined: false },
    { type: "expense", name: "Phone", icon: "Smartphone", isUserDefined: false },
    { type: "expense", name: "Utilities", icon: "Lightbulb", isUserDefined: false },
    { type: "expense", name: "Entertainment", icon: "Gamepad2", isUserDefined: false },
    { type: "expense", name: "Health", icon: "Heart", isUserDefined: false },
    { type: "expense", name: "Debt", icon: "CreditCard", isUserDefined: false },
    { type: "expense", name: "Shopping", icon: "ShoppingBag", isUserDefined: false },
    { type: "expense", name: "Transfer Out", icon: "ArrowUpFromLine", isUserDefined: false },
    { type: "expense", name: "Other", icon: "MoreHorizontal", isUserDefined: false },
];

export const ACCOUNT_ICONS = [
    "Wallet",
    "DollarSign",
    "PiggyBank",
    "Landmark",
    "CreditCard",
    "Coins",
    "Banknote",
];

export const ACCOUNT_COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#14B8A6",
];
