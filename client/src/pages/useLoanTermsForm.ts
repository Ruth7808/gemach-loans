import { useEffect, useState } from 'react';
import { today } from '../dateUtils';
import { generateSchedule } from './loanScheduleUtils';

export interface LoanTermsFieldErrors {
  amount?: string;
  numInstallments?: string;
  givenDate?: string;
  firstDueDate?: string;
}

export interface LoanTermsForm {
  amount: string;
  setAmount: (v: string) => void;
  givenDate: string;
  setGivenDate: (v: string) => void;
  numInstallments: string;
  setNumInstallments: (v: string) => void;
  firstDueDate: string;
  setFirstDueDate: (v: string) => void;
  dueDates: string[];
  updateDueDate: (index: number, value: string) => void;
  errors: LoanTermsFieldErrors;
  installmentPreview: number | null;
  amountNum: number;
  numInstallmentsNum: number;
  validate: () => LoanTermsFieldErrors;
}

/**
 * מצב + ולידציה של תנאי הלוואה (סכום, תאריך מתן, מספר תשלומים, לוח תשלומים לעריכה) —
 * נקודה יחידה, כדי שטופס הוספת הלוואה הרגיל ומסך המרת בקשת הלוואה ישתמשו באותה לוגיקה בדיוק.
 */
export function useLoanTermsForm(): LoanTermsForm {
  const [amount, setAmount] = useState('');
  const [givenDate, setGivenDate] = useState(today());
  const [numInstallments, setNumInstallments] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [dueDates, setDueDates] = useState<string[]>([]);
  const [errors, setErrors] = useState<LoanTermsFieldErrors>({});

  useEffect(() => {
    setDueDates(generateSchedule(firstDueDate, Number(numInstallments)));
  }, [firstDueDate, numInstallments]);

  const amountNum = Number(amount);
  const numInstallmentsNum = Number(numInstallments);
  const installmentPreview =
    amountNum > 0 && numInstallmentsNum >= 1 ? Math.ceil((amountNum / numInstallmentsNum) * 100) / 100 : null;

  function updateDueDate(index: number, value: string) {
    setDueDates((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function validate(): LoanTermsFieldErrors {
    const next: LoanTermsFieldErrors = {};
    if (!(amountNum > 0)) next.amount = 'אנא הזן/י סכום גדול מאפס';
    if (!Number.isInteger(numInstallmentsNum) || numInstallmentsNum < 1) next.numInstallments = 'אנא הזן/י מספר תשלומים תקין';
    if (!givenDate) next.givenDate = 'אנא בחר/י תאריך מתן ההלוואה';
    if (!firstDueDate) next.firstDueDate = 'אנא בחר/י תאריך תשלום ראשון';
    setErrors(next);
    return next;
  }

  return {
    amount,
    setAmount,
    givenDate,
    setGivenDate,
    numInstallments,
    setNumInstallments,
    firstDueDate,
    setFirstDueDate,
    dueDates,
    updateDueDate,
    errors,
    installmentPreview,
    amountNum,
    numInstallmentsNum,
    validate,
  };
}
