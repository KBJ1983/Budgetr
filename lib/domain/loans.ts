import { addMonths } from "./format";
import type { Budget, Loan, Month } from "./types";

export interface LoanStatus {
  loan: Loan;
  payment: number;
  /** Months until paid out; Infinity when the payment does not cover the interest. */
  monthsLeft: number;
  endMonth: Month | null;
  interestThisMonth: number;
  /** 0..1 share of the principal paid back. */
  progress: number;
  totalInterestLeft: number;
}

/** Months to pay `balance` with a fixed monthly `payment` at yearly `ratePct`. */
export function monthsToPayOff(balance: number, ratePct: number, payment: number): number {
  if (balance <= 0) return 0;
  if (payment <= 0) return Infinity;
  const r = ratePct / 100 / 12;
  if (r === 0) return Math.ceil(balance / payment);
  if (payment <= balance * r) return Infinity;
  return Math.ceil(-Math.log(1 - (r * balance) / payment) / Math.log(1 + r));
}

export function loanStatus(budget: Budget, loan: Loan, now: Month): LoanStatus {
  const item = budget.items.find((i) => i.id === loan.itemId);
  const payment = item ? item.amount / item.interval : 0;
  const monthsLeft = monthsToPayOff(loan.balance, loan.ratePct, payment);
  const r = loan.ratePct / 100 / 12;
  const totalInterestLeft = Number.isFinite(monthsLeft) ? Math.max(0, payment * monthsLeft - loan.balance) : Infinity;
  return {
    loan,
    payment,
    monthsLeft,
    endMonth: Number.isFinite(monthsLeft) ? addMonths(now, monthsLeft) : null,
    interestThisMonth: loan.balance * r,
    progress: loan.principal > 0 ? Math.min(1, Math.max(0, 1 - loan.balance / loan.principal)) : 0,
    totalInterestLeft,
  };
}

/** All loans sorted by payoff date (never-ending loans last). */
export function loanTimeline(budget: Budget, now: Month): LoanStatus[] {
  return budget.loans
    .map((l) => loanStatus(budget, l, now))
    .sort((a, b) => a.monthsLeft - b.monthsLeft);
}

export interface LoanSummary {
  freedWithin12: number;
  freedWithin12Names: string[];
  next: LoanStatus | null;
  freedTotal: number;
  interestPerMonth: number;
  /** Cumulative freed payment per month, one step per payoff. */
  steps: { month: Month; freed: number; index: number; name: string }[];
}

export function loanSummary(budget: Budget, now: Month): LoanSummary {
  const tl = loanTimeline(budget, now).filter((s) => s.endMonth !== null && s.monthsLeft > 0);
  let cum = 0;
  const steps = tl.map((s, i) => {
    cum += s.payment;
    return { month: s.endMonth as Month, freed: cum, index: i + 1, name: s.loan.name };
  });
  const within = tl.filter((s) => s.monthsLeft <= 12);
  return {
    freedWithin12: within.reduce((a, s) => a + s.payment, 0),
    freedWithin12Names: within.map((s) => s.loan.name),
    next: tl[0] ?? null,
    freedTotal: cum,
    interestPerMonth: budget.loans.reduce((a, l) => a + (l.balance * l.ratePct) / 100 / 12, 0),
    steps,
  };
}
