export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
}

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  is_recurring?: boolean;
  installments?: number;
  created_at?: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'created_at'> & {
  isRecurring?: boolean;
  installments?: number;
};
