/** Month as "YYYY-MM". */
export type Month = string;
export type Id = string;

export interface Person {
  id: Id;
  name: string;
}

export type AccountKind = "løn" | "budget" | "opsparing" | "anden";

export interface Account {
  id: Id;
  name: string;
  /** null = shared (fælles) account. */
  ownerId: Id | null;
  kind: AccountKind;
}

export type ItemKind = "indtægt" | "udgift" | "opsparing";

/** Months between payments: 1 = monthly, 3 = quarterly, 6 = half-yearly, 12 = yearly. */
export type Interval = 1 | 3 | 6 | 12;

export interface AmountChange {
  /** "YYYY-MM-DD" the old amount was replaced. */
  date: string;
  from: number;
  to: number;
}

export interface BudgetItem {
  id: Id;
  name: string;
  kind: ItemKind;
  /** Amount per payment, positive DKK. */
  amount: number;
  interval: Interval;
  /** null = shared between everyone in the household. */
  ownerId: Id | null;
  /** Account the money is paid from (expense/savings) or into (income). */
  accountId: Id;
  category: string;
  /** Left out of the bank's disposable-income calculation (food, gifts …). */
  bankExcluded?: boolean;
  /** Agreement number / text used to recognise the item in a bank statement. */
  agreementNo?: string;
  loanId?: Id;
  history: AmountChange[];
}

export interface Loan {
  id: Id;
  name: string;
  /** Remaining debt (restgæld) today. */
  balance: number;
  /** Nominal yearly interest rate in percent. */
  ratePct: number;
  /** Original principal, for "how far along" progress. */
  principal: number;
  /** The budget item that holds the monthly payment (ydelse). */
  itemId: Id;
}

export interface GoalExtra {
  id: Id;
  month: Month;
  amount: number;
  note: string;
}

export interface SavingsGoal {
  id: Id;
  name: string;
  color: string;
  /** "target": a fixed amount by a date. "monthly": a fixed monthly deposit. */
  mode: "target" | "monthly";
  target: number;
  deadline: Month;
  monthly: number;
  saved: number;
  extras: GoalExtra[];
  ownerId: Id | null;
  accountId: Id;
}

export type SplitMode = "income" | "equal" | "fixed";

export interface Split {
  mode: SplitMode;
  /** Only for mode "fixed": percent per person id. */
  fixedPct: Record<Id, number>;
}

export type ScenarioChange =
  | { kind: "setAmount"; itemId: Id; amount: number }
  | { kind: "removeItem"; itemId: Id }
  | { kind: "addItem"; item: BudgetItem }
  | { kind: "removeGoal"; goalId: Id };

export interface Scenario {
  id: Id;
  name: string;
  changes: ScenarioChange[];
}

export interface Budget {
  id: Id;
  name: string;
  persons: Person[];
  children: number;
  accounts: Account[];
  items: BudgetItem[];
  loans: Loan[];
  goals: SavingsGoal[];
  split: Split;
  /** Standing transfers as they are set up in the net bank, keyed "fromId>toId". */
  registeredTransfers: Record<string, number>;
  scenarios: Scenario[];
  /** Rule-of-thumb requirement used for "Vejledende krav". */
  bankRule: { perAdult: number; perChild: number };
  createdAt: string;
  updatedAt: string;
}
