export type FamilyMember = 'Felipe' | 'Karina';

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
  person?: FamilyMember | string;
  is_recurring?: boolean;
  installments?: number;
  created_at?: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'created_at'> & {
  person: FamilyMember;
  isRecurring?: boolean;
  installments?: number;
};

export interface ScannedReceiptData {
  estabelecimento: string;
  data: string;
  valor: number;
  categoria: string;
  tipo: 'SAIDA' | 'ENTRADA';
}
