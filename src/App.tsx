import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Trash2, 
  Calendar, 
  Tag, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  LayoutDashboard,
  History,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, NewTransaction, Category } from './types';
import { cn, formatCurrency } from './lib/utils';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: -1, name: 'Salário', type: 'income' },
    { id: -2, name: 'Investimentos', type: 'income' },
    { id: -3, name: 'Presente', type: 'income' },
    { id: -4, name: 'Outros', type: 'income' },
    { id: -5, name: 'Alimentação', type: 'expense' },
    { id: -6, name: 'Moradia', type: 'expense' },
    { id: -7, name: 'Transporte', type: 'expense' },
    { id: -8, name: 'Lazer', type: 'expense' },
    { id: -9, name: 'Saúde', type: 'expense' },
    { id: -10, name: 'Educação', type: 'expense' },
    { id: -11, name: 'Compras', type: 'expense' },
    { id: -12, name: 'Outros', type: 'expense' },
  ]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState<NewTransaction>({
    description: '',
    amount: 0,
    type: 'expense',
    category: 'Alimentação',
    date: format(new Date(), 'yyyy-MM-dd'),
    isRecurring: false,
    installments: 1,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (isCategoryDropdownOpen && !target.closest('.category-dropdown-container')) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if we are on a static host like Netlify
      const healthCheck = await fetch('/api/categories').catch(() => ({ ok: false }));
      if (!healthCheck.ok) {
        setIsDemoMode(true);
        const localTransactions = localStorage.getItem('demo_transactions');
        if (localTransactions) setTransactions(JSON.parse(localTransactions));
        
        const localCategories = localStorage.getItem('demo_categories');
        if (localCategories) {
          setCategories(JSON.parse(localCategories));
        }
      } else {
        await Promise.all([fetchTransactions(), fetchCategories()]);
      }
    } catch (e) {
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) return;
      const data = await res.json();
      setTransactions(data);
      return data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchCategories = async () => {
    const fallbacks: Category[] = [
      { id: -1, name: 'Salário', type: 'income' },
      { id: -2, name: 'Investimentos', type: 'income' },
      { id: -3, name: 'Presente', type: 'income' },
      { id: -4, name: 'Outros', type: 'income' },
      { id: -5, name: 'Alimentação', type: 'expense' },
      { id: -6, name: 'Moradia', type: 'expense' },
      { id: -7, name: 'Transporte', type: 'expense' },
      { id: -8, name: 'Lazer', type: 'expense' },
      { id: -9, name: 'Saúde', type: 'expense' },
      { id: -10, name: 'Educação', type: 'expense' },
      { id: -11, name: 'Compras', type: 'expense' },
      { id: -12, name: 'Outros', type: 'expense' },
    ];

    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      
      const serverCats = Array.isArray(data) ? data : [];
      const merged = [...serverCats];
      fallbacks.forEach(fb => {
        if (!merged.some(m => m.name.toLowerCase() === fb.name.toLowerCase() && m.type === fb.type)) {
          merged.push(fb);
        }
      });
      
      setCategories(merged);
      return merged;
    } catch (error) {
      setCategories(fallbacks);
      return fallbacks;
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    if (isDemoMode) {
      const newCat = { id: Date.now(), name: newCategoryName, type: formData.type };
      const updated = [...categories, newCat];
      setCategories(updated);
      localStorage.setItem('demo_categories', JSON.stringify(updated));
      setFormData({ ...formData, category: newCat.name });
      setIsAddingCategory(false);
      setNewCategoryName('');
      return;
    }

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, type: formData.type }),
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories([...categories, newCat]);
        setFormData({ ...formData, category: newCat.name });
        setIsAddingCategory(false);
        setNewCategoryName('');
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    
    if (isDemoMode) {
      const newT = { ...formData, id: Date.now() } as Transaction;
      const updated = [newT, ...transactions];
      setTransactions(updated);
      localStorage.setItem('demo_transactions', JSON.stringify(updated));
      resetForm();
      return;
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        fetchTransactions();
        resetForm();
      } else {
        alert('Erro ao salvar transação');
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      setIsModalOpen(true);
    }
  };

  const resetForm = () => {
    const firstExpense = categories.find(c => c.type === 'expense')?.name || 'Outros';
    setFormData({
      description: '',
      amount: 0,
      type: 'expense',
      category: firstExpense,
      date: format(new Date(), 'yyyy-MM-dd'),
      isRecurring: false,
      installments: 1,
    });
  };

  const confirmDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTransactionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (transactionToDelete === null) return;
    
    const id = transactionToDelete;
    setIsDeleteModalOpen(false);
    setTransactionToDelete(null);

    const originalTransactions = [...transactions];
    setTransactions(prev => prev.filter(t => t.id !== id));

    if (isDemoMode) {
      localStorage.setItem('demo_transactions', JSON.stringify(transactions.filter(t => t.id !== id)));
      return;
    }

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setTransactions(originalTransactions);
        alert('Erro ao excluir a transação no servidor.');
      }
    } catch (error) {
      setTransactions(originalTransactions);
      alert('Erro de conexão ao tentar excluir.');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const tDate = parseISO(t.date);
    const start = startOfMonth(parseISO(`${filterMonth}-01`));
    const end = endOfMonth(start);
    return isWithinInterval(tDate, { start, end });
  });

  const totals = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  const chartData = Object.entries(
    filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
              <Wallet size={18} className="sm:hidden" />
              <Wallet size={24} className="hidden sm:block" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">FinTrack</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200">
              <Calendar size={14} className="text-slate-500 sm:hidden" />
              <Calendar size={16} className="text-slate-500 hidden sm:block" />
              <input 
                type="month" 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent border-none text-[12px] sm:text-sm font-medium focus:ring-0 cursor-pointer w-[100px] sm:w-auto"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus size={20} />
              <span className="hidden md:inline">Nova Transação</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp size={20} className="sm:hidden" />
                <TrendingUp size={24} className="hidden sm:block" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Entradas</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Total Recebido</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.income)}</h3>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown size={20} className="sm:hidden" />
                <TrendingDown size={24} className="hidden sm:block" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Saídas</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Total Gasto</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.expense)}</h3>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "p-4 sm:p-6 rounded-2xl border shadow-sm transition-colors sm:col-span-2 lg:col-span-1",
              balance >= 0 ? "bg-emerald-600 border-emerald-500 text-white" : "bg-rose-600 border-rose-500 text-white"
            )}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet size={20} className="sm:hidden" />
                <Wallet size={24} className="hidden sm:block" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">Saldo Atual</span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 font-medium">Disponível</p>
            <h3 className="text-xl sm:text-2xl font-bold mt-1">{formatCurrency(balance)}</h3>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <PieChartIcon size={20} className="text-slate-400" />
                  <h2 className="text-lg font-bold text-slate-900">Gastos por Categoria</h2>
                </div>
              </div>
              <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <History size={48} strokeWidth={1} className="mb-2" />
                    <p>Nenhum gasto registrado este mês</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={20} className="text-slate-400" />
                  <h2 className="text-lg font-bold text-slate-900">Histórico</h2>
                </div>
                <span className="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-100 rounded-md">
                  {filteredTransactions.length} transações
                </span>
              </div>

              {/* Mobile List View */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500">
                        {format(parseISO(t.date), 'dd MMM', { locale: ptBR })}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{t.description}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                        <Tag size={10} />
                        {t.category}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn(
                        "text-sm font-bold",
                        t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => confirmDelete(t.id, e)}
                        className="text-slate-400 hover:text-rose-600 p-3 -mr-2 rounded-lg active:bg-rose-50 transition-all"
                        title="Excluir transação"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma transação encontrada.
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {format(parseISO(t.date), 'dd MMM', { locale: ptBR })}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {t.description}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            <Tag size={12} />
                            {t.category}
                          </span>
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-sm font-bold text-right whitespace-nowrap",
                          t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            type="button"
                            onClick={(e) => confirmDelete(t.id, e)}
                            className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all inline-flex items-center justify-center"
                            title="Excluir transação"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          Nenhuma transação encontrada para este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Panel / Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Destaques do Mês</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Maior Entrada</p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(Math.max(...filteredTransactions.filter(t => t.type === 'income').map(t => t.amount), 0))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
                      <ArrowDownRight size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Maior Gasto</p>
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(Math.max(...filteredTransactions.filter(t => t.type === 'expense').map(t => t.amount), 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-900 p-6 rounded-2xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Dica Financeira</h3>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  Tente manter seus gastos fixos em até 50% da sua renda mensal para garantir uma reserva de emergência saudável.
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <TrendingUp size={120} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Nova Transação */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-visible"
            >
              <div className="p-4 sm:p-6 border-b border-slate-100 shrink-0 bg-white rounded-t-2xl sm:rounded-t-3xl">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Nova Transação</h2>
                <p className="text-xs sm:text-sm text-slate-500">Adicione uma nova entrada ou saída</p>
              </div>
              
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        const firstExpense = categories.find(c => c.type === 'expense')?.name || 'Outros';
                        setFormData({ ...formData, type: 'expense', category: firstExpense });
                        setIsAddingCategory(false);
                      }}
                      className={cn(
                        "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                        formData.type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const firstIncome = categories.find(c => c.type === 'income')?.name || 'Outros';
                        setFormData({ ...formData, type: 'income', category: firstIncome });
                        setIsAddingCategory(false);
                      }}
                      className={cn(
                        "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                        formData.type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Receita
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Aluguel, Supermercado..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={formData.amount || ''}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data</label>
                      <input
                        required
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(!isAddingCategory);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded"
                      >
                        {isAddingCategory ? 'Voltar para lista' : '+ Nova Categoria'}
                      </button>
                    </div>
                    
                    {isAddingCategory ? (
                      <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Nome da nova categoria"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-base bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <div className="relative category-dropdown-container">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                          }}
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-left flex items-center justify-between text-slate-900 text-base min-h-[54px] shadow-sm hover:border-emerald-300 transition-colors relative z-20"
                        >
                          <span className={formData.category ? "text-slate-900" : "text-slate-400"}>
                            {formData.category || 'Selecione uma categoria'}
                          </span>
                          <ChevronDown size={20} className={cn("text-slate-400 transition-transform", isCategoryDropdownOpen && "rotate-180")} />
                        </button>
                        
                        <AnimatePresence>
                          {isCategoryDropdownOpen && (
                            <>
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className={cn(
                                  "fixed inset-x-0 bottom-0 z-[100] bg-white rounded-t-3xl shadow-2xl p-4 sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:right-0 sm:bottom-auto sm:mt-2 sm:rounded-xl sm:p-0 sm:max-h-60 sm:overflow-y-auto",
                                  "max-h-[70vh] overflow-y-auto"
                                )}
                              >
                                <div className="flex items-center justify-between mb-4 sm:hidden">
                                  <h4 className="font-bold text-slate-900">Selecionar Categoria</h4>
                                  <button 
                                    type="button"
                                    onClick={() => setIsCategoryDropdownOpen(false)}
                                    className="p-2 bg-slate-100 rounded-full"
                                  >
                                    <ChevronDown size={20} />
                                  </button>
                                </div>
                                <div className="space-y-1 sm:space-y-0">
                                  {categories
                                    .filter(c => c.type === formData.type)
                                    .map(cat => (
                                      <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                          setFormData({ ...formData, category: cat.name });
                                          setIsCategoryDropdownOpen(false);
                                        }}
                                        className={cn(
                                          "w-full px-4 py-4 sm:py-3 text-left text-base sm:text-sm transition-colors flex items-center justify-between border-b border-slate-50 last:border-0 sm:border-0",
                                          formData.category === cat.name ? "bg-emerald-50 text-emerald-700 font-semibold" : "hover:bg-slate-50 text-slate-700"
                                        )}
                                      >
                                        {cat.name}
                                        {formData.category === cat.name && <Check size={18} className="text-emerald-600" />}
                                      </button>
                                    ))}
                                </div>
                              </motion.div>
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsCategoryDropdownOpen(false)}
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] sm:hidden"
                              />
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-2xl sm:rounded-b-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History size={18} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">
                        {formData.type === 'income' ? 'Receita Recorrente?' : 'Despesa Recorrente?'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        formData.isRecurring ? "bg-emerald-600" : "bg-slate-300"
                      )}
                    >
                      <motion.div 
                        animate={{ x: formData.isRecurring ? 26 : 2 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  {formData.isRecurring && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repetir por quantos meses?</label>
                      <input
                        type="number"
                        min="2"
                        max="60"
                        value={formData.installments}
                        onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-[10px] text-slate-400 italic">
                        Serão criadas {formData.installments} transações mensais a partir da data selecionada.
                      </p>
                    </motion.div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={cn(
                        "flex-[2] px-4 py-3 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95",
                        formData.type === 'income' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                      )}
                    >
                      Salvar Transação
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Confirmação de Exclusão */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Transação?</h3>
              <p className="text-slate-500 mb-6">Esta ação não pode ser desfeita. Tem certeza que deseja apagar este item?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
                >
                  Sim, Apagar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
