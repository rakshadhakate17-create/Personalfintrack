import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import './Dashboard.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
const API_URL = `${API_BASE_URL}/api/transactions`;
const BUDGET_API_URL = `${API_BASE_URL}/api/budgets`;

const CATEGORIES = [
  'Food',
  'Salary',
  'Transport',
  'Shopping',
  'Bills',
  'Healthcare',
  'Entertainment',
  'Education',
  'Investment',
  'Other',
];

const BUDGET_CATEGORIES = CATEGORIES.filter((item) => item !== 'Salary');

const CHART_COLORS = [
  '#16a34a',
  '#15803d',
  '#86efac',
  '#f59e0b',
  '#0ea5e9',
  '#dc2626',
  '#8b5cf6',
  '#64748b',
  '#f97316',
  '#14b8a6',
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getTodayLocalDate = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
};

const getCurrentMonth = () => getTodayLocalDate().slice(0, 7);

const formatDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMonth = (monthValue) => {
  if (!monthValue) return 'Selected month';
  const date = new Date(`${monthValue}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return monthValue;

  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

const getErrorMessage = async (response) => {
  const text = await response.text();

  if (!text) return `Request failed (${response.status}).`;

  try {
    const body = JSON.parse(text);

    if (body.fieldErrors) {
      return Object.values(body.fieldErrors).join(' ');
    }

    return body.message || body.error || text;
  } catch {
    return text;
  }
};

function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard');

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(getCurrentMonth);
  const [budgetCategory, setBudgetCategory] = useState('Food');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [deletingBudgetId, setDeletingBudgetId] = useState(null);

  const [type, setType] = useState('EXPENSE');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(getTodayLocalDate);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load authenticated user's transactions.
  const loadTransactions = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setTransactions([]);
      setError('Please sign in to view your transactions.');
      setLoading(false);
      return false;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session may have expired. Please sign in again.');
        }
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();
      setTransactions(Array.isArray(data) ? data : []);
      setError('');
      return true;
    } catch (err) {
      setError(err.message || 'Failed to load transactions.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load authenticated user's budgets.
  const loadBudgets = useCallback(async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setBudgets([]);
      setError('Please sign in to view your budgets.');
      return false;
    }

    setBudgetLoading(true);

    try {
      const response = await fetch(BUDGET_API_URL, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session may have expired. Please sign in again.');
        }
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();
      setBudgets(Array.isArray(data) ? data : []);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to load budgets.');
      return false;
    } finally {
      setBudgetLoading(false);
    }
  }, []);

  // Initial transaction loading.
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Load budgets when the user opens the Budgets page.
  useEffect(() => {
    if (activePage === 'budgets') {
      loadBudgets();
    }
  }, [activePage, loadBudgets]);

  // Dismiss notifications automatically.
  useEffect(() => {
    if (!error && !success) return undefined;

    const timer = setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);

    return () => clearTimeout(timer);
  }, [error, success]);

  // Financial summary.
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const income = transactions.reduce(
      (total, item) =>
        item.type === 'INCOME' ? total + (Number(item.amount) || 0) : total,
      0
    );

    const expense = transactions.reduce(
      (total, item) =>
        item.type === 'EXPENSE' ? total + (Number(item.amount) || 0) : total,
      0
    );

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    };
  }, [transactions]);

  const categoryOptions = useMemo(
    () =>
      [...new Set([
        ...CATEGORIES,
        ...transactions.map((item) => item.category).filter(Boolean),
      ])].sort((a, b) => a.localeCompare(b)),
    [transactions]
  );

  // Apply transaction filters and search.
  const filteredTransactions = useMemo(
    () =>
      transactions.filter((item) => {
        const dateValue = String(item.transactionDate || item.createdAt || '').slice(0, 10);
        const description = String(item.description || item.title || '').toLowerCase();
        const normalizedSearch = searchTerm.toLowerCase();

        const matchesSearch =
          !searchTerm ||
          description.includes(normalizedSearch) ||
          String(item.category || '').toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) return false;
        if (filterType !== 'ALL' && item.type !== filterType) return false;
        if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
        if (startDate && (!dateValue || dateValue < startDate)) return false;
        if (endDate && (!dateValue || dateValue > endDate)) return false;

        return true;
      }),
    [transactions, filterType, filterCategory, startDate, endDate, searchTerm]
  );

  // Expense chart.
  const expenseByCategory = useMemo(() => {
    const totals = {};

    filteredTransactions.forEach((item) => {
      if (item.type !== 'EXPENSE') return;
      const expenseCategory = item.category || 'Uncategorized';
      totals[expenseCategory] = (totals[expenseCategory] || 0) + (Number(item.amount) || 0);
    });

    return Object.entries(totals)
      .map(([categoryName, total]) => ({ category: categoryName, amount: total }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  // Monthly income and expense chart.
  const monthlyTotals = useMemo(() => {
    const months = {};

    filteredTransactions.forEach((item) => {
      const dateValue = String(item.transactionDate || item.createdAt || '');
      const monthKey = dateValue.slice(0, 7);

      if (!/^\d{4}-\d{2}$/.test(monthKey)) return;

      if (!months[monthKey]) {
        months[monthKey] = {
          monthKey,
          month: new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
          }),
          income: 0,
          expense: 0,
        };
      }

      if (item.type === 'INCOME') {
        months[monthKey].income += Number(item.amount) || 0;
      } else if (item.type === 'EXPENSE') {
        months[monthKey].expense += Number(item.amount) || 0;
      }
    });

    return Object.values(months).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredTransactions]);

  // Budgets for the currently selected month.
  const selectedMonthBudgets = useMemo(() => {
    const [year, month] = selectedBudgetMonth.split('-').map(Number);

    return budgets.filter(
      (budget) => Number(budget.year) === year && Number(budget.month) === month
    );
  }, [budgets, selectedBudgetMonth]);

  const overallBudget = useMemo(
    () => selectedMonthBudgets.find((budget) => String(budget.category).toUpperCase() === 'ALL'),
    [selectedMonthBudgets]
  );

  // If an overall budget exists, use it for the summary to avoid double-counting
  // category budgets. Otherwise, sum the category budgets.
  const budgetSummary = useMemo(() => {
    if (overallBudget) {
      return {
        amount: Number(overallBudget.amount) || 0,
        spent: Number(overallBudget.spent) || 0,
        remaining: Number(overallBudget.remaining) || 0,
      };
    }

    return selectedMonthBudgets.reduce(
      (summary, budget) => ({
        amount: summary.amount + (Number(budget.amount) || 0),
        spent: summary.spent + (Number(budget.spent) || 0),
        remaining: summary.remaining + (Number(budget.remaining) || 0),
      }),
      { amount: 0, spent: 0, remaining: 0 }
    );
  }, [selectedMonthBudgets, overallBudget]);

  const budgetPercentage =
    budgetSummary.amount > 0
      ? (budgetSummary.spent / budgetSummary.amount) * 100
      : 0;

  // Add or update a transaction.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const numericAmount = Number(amount);

    if (!title.trim()) {
      setError('Please enter a transaction description.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!transactionDate) {
      setError('Please select a transaction date.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in again.');
      return;
    }

    const isEditing = editingId !== null;
    setSaving(true);

    try {
      const response = await fetch(
        isEditing ? `${API_URL}/${encodeURIComponent(editingId)}` : API_URL,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            category,
            amount: numericAmount,
            description: title.trim(),
            transactionDate,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session may have expired. Please sign in again.');
        }
        if (response.status === 404 && isEditing) {
          throw new Error('Transaction not found. Please refresh and try again.');
        }
        throw new Error(await getErrorMessage(response));
      }

      const refreshed = await loadTransactions();
      if (!refreshed) {
        setError(
          isEditing
            ? 'Transaction updated, but the list could not refresh.'
            : 'Transaction added, but the list could not refresh.'
        );
        return;
      }

      setTitle('');
      setAmount('');
      setTransactionDate(getTodayLocalDate());
      setCategory('Food');
      setType('EXPENSE');
      setEditingId(null);
      setSuccess(isEditing ? 'Transaction updated successfully.' : 'Transaction added successfully.');

      // Budget spent values are calculated from transactions by the backend.
      if (activePage === 'budgets') loadBudgets();
    } catch (err) {
      setError(err.message || 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  // Edit transaction.
  const handleEdit = (transaction) => {
    const transactionId = transaction.id || transaction._id;

    if (!transactionId) {
      setError('Cannot edit this transaction: ID is missing.');
      return;
    }

    setEditingId(transactionId);
    setType(transaction.type || 'EXPENSE');
    setTitle(transaction.description || transaction.title || '');
    setCategory(transaction.category || 'Other');
    setAmount(String(transaction.amount ?? ''));
    setTransactionDate(
      transaction.transactionDate
        ? String(transaction.transactionDate).slice(0, 10)
        : getTodayLocalDate()
    );

    setActivePage('transactions');
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setType('EXPENSE');
    setCategory('Food');
    setTransactionDate(getTodayLocalDate());
    setError('');
  };

  // Delete transaction.
  const handleDelete = async (transaction) => {
    const transactionId = transaction?.id || transaction?._id;

    if (!transactionId) {
      setError('Cannot delete: transaction ID is missing.');
      return;
    }

    const description =
      transaction.description || transaction.title || transaction.category || 'this transaction';

    if (!window.confirm(`Are you sure you want to delete "${description}"? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in again to delete this transaction.');
      return;
    }

    setError('');
    setSuccess('');
    setDeletingId(transactionId);

    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(transactionId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session may have expired. Please sign in again.');
        }
        if (response.status === 403) {
          throw new Error('You are not authorized to delete this transaction.');
        }
        if (response.status === 404) {
          throw new Error('Transaction not found for your account. Please refresh.');
        }
        throw new Error(await getErrorMessage(response));
      }

      setTransactions((current) =>
        current.filter((item) => (item.id || item._id) !== transactionId)
      );

      const refreshed = await loadTransactions();
      if (refreshed) {
        setSuccess('Transaction deleted successfully.');
      } else {
        setError('Deletion succeeded, but refreshing the list failed.');
      }

      if (editingId === transactionId) handleCancelEdit();
      if (activePage === 'budgets') loadBudgets();
    } catch (err) {
      setError(err.message || 'Failed to delete transaction.');
    } finally {
      setDeletingId(null);
    }
  };

  // Create or update a monthly budget.
  const handleBudgetSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const [yearText, monthText] = selectedBudgetMonth.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const numericAmount = Number(budgetAmount);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      setError('Please select a valid budget month.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a budget amount greater than zero.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in again to save a budget.');
      return;
    }

    setBudgetSaving(true);

    try {
      const response = await fetch(BUDGET_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          month,
          category: budgetCategory,
          amount: numericAmount,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session may have expired. Please sign in again.');
        }
        throw new Error(await getErrorMessage(response));
      }

      const refreshed = await loadBudgets();
      setBudgetAmount('');

      if (refreshed) {
        setSuccess('Budget saved successfully.');
      } else {
        setError('Budget was saved, but the budget list could not refresh.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save budget.');
    } finally {
      setBudgetSaving(false);
    }
  };

  // Delete a budget belonging to the signed-in user.
  const handleBudgetDelete = async (budget) => {
    const budgetId = budget.id || budget._id;

    if (!budgetId) {
      setError('Cannot delete this budget: ID is missing.');
      return;
    }

    if (!window.confirm(`Delete the ${budget.category} budget for ${formatMonth(
      `${budget.year}-${String(budget.month).padStart(2, '0')}`
    )}?`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in again to delete this budget.');
      return;
    }

    setError('');
    setSuccess('');
    setDeletingBudgetId(budgetId);

    try {
      const response = await fetch(`${BUDGET_API_URL}/${encodeURIComponent(budgetId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your session may have expired. Please sign in again.');
        }
        throw new Error(await getErrorMessage(response));
      }

      setBudgets((current) =>
        current.filter((item) => (item.id || item._id) !== budgetId)
      );
      setSuccess('Budget deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete budget.');
    } finally {
      setDeletingBudgetId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    onLogout?.();
  };

  const handleResetFilters = () => {
    setFilterType('ALL');
    setFilterCategory('ALL');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const displayName = user?.fullName || user?.name || user?.email || 'User';

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'transactions', label: 'Transactions', icon: '↔' },
    { id: 'analytics', label: 'Analytics', icon: '▥' },
    { id: 'budgets', label: 'Budgets', icon: '◎' },
  ];

  const pageTitles = {
    dashboard: 'Dashboard Overview',
    transactions: 'Transactions',
    analytics: 'Financial Analytics',
    budgets: 'Budget Management',
    settings: 'Settings',
  };

  const showDashboard = activePage === 'dashboard';
  const showAnalytics = activePage === 'dashboard' || activePage === 'analytics';
  const showTransactions = activePage === 'dashboard' || activePage === 'transactions';

  return (
    <main className="finance-dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">₹</div>
          <div>
            <h2>FinTrack</h2>
            <span>Personal Finance</span>
          </div>
        </div>

        <p className="sidebar-label">MAIN MENU</p>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activePage === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => setActivePage(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <p className="sidebar-label sidebar-bottom-label">PREFERENCES</p>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={activePage === 'settings' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('settings')}
          >
            <span>⚙</span>
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-details">
            <strong>{displayName}</strong>
            <span>Personal Account</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="dashboard-main">
        {/* HEADER */}
        <header className="dashboard-header">
          <div className="header-page-title">
            <p className="eyebrow">FINANCIAL MANAGEMENT</p>
            <h1>{pageTitles[activePage]}</h1>
          </div>

          <div className="header-user">
            <div className="user-info">
              <span>Signed in as</span>
              <strong>{displayName}</strong>
            </div>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* ALERTS */}
        {error && (
          <div className="dashboard-alert error-alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        {success && (
          <div className="dashboard-alert success-alert" role="status">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess('')}>Dismiss</button>
          </div>
        )}

        {/* DASHBOARD OVERVIEW */}
        {showDashboard && (
          <>
            <section className="dashboard-intro">
              <div>
                <p className="eyebrow">YOUR FINANCIAL OVERVIEW</p>
                <h2>Welcome to your financial dashboard</h2>
                <p className="intro-description">
                  Track your income, expenses and financial balance in one place.
                </p>
              </div>
            </section>

            <section className="summary-grid">
              <article className="summary-card balance-card">
                <div className="summary-card-top">
                  <span>Total Balance</span>
                  <span className="summary-icon">₹</span>
                </div>
                <h3>{formatCurrency(balance)}</h3>
                <p>Income minus expenses</p>
              </article>

              <article className="summary-card income-card">
                <div className="summary-card-top">
                  <span>Total Income</span>
                  <span className="summary-icon">↗</span>
                </div>
                <h3>{formatCurrency(totalIncome)}</h3>
                <p>Your recorded earnings</p>
              </article>

              <article className="summary-card expense-card">
                <div className="summary-card-top">
                  <span>Total Expenses</span>
                  <span className="summary-icon">↘</span>
                </div>
                <h3>{formatCurrency(totalExpense)}</h3>
                <p>Your recorded spending</p>
              </article>

              <article className="summary-card count-card">
                <div className="summary-card-top">
                  <span>Transactions</span>
                  <span className="summary-icon">#</span>
                </div>
                <h3>{transactions.length}</h3>
                <p>Total recorded transactions</p>
              </article>
            </section>
          </>
        )}

        {/* ANALYTICS CHARTS */}
        {showAnalytics && (
          <section className="charts-grid">
            <section className="dashboard-panel chart-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">SPENDING BREAKDOWN</p>
                  <h2>Expenses by Category</h2>
                </div>
              </div>

              {expenseByCategory.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius="72%"
                        paddingAngle={2}
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell
                            key={entry.category}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="transactions-state chart-empty-state">
                  <p>No expense data for the selected filters.</p>
                </div>
              )}
            </section>

            <section className="dashboard-panel chart-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">MONTHLY OVERVIEW</p>
                  <h2>Income vs Expenses</h2>
                </div>
              </div>

              {monthlyTotals.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyTotals}
                      margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" />
                      <XAxis dataKey="month" />
                      <YAxis
                        tickFormatter={(value) =>
                          new Intl.NumberFormat('en-IN', {
                            notation: 'compact',
                            maximumFractionDigits: 1,
                          }).format(value)
                        }
                      />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#16a34a" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="expense" name="Expenses" fill="#dc2626" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="transactions-state chart-empty-state">
                  <p>No monthly data for the selected filters.</p>
                </div>
              )}
            </section>
          </section>
        )}

        {/* TRANSACTION MANAGEMENT */}
        {showTransactions && (
          <section className="dashboard-content">
            {/* ADD / EDIT FORM */}
            <section className="dashboard-panel transaction-form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">TRANSACTION MANAGEMENT</p>
                  <h2>{editingId !== null ? 'Edit Transaction' : 'Add Transaction'}</h2>
                </div>
              </div>

              <div className="transaction-type-toggle">
                <button
                  type="button"
                  className={type === 'EXPENSE' ? 'active expense-toggle' : 'expense-toggle'}
                  onClick={() => {
                    setType('EXPENSE');
                    if (editingId === null) setCategory('Food');
                  }}
                  aria-pressed={type === 'EXPENSE'}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={type === 'INCOME' ? 'active income-toggle' : 'income-toggle'}
                  onClick={() => {
                    setType('INCOME');
                    if (editingId === null) setCategory('Salary');
                  }}
                  aria-pressed={type === 'INCOME'}
                >
                  Income
                </button>
              </div>

              <form className="transaction-form" onSubmit={handleSubmit}>
                <div className="form-field">
                  <label htmlFor="transaction-description">Description</label>
                  <input
                    id="transaction-description"
                    type="text"
                    placeholder="e.g. Lunch expense"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={255}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="transaction-category">Category</label>
                  <select
                    id="transaction-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    required
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="transaction-amount">Amount (₹)</label>
                  <input
                    id="transaction-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="transaction-date">Transaction Date</label>
                  <input
                    id="transaction-date"
                    type="date"
                    value={transactionDate}
                    onChange={(event) => setTransactionDate(event.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="submit-transaction-button" disabled={saving}>
                  {saving
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Update Transaction'
                      : 'Add Transaction'}
                </button>

                {editingId !== null && (
                  <button
                    type="button"
                    className="refresh-button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </section>

            {/* TRANSACTION HISTORY */}
            <section className="dashboard-panel transaction-history-panel">
              <div className="panel-heading transactions-heading">
                <div>
                  <p className="eyebrow">YOUR RECORDS</p>
                  <h2>Transaction History</h2>
                </div>
                <button
                  type="button"
                  className="refresh-button"
                  onClick={loadTransactions}
                  disabled={loading || deletingId !== null}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <div className="form-field transaction-search">
                <label htmlFor="transaction-search">Search transactions</label>
                <input
                  id="transaction-search"
                  type="search"
                  placeholder="Search description or category..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="transaction-filters">
                <div className="form-field">
                  <label htmlFor="filter-type">Transaction Type</label>
                  <select
                    id="filter-type"
                    value={filterType}
                    onChange={(event) => setFilterType(event.target.value)}
                  >
                    <option value="ALL">All Types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="filter-category">Category</label>
                  <select
                    id="filter-category"
                    value={filterCategory}
                    onChange={(event) => setFilterCategory(event.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    {categoryOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="filter-start-date">From Date</label>
                  <input
                    id="filter-start-date"
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="filter-end-date">To Date</label>
                  <input
                    id="filter-end-date"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>

                <div className="filter-actions">
                  <button type="button" className="refresh-button" onClick={handleResetFilters}>
                    Reset Filters
                  </button>
                  <span className="filter-result-count">
                    {filteredTransactions.length} result{filteredTransactions.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="transactions-state">
                  <div className="loading-spinner" aria-hidden="true" />
                  <p>Loading your transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="transactions-state empty-state">
                  <div className="empty-state-icon">₹</div>
                  <h3>{transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}</h3>
                  <p>
                    {transactions.length === 0
                      ? 'Add your first income or expense to get started.'
                      : 'Try changing your filters or reset them to see all transactions.'}
                  </p>
                </div>
              ) : (
                <div className="transactions-list">
                  {filteredTransactions.map((transaction) => {
                    const transactionId = transaction.id || transaction._id;
                    const description =
                      transaction.description ||
                      transaction.title ||
                      transaction.category ||
                      'Transaction';
                    const isIncome = transaction.type === 'INCOME';

                    return (
                      <article className="transaction-item" key={transactionId}>
                        <div
                          className={`transaction-icon ${
                            isIncome ? 'income-transaction-icon' : 'expense-transaction-icon'
                          }`}
                          aria-hidden="true"
                        >
                          {isIncome ? '↗' : '↘'}
                        </div>

                        <div className="transaction-details">
                          <h3>{description}</h3>
                          <p>
                            {transaction.category || 'Uncategorized'}
                            {' · '}
                            {formatDate(transaction.transactionDate || transaction.createdAt)}
                          </p>
                        </div>

                        <div className="transaction-amount">
                          <strong className={isIncome ? 'income-amount' : 'expense-amount'}>
                            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </strong>
                          <span>{isIncome ? 'Income' : 'Expense'}</span>
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleEdit(transaction)}
                            disabled={saving || deletingId !== null}
                            aria-label={`Edit ${description}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDelete(transaction)}
                            disabled={deletingId !== null || saving}
                            aria-label={`Delete ${description}`}
                          >
                            {deletingId === transactionId ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        )}

        {/* BUDGET MANAGEMENT */}
        {activePage === 'budgets' && (
          <section className="budget-page">
            <section className="budget-top-grid">
              <div className="dashboard-panel budget-create-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">PLAN YOUR SPENDING</p>
                    <h2>Create Monthly Budget</h2>
                  </div>
                </div>

                <form className="budget-form" onSubmit={handleBudgetSubmit}>
                  <div className="form-field">
                    <label htmlFor="budget-month">Budget Month</label>
                    <input
                      id="budget-month"
                      type="month"
                      value={selectedBudgetMonth}
                      onChange={(event) => setSelectedBudgetMonth(event.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="budget-category">Budget Category</label>
                    <select
                      id="budget-category"
                      value={budgetCategory}
                      onChange={(event) => setBudgetCategory(event.target.value)}
                      required
                    >
                      <option value="ALL">Overall Monthly Budget</option>
                      {BUDGET_CATEGORIES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="budget-amount">Budget Limit (₹)</label>
                    <input
                      id="budget-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 10000"
                      value={budgetAmount}
                      onChange={(event) => setBudgetAmount(event.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="submit-transaction-button"
                    disabled={budgetSaving}
                  >
                    {budgetSaving ? 'Saving Budget...' : 'Save Budget'}
                  </button>
                </form>
                <p className="budget-form-note">
                  Saving the same month and category updates its existing budget.
                </p>
              </div>

              <div className="budget-summary-card">
                <p className="eyebrow">MONTHLY BUDGET SUMMARY</p>
                <h2>{formatMonth(selectedBudgetMonth)}</h2>
                <div className="budget-summary-values">
                  <div>
                    <span>Total budget</span>
                    <strong>{formatCurrency(budgetSummary.amount)}</strong>
                  </div>
                  <div>
                    <span>Spent</span>
                    <strong>{formatCurrency(budgetSummary.spent)}</strong>
                  </div>
                  <div>
                    <span>Remaining</span>
                    <strong>{formatCurrency(budgetSummary.remaining)}</strong>
                  </div>
                </div>
                {budgetSummary.amount > 0 && (
                  <div className="budget-summary-progress-wrap">
                    <div className="budget-summary-progress">
                      <div
                        className={`budget-progress-fill ${
                          budgetPercentage > 100 ? 'over-budget' : ''
                        }`}
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      />
                    </div>
                    <span>{budgetPercentage.toFixed(1)}% of budget used</span>
                  </div>
                )}
              </div>
            </section>

            <section className="dashboard-panel budget-list-panel">
              <div className="panel-heading transactions-heading">
                <div>
                  <p className="eyebrow">TRACK YOUR LIMITS</p>
                  <h2>Budgets for {formatMonth(selectedBudgetMonth)}</h2>
                </div>
                <button
                  type="button"
                  className="refresh-button"
                  onClick={loadBudgets}
                  disabled={budgetLoading || deletingBudgetId !== null}
                >
                  {budgetLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {budgetLoading ? (
                <div className="transactions-state">
                  <div className="loading-spinner" aria-hidden="true" />
                  <p>Loading your budgets...</p>
                </div>
              ) : selectedMonthBudgets.length === 0 ? (
                <div className="budget-empty">
                  <div className="empty-state-icon">◎</div>
                  <h3>No budgets for this month</h3>
                  <p>Create an overall monthly budget or set limits for individual expense categories.</p>
                </div>
              ) : (
                <div className="budget-list">
                  {selectedMonthBudgets.map((budget) => {
                    const budgetId = budget.id || budget._id;
                    const budgetLimit = Number(budget.amount) || 0;
                    const spent = Number(budget.spent) || 0;
                    const remaining = Number(budget.remaining) || 0;
                    const percentage = Number(budget.percentageUsed) || 0;
                    const isOverBudget = Boolean(budget.overBudget) || spent > budgetLimit;
                    const isOverall = String(budget.category).toUpperCase() === 'ALL';

                    return (
                      <article className="budget-item" key={budgetId || `${budget.year}-${budget.month}-${budget.category}`}>
                        <div className="budget-item-top">
                          <div>
                            <h3>{isOverall ? 'Overall Monthly Budget' : budget.category}</h3>
                            <span className="budget-item-month">{formatMonth(selectedBudgetMonth)}</span>
                          </div>
                          <button
                            type="button"
                            className="budget-delete-button"
                            onClick={() => handleBudgetDelete(budget)}
                            disabled={deletingBudgetId !== null}
                          >
                            {deletingBudgetId === budgetId ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>

                        <div className="budget-item-values">
                          <span>Limit: <strong>{formatCurrency(budgetLimit)}</strong></span>
                          <span>Spent: <strong>{formatCurrency(spent)}</strong></span>
                          <span>Remaining: <strong>{formatCurrency(remaining)}</strong></span>
                        </div>

                        <div className="budget-progress" aria-label={`${percentage.toFixed(1)} percent used`}>
                          <div
                            className={`budget-progress-fill ${isOverBudget ? 'over-budget' : ''}`}
                            style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                          />
                        </div>

                        <div className="budget-item-footer">
                          <span className={`budget-status ${isOverBudget ? 'over-budget' : ''}`}>
                            {isOverBudget
                              ? `Over budget by ${formatCurrency(Math.abs(remaining))}`
                              : `${percentage.toFixed(1)}% used`}
                          </span>
                          <span>{isOverBudget ? 'Spending limit exceeded' : 'Within budget'}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        )}

        {/* SETTINGS PLACEHOLDER */}
        {activePage === 'settings' && (
          <section className="dashboard-panel coming-soon-panel">
            <div className="coming-soon-icon">⚙</div>
            <p className="eyebrow">ACCOUNT PREFERENCES</p>
            <h2>Settings</h2>
            <p>Account preferences and profile management will be available here.</p>
            <span className="coming-soon-label">Coming Soon</span>
          </section>
        )}

        {/* FOOTER */}
        <footer className="dashboard-footer">
          <p>FinTrack · Keep track of your financial future.</p>
        </footer>
      </div>
    </main>
  );
}

export default Dashboard;
