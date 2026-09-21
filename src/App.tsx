import React, { useState, useEffect } from 'react';
import { 
  Plus, TrendingUp, TrendingDown, Wallet, Trash2, Calendar,
  Tag, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, History, Search, X,
  Users, Camera, UploadCloud, Sparkles, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, NewTransaction, Category, FamilyMember, ScannedReceiptData } from './types';
import { cn, formatCurrency } from './lib/utils';

const DEFAULT_CATEGORIES: Category[] = [
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

const EMPTY_FORM: NewTransaction = {
  description: '',
  amount: 0,
  type: 'expense',
  category: 'Alimentação',
  date: format(new Date(), 'yyyy-MM-dd'),
  person: 'Felipe',
  isRecurring: false,
  installments: 1,
};

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#71717a'];

// ─── Inline style constants (zero dependency on Tailwind) ──────────────────
const S = {
  overlay: {
    position: 'fixed' as const, inset: 0, zIndex: 9000,
    backgroundColor: 'rgba(15,23,42,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  },
  modal: {
    position: 'relative' as const, backgroundColor: '#ffffff',
    borderRadius: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    width: '100%', maxWidth: '448px', maxHeight: '90vh',
    display: 'flex', flexDirection: 'column' as const, zIndex: 9001,
  },
  modalHeader: {
    padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9',
    borderRadius: '24px 24px 0 0', backgroundColor: '#ffffff', flexShrink: 0,
  },
  modalBody: {
    flex: 1, overflowY: 'auto' as const, padding: '20px 24px',
    display: 'flex', flexDirection: 'column' as const, gap: '20px',
  },
  modalFooter: {
    padding: '16px 24px 20px', borderTop: '1px solid #f1f5f9',
    backgroundColor: '#f8fafc', borderRadius: '0 0 24px 24px', flexShrink: 0,
  },
  label: {
    display: 'block', fontSize: '11px', fontWeight: 700 as const,
    color: '#64748b', textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', marginBottom: '6px',
  },
  input: {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    border: '1px solid #e2e8f0', fontSize: '16px', fontFamily: 'inherit',
    outline: 'none', backgroundColor: '#ffffff', color: '#0f172a',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%', padding: '13px 16px', borderRadius: '12px',
    border: '2px solid #10b981', fontSize: '16px', fontFamily: 'inherit',
    outline: 'none', backgroundColor: '#ffffff', color: '#0f172a',
    boxSizing: 'border-box' as const, cursor: 'pointer',
  },
  btnPrimary: (color: string): React.CSSProperties => ({
    flex: 2, padding: '13px 16px', borderRadius: '12px',
    backgroundColor: color, color: '#ffffff', fontSize: '15px',
    fontWeight: 700, border: 'none', cursor: 'pointer',
  }),
  btnSecondary: {
    flex: 1, padding: '13px 16px', borderRadius: '12px',
    backgroundColor: '#ffffff', color: '#475569', fontSize: '15px',
    fontWeight: 600, border: '1px solid #e2e8f0', cursor: 'pointer',
  } as React.CSSProperties,
  typeBtn: (active: boolean, color: string): React.CSSProperties => ({
    flex: 1, padding: '9px', borderRadius: '10px', fontSize: '14px',
    fontWeight: 600, border: 'none', cursor: 'pointer',
    backgroundColor: active ? '#ffffff' : 'transparent',
    color: active ? color : '#94a3b8',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.15s',
  }),
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterPerson, setFilterPerson] = useState<'all' | 'Felipe' | 'Karina'>('all');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState<NewTransaction>(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [scannedReceiptPreview, setScannedReceiptPreview] = useState<string | null>(null);

  const showErrorToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories').catch(() => null);
      let serverCats: Category[] = [];

      if (res && res.ok) {
        const data = await res.json();
        serverCats = Array.isArray(data) ? data : [];
      } else {
        setIsDemoMode(true);
        const lt = localStorage.getItem('demo_transactions');
        if (lt) setTransactions(JSON.parse(lt));
        const lc = localStorage.getItem('demo_categories');
        if (lc) serverCats = JSON.parse(lc);
      }

      const merged = [...serverCats];
      DEFAULT_CATEGORIES.forEach(fb => {
        if (!merged.some(m => m.name.toLowerCase() === fb.name.toLowerCase() && m.type === fb.type))
          merged.push(fb);
      });
      setCategories(merged);

      if (res && res.ok) await fetchTransactions();
    } catch {
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) return;
      setTransactions(await res.json());
    } catch {}
  };

  const openModal = () => {
    const firstExpense = categories.find(c => c.type === 'expense')?.name || 'Outros';
    const defaultPerson: FamilyMember = filterPerson !== 'all' ? filterPerson : 'Felipe';
    setFormData({ 
      ...EMPTY_FORM, 
      category: firstExpense, 
      person: defaultPerson, 
      date: format(new Date(), 'yyyy-MM-dd') 
    });
    setIsAddingCategory(false);
    setNewCategoryName('');
    setIsScanning(false);
    setScanFeedback(null);
    setScannedReceiptPreview(null);
    setIsModalOpen(true);
  };

  // Otimizador de imagem client-side: redimensiona fotos pesadas de celulares (evita travamento e timeout)
  const optimizeImageForOCR = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          resolve({ base64: '', mimeType: file.type || 'image/jpeg' });
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 1600;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const optimized = canvas.toDataURL('image/jpeg', 0.88);
                resolve({ base64: optimized, mimeType: 'image/jpeg' });
                return;
              }
            }
          } catch (err) {
            console.warn('Canvas resize fallback:', err);
          }
          resolve({ base64: result, mimeType: file.type || 'image/jpeg' });
        };
        img.onerror = () => {
          resolve({ base64: result, mimeType: file.type || 'image/jpeg' });
        };
        img.src = result;
      };
      reader.onerror = () => {
        resolve({ base64: '', mimeType: file.type || 'image/jpeg' });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleReceiptFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    if (!file.type.startsWith('image/')) {
      setScanFeedback({
        type: 'error',
        message: 'Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).',
      });
      return;
    }

    setIsScanning(true);
    setScanFeedback(null);

    try {
      const { base64: base64Url, mimeType } = await optimizeImageForOCR(file);
      if (!base64Url) {
        throw new Error('Não foi possível ler a imagem selecionada.');
      }
      setScannedReceiptPreview(base64Url);

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Url,
          mimeType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao processar imagem do comprovante ou pedido.');
      }

      const data: ScannedReceiptData = await res.json();
      const targetType: 'income' | 'expense' = data.tipo === 'ENTRADA' ? 'income' : 'expense';

      let targetDate = format(new Date(), 'yyyy-MM-dd');
      if (data.data && /^\d{4}-\d{2}-\d{2}$/.test(data.data)) {
        targetDate = data.data;
      }

      let targetAmount = 0;
      if (typeof data.valor === 'number' && !isNaN(data.valor) && data.valor > 0) {
        targetAmount = Math.round(data.valor * 100) / 100;
      }

      let suggestedCat = (data.categoria || '').trim();
      if (!suggestedCat) {
        suggestedCat = targetType === 'income' ? 'Outros' : 'Alimentação';
      }

      const existingCat = categories.find(
        c => c.type === targetType && c.name.toLowerCase() === suggestedCat.toLowerCase()
      );

      let finalCategory = existingCat ? existingCat.name : suggestedCat;

      if (!existingCat && suggestedCat) {
        const newCatItem: Category = {
          id: Date.now(),
          name: suggestedCat,
          type: targetType,
        };
        setCategories(prev => [...prev, newCatItem]);
        if (!isDemoMode) {
          fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: suggestedCat, type: targetType }),
          }).catch(() => {});
        }
      }

      const computedDescription =
        data.descricao_formatada ||
        data.estabelecimento ||
        (data.produtos_identificados && data.produtos_identificados.length > 0
          ? data.produtos_identificados.slice(0, 2).join(', ')
          : 'Pedido / Compra');

      setFormData(prev => ({
        ...prev,
        type: targetType,
        description: computedDescription,
        amount: targetAmount,
        date: targetDate,
        category: finalCategory,
      }));

      const productsSummary =
        data.produtos_identificados && data.produtos_identificados.length > 0
          ? ` • Itens: ${data.produtos_identificados.slice(0, 3).join(', ')}${data.produtos_identificados.length > 3 ? '...' : ''}`
          : '';

      const reasonSummary = data.motivo_categoria ? ` (${data.motivo_categoria})` : '';

      setScanFeedback({
        type: 'success',
        message: `Pedido reconhecido! Valor: R$ ${targetAmount.toFixed(2).replace('.', ',')} • Categoria: ${finalCategory}${reasonSummary}${productsSummary}`,
      });
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanFeedback({
        type: 'error',
        message: err.message || 'Não foi possível analisar a imagem do pedido. Verifique a foto e tente novamente.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleTypeChange = (type: 'income' | 'expense') => {
    const first = categories.find(c => c.type === type)?.name || 'Outros';
    setFormData(prev => ({ ...prev, type, category: first }));
    setIsAddingCategory(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = { id: Date.now(), name: newCategoryName.trim(), type: formData.type };

    if (isDemoMode) {
      const updated = [...categories, newCat];
      setCategories(updated);
      localStorage.setItem('demo_categories', JSON.stringify(updated));
      setFormData(prev => ({ ...prev, category: newCat.name }));
      setIsAddingCategory(false);
      setNewCategoryName('');
      return;
    }

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCat.name, type: newCat.type }),
      });
      if (res.ok) {
        const saved = await res.json();
        setCategories(prev => [...prev, saved]);
        setFormData(prev => ({ ...prev, category: saved.name }));
        setIsAddingCategory(false);
        setNewCategoryName('');
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);

    if (isDemoMode) {
      const newT = { ...formData, id: Date.now() } as Transaction;
      const updated = [newT, ...transactions];
      setTransactions(updated);
      localStorage.setItem('demo_transactions', JSON.stringify(updated));
      return;
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) { fetchTransactions(); }
      else { showErrorToast('Erro ao salvar transação'); setIsModalOpen(true); }
    } catch { setIsModalOpen(true); }
  };

  const confirmDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setTransactionToDelete(id); setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (transactionToDelete === null) return;
    const id = transactionToDelete;
    setIsDeleteModalOpen(false); setTransactionToDelete(null);
    const orig = [...transactions];
    setTransactions(prev => prev.filter(t => t.id !== id));

    if (isDemoMode) {
      localStorage.setItem('demo_transactions', JSON.stringify(transactions.filter(t => t.id !== id)));
      return;
    }
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) { setTransactions(orig); showErrorToast('Erro ao excluir transação.'); }
    } catch { setTransactions(orig); }
  };

  const monthTransactions = transactions.filter(t => {
    const tDate = parseISO(t.date);
    const start = startOfMonth(parseISO(`${filterMonth}-01`));
    return isWithinInterval(tDate, { start, end: endOfMonth(start) });
  });

  const filteredTransactions = monthTransactions.filter(t => {
    const person = t.person || 'Felipe';
    const matchesPerson = filterPerson === 'all' || person === filterPerson;
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          person.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPerson && matchesSearch;
  });

  const totals = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  const felipeTransactions = monthTransactions.filter(t => (t.person || 'Felipe') === 'Felipe');
  const karinaTransactions = monthTransactions.filter(t => t.person === 'Karina');

  const felipeTotals = felipeTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const karinaTotals = karinaTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const chartData = Object.entries(
    filteredTransactions.filter(t => t.type === 'expense')
      .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const filteredCategories = categories.filter(c => c.type === formData.type);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Top Bar */}
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Title & Brand - ALWAYS prominently visible on both mobile and desktop */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-100 shrink-0">
                <Wallet size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-slate-900 truncate leading-snug">
                  Ricos Também Fazem Conta
                </h1>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:block">
                  Controle Financeiro do Casal
                </span>
              </div>
            </div>

            {/* Desktop Actions (md and up) */}
            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 w-48 lg:w-60 focus-within:w-72 focus-within:border-emerald-500 transition-all">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar lançamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium focus:ring-0 w-full outline-none text-slate-800 placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                    title="Limpar busca"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                <Calendar size={15} className="text-slate-500 shrink-0" />
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer outline-none"
                />
              </div>

              <button
                onClick={openModal}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer active:scale-98"
                title="Preencher dados por foto de comprovante ou nota fiscal"
              >
                <Camera size={16} className="text-blue-600 shrink-0" />
                <span>Escanear Nota</span>
              </button>

              <button
                onClick={openModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm font-semibold text-sm cursor-pointer active:scale-98"
              >
                <Plus size={18} />
                <span>Nova Transação</span>
              </button>
            </div>

            {/* Mobile Header Top Buttons (< md) */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
              <button
                onClick={openModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-xs active:scale-95 transition"
              >
                <Plus size={15} />
                <span>Nova</span>
              </button>
            </div>
          </div>

          {/* Mobile Filter & Search Sub-Bar (< md) */}
          <div className="md:hidden pb-3 pt-1 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 flex-1 min-w-0">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-xs font-medium focus:ring-0 w-full outline-none text-slate-800 placeholder:text-slate-400 min-w-0"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded-xl border border-slate-200 shrink-0">
              <Calendar size={13} className="text-slate-500 shrink-0" />
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:ring-0 cursor-pointer outline-none w-28"
              />
            </div>

            <button
              onClick={openModal}
              className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shrink-0 active:scale-95 transition"
              title="Escanear Nota com IA"
            >
              <Camera size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-28 md:pb-12">
        {/* Filtro do Casal: Ambos / Felipe / Karina */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Controle do Casal</h2>
              <p className="text-xs text-slate-400">
                {filterPerson === 'all' 
                  ? 'Exibindo finanças compartilhadas do casal' 
                  : `Filtrando apenas lançamentos de ${filterPerson}`}
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-stretch sm:self-auto">
            <button
              onClick={() => setFilterPerson('all')}
              className={cn(
                "flex-1 sm:flex-none px-3.5 py-2 rounded-lg transition-all cursor-pointer text-center",
                filterPerson === 'all' 
                  ? "bg-white text-slate-900 shadow-sm font-bold" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Ambos (Casal)
            </button>
            <button
              onClick={() => setFilterPerson('Felipe')}
              className={cn(
                "flex-1 sm:flex-none px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                filterPerson === 'Felipe' 
                  ? "bg-blue-600 text-white shadow-sm font-bold" 
                  : "text-slate-600 hover:text-blue-700"
              )}
            >
              <span>👨</span> Felipe
            </button>
            <button
              onClick={() => setFilterPerson('Karina')}
              className={cn(
                "flex-1 sm:flex-none px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                filterPerson === 'Karina' 
                  ? "bg-purple-600 text-white shadow-sm font-bold" 
                  : "text-slate-600 hover:text-purple-700"
              )}
            >
              <span>👩</span> Karina
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Entradas</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Total Recebido</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{formatCurrency(totals.income)}</h3>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown size={20} /></div>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Saídas</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Total Gasto</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{formatCurrency(totals.expense)}</h3>
          </div>

          <div className={cn("p-4 sm:p-5 rounded-2xl border shadow-sm", balance >= 0 ? "bg-emerald-600 border-emerald-500" : "bg-rose-600 border-rose-500")}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="p-2 bg-white/20 rounded-lg text-white"><Wallet size={20} /></div>
              <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">Saldo</span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 font-medium">Disponível</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5 sm:mt-1">{formatCurrency(balance)}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <PieChartIcon size={20} className="text-slate-400" />
                <h2 className="text-lg font-bold text-slate-900">Gastos por Categoria</h2>
              </div>
              <div className="h-[280px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value">
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
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

            {/* Transactions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={20} className="text-slate-400" />
                  <h2 className="text-lg font-bold text-slate-900">Histórico</h2>
                </div>
                <span className="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-100 rounded-md">{filteredTransactions.length} transações</span>
              </div>

              {/* Mobile */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredTransactions.length === 0
                  ? <div className="p-8 text-center text-slate-400 text-sm">Nenhuma transação encontrada.</div>
                  : filteredTransactions.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{format(parseISO(t.date), 'dd MMM', { locale: ptBR })}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                            (t.person || 'Felipe') === 'Karina'
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          )}>
                            <span>{(t.person || 'Felipe') === 'Karina' ? '👩' : '👨'}</span>
                            {t.person || 'Felipe'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{t.description}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1"><Tag size={10} />{t.category}</span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={cn("text-sm font-bold", t.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                          {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                        </span>
                        <button onClick={(e) => confirmDelete(t.id, e)} className="text-slate-300 hover:text-rose-500 p-2 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Responsável</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Valor</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0
                      ? <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Nenhuma transação encontrada.</td></tr>
                      : filteredTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-500">{format(parseISO(t.date), 'dd MMM', { locale: ptBR })}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{t.description}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                              (t.person || 'Felipe') === 'Karina'
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            )}>
                              <span>{(t.person || 'Felipe') === 'Karina' ? '👩' : '👨'}</span>
                              {t.person || 'Felipe'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              <Tag size={11} />{t.category}
                            </span>
                          </td>
                          <td className={cn("px-6 py-4 text-sm font-bold text-right", t.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={(e) => confirmDelete(t.id, e)} className="text-slate-300 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Divisão do Casal (Felipe & Karina) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-slate-600" />
                  <h2 className="text-base font-bold text-slate-900">Divisão do Casal</h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mês Atual</span>
              </div>

              <div className="space-y-3">
                {/* Felipe */}
                <div 
                  onClick={() => setFilterPerson(filterPerson === 'Felipe' ? 'all' : 'Felipe')}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer",
                    filterPerson === 'Felipe' 
                      ? "bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-sm" 
                      : "bg-slate-50/70 border-slate-200 hover:border-blue-200 hover:bg-blue-50/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👨</span>
                      <span className="text-sm font-bold text-slate-900">Felipe</span>
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-md",
                      (felipeTotals.income - felipeTotals.expense) >= 0 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-rose-100 text-rose-800"
                    )}>
                      Saldo: {formatCurrency(felipeTotals.income - felipeTotals.expense)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400">Entradas:</span>{' '}
                      <span className="font-semibold text-emerald-600">+{formatCurrency(felipeTotals.income)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Gastos:</span>{' '}
                      <span className="font-semibold text-rose-600">-{formatCurrency(felipeTotals.expense)}</span>
                    </div>
                  </div>
                </div>

                {/* Karina */}
                <div 
                  onClick={() => setFilterPerson(filterPerson === 'Karina' ? 'all' : 'Karina')}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer",
                    filterPerson === 'Karina' 
                      ? "bg-purple-50/90 border-purple-300 ring-2 ring-purple-500/20 shadow-sm" 
                      : "bg-slate-50/70 border-slate-200 hover:border-purple-200 hover:bg-purple-50/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👩</span>
                      <span className="text-sm font-bold text-slate-900">Karina</span>
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-md",
                      (karinaTotals.income - karinaTotals.expense) >= 0 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-rose-100 text-rose-800"
                    )}>
                      Saldo: {formatCurrency(karinaTotals.income - karinaTotals.expense)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400">Entradas:</span>{' '}
                      <span className="font-semibold text-emerald-600">+{formatCurrency(karinaTotals.income)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Gastos:</span>{' '}
                      <span className="font-semibold text-rose-600">-{formatCurrency(karinaTotals.expense)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 text-center">Clique em Felipe ou Karina para filtrar rapidamente</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Destaques do Mês</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><ArrowUpRight size={16} /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Maior Entrada</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(Math.max(...filteredTransactions.filter(t => t.type === 'income').map(t => t.amount), 0))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center"><ArrowDownRight size={16} /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Maior Gasto</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(Math.max(...filteredTransactions.filter(t => t.type === 'expense').map(t => t.amount), 0))}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-900 p-6 rounded-2xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Dica Financeira</h3>
                <p className="text-emerald-100 text-sm leading-relaxed">Tente manter seus gastos fixos em até 50% da sua renda mensal para garantir uma reserva de emergência saudável.</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingUp size={120} /></div>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL NOVA TRANSAÇÃO
          100% inline styles — zero dependência de Tailwind/CSS externo
          ═══════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div style={S.overlay} onClick={() => setIsModalOpen(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div style={S.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Nova Transação</h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>Adicione uma nova entrada ou saída</p>
            </div>

            {/* Scrollable body */}
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={S.modalBody}>

                {/* ─── RECONHECIMENTO AUTOMÁTICO DE NOTA FISCAL / RECIBO VIA IA ─── */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          Preencher com Foto de Comprovante
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          IA analisa nota, cupom fiscal ou PIX automaticamente
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação: Câmera ou Arquivo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1e293b',
                      cursor: isScanning ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      opacity: isScanning ? 0.6 : 1,
                      userSelect: 'none',
                    }}>
                      <Camera size={16} color="#059669" />
                      <span>Tirar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={isScanning}
                        onChange={handleReceiptFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1e293b',
                      cursor: isScanning ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      opacity: isScanning ? 0.6 : 1,
                      userSelect: 'none',
                    }}>
                      <UploadCloud size={16} color="#2563eb" />
                      <span>Galeria / Arquivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isScanning}
                        onChange={handleReceiptFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  {/* Indicador de Carregamento (Loading) */}
                  {isScanning && (
                    <div style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#1d4ed8',
                      fontSize: '12px',
                    }}>
                      <Loader2 size={18} className="animate-spin shrink-0 text-blue-600" />
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: '#1e40af' }}>
                          Analisando comprovante com IA...
                        </strong>
                        <span style={{ fontSize: '11px', color: '#3b82f6' }}>
                          Extraindo estabelecimento, valor total, data e sugerindo categoria.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Mensagem de Feedback (Sucesso ou Erro) */}
                  {scanFeedback && !isScanning && (
                    <div style={{
                      backgroundColor: scanFeedback.type === 'success' ? '#ecfdf5' : '#fff1f2',
                      border: `1px solid ${scanFeedback.type === 'success' ? '#a7f3d0' : '#fecdd3'}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '12px',
                      color: scanFeedback.type === 'success' ? '#065f46' : '#9f1239',
                    }}>
                      {scanFeedback.type === 'success' ? (
                        <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <AlertCircle size={16} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{scanFeedback.message}</p>
                        {scanFeedback.type === 'success' && (
                          <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#047857' }}>
                            Campos preenchidos abaixo. Você pode editá-los livremente antes de salvar.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setScanFeedback(null)}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          color: 'inherit',
                          padding: '2px',
                          opacity: 0.6,
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Miniatura do Comprovante Anexado */}
                  {scannedReceiptPreview && !isScanning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                      <img
                        src={scannedReceiptPreview}
                        alt="Comprovante"
                        style={{
                          width: '42px',
                          height: '42px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                        }}
                      />
                      <div style={{ flex: 1, fontSize: '11px', color: '#64748b' }}>
                        <span>Foto do comprovante anexada para conferência.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScannedReceiptPreview(null)}
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Remover foto
                      </button>
                    </div>
                  )}
                </div>

                {/* Tipo Despesa / Receita */}
                <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '14px' }}>
                  <button type="button" onClick={() => handleTypeChange('expense')} style={S.typeBtn(formData.type === 'expense', '#e11d48')}>
                    Despesa
                  </button>
                  <button type="button" onClick={() => handleTypeChange('income')} style={S.typeBtn(formData.type === 'income', '#059669')}>
                    Receita
                  </button>
                </div>

                {/* Quem realizou (Felipe ou Karina) */}
                <div>
                  <label style={S.label}>Quem realizou esta {formData.type === 'income' ? 'entrada' : 'saída'}?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, person: 'Felipe' }))}
                      style={{
                        padding: '11px 14px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 700,
                        border: formData.person === 'Felipe' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: formData.person === 'Felipe' ? '#eff6ff' : '#ffffff',
                        color: formData.person === 'Felipe' ? '#1d4ed8' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: formData.person === 'Felipe' ? '0 2px 6px rgba(37,99,235,0.18)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>👨</span>
                      <span>Felipe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, person: 'Karina' }))}
                      style={{
                        padding: '11px 14px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 700,
                        border: formData.person === 'Karina' ? '2px solid #db2777' : '1px solid #e2e8f0',
                        backgroundColor: formData.person === 'Karina' ? '#fdf2f8' : '#ffffff',
                        color: formData.person === 'Karina' ? '#be185d' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: formData.person === 'Karina' ? '0 2px 6px rgba(219,39,119,0.18)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>👩</span>
                      <span>Karina</span>
                    </button>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label style={S.label}>Descrição</label>
                  <input
                    required type="text" placeholder="Ex: Aluguel, Supermercado..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    style={S.input}
                  />
                </div>

                {/* Valor + Data */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={S.label}>Valor</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 500, pointerEvents: 'none', fontSize: '15px' }}>R$</span>
                      <input
                        required type="number" step="0.01" placeholder="0,00"
                        value={formData.amount || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                        style={{ ...S.input, paddingLeft: '42px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>Data</label>
                    <input
                      required type="date" value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      style={S.input}
                    />
                  </div>
                </div>

                {/* ─── CATEGORIA ────────────────────────────────────────── */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ ...S.label, marginBottom: 0 }}>Categoria</label>
                    <button
                      type="button"
                      onClick={() => { setIsAddingCategory(!isAddingCategory); setNewCategoryName(''); }}
                      style={{ fontSize: '11px', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                    >
                      {isAddingCategory ? 'Voltar para lista' : '+ Nova Categoria'}
                    </button>
                  </div>

                  {isAddingCategory ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        autoFocus type="text" placeholder="Nome da nova categoria"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                        style={{ ...S.input, flex: 1 }}
                      />
                      <button
                        type="button" onClick={handleAddCategory}
                        style={{ padding: '12px 20px', backgroundColor: '#059669', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Adicionar
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      style={S.select}
                    >
                      {filteredCategories.length === 0
                        ? <option value="">Nenhuma categoria disponível</option>
                        : filteredCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))
                      }
                      {formData.category && !filteredCategories.some(cat => cat.name === formData.category) && (
                        <option value={formData.category}>{formData.category}</option>
                      )}
                    </select>
                  )}
                </div>
                {/* ─── FIM CATEGORIA ────────────────────────────────────── */}

                {/* Recorrente toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={16} color="#94a3b8" />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                      {formData.type === 'income' ? 'Receita Recorrente?' : 'Despesa Recorrente?'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isRecurring: !prev.isRecurring }))}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      backgroundColor: formData.isRecurring ? '#059669' : '#cbd5e1',
                      position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '3px',
                      left: formData.isRecurring ? '23px' : '3px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>

                {formData.isRecurring && (
                  <div>
                    <label style={S.label}>Repetir por quantos meses?</label>
                    <input
                      type="number" min="2" max="60" value={formData.installments}
                      onChange={(e) => setFormData(prev => ({ ...prev, installments: parseInt(e.target.value) }))}
                      style={S.input}
                    />
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                      Serão criadas {formData.installments} transações mensais.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer com botões */}
              <div style={S.modalFooter}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={S.btnSecondary}>
                    Cancelar
                  </button>
                  <button type="submit" style={S.btnPrimary(formData.type === 'income' ? '#059669' : '#e11d48')}>
                    Salvar Transação
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════
          MODAL CONFIRMAR EXCLUSÃO
          ═════════════════════════════════════ */}
      {isDeleteModalOpen && (
        <div style={{ ...S.overlay, zIndex: 9100 }} onClick={() => setIsDeleteModalOpen(false)}>
          <div
            style={{ ...S.modal, maxWidth: '360px', padding: '32px 24px', alignItems: 'center', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '60px', height: '60px', backgroundColor: '#fff1f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#e11d48' }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Excluir Transação?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>Esta ação não pode ser desfeita. Tem certeza que deseja apagar este item?</p>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ ...S.btnSecondary, flex: 1, padding: '13px' }}>
                Cancelar
              </button>
              <button onClick={handleDelete} style={{ ...S.btnPrimary('#e11d48'), padding: '13px' }}>
                Sim, Apagar
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar for quick access */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <button
          onClick={openModal}
          className="flex-1 py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition shadow-xs"
        >
          <Camera size={16} className="text-blue-600 shrink-0" />
          <span>Escanear Nota (IA)</span>
        </button>
        <button
          onClick={openModal}
          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
        >
          <Plus size={16} className="shrink-0" />
          <span>Nova Transação</span>
        </button>
      </div>
    </div>
  );
}
