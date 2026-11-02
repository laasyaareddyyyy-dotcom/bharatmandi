import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ArrowLeft,
  X,
  Search,
  Phone,
  Banknote,
  CheckCircle,
  Clock,
  Trash2,
  Calendar,
  Briefcase,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { EmployeeRecord } from '../../types';
import { getTodayDateString, formatDisplayDate } from '../../data/initialData';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { sounds } from '../../utils/audio';

export const EmployeesView: React.FC = () => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    recordEmployeePayment,
    language,
  } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentModalEmployee, setPaymentModalEmployee] = useState<EmployeeRecord | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payDate, setPayDate] = useState<string>(getTodayDateString());
  const [payMode, setPayMode] = useState<string>('Cash');
  const [payNotes, setPayNotes] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // New Employee Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<EmployeeRecord['role']>('Weighman (Taula)');
  const [dailyWageOrSalary, setDailyWageOrSalary] = useState<number | ''>('');
  const [wageType, setWageType] = useState<'daily' | 'monthly'>('daily');
  const [notes, setNotes] = useState('');

  // Delete modal state
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    employee: EmployeeRecord | null;
  }>({
    isOpen: false,
    employee: null,
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone.includes(searchQuery) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, roleFilter]);

  // Aggregate Metrics
  const totalEmployees = employees.length;
  const activeCount = employees.filter((e) => e.status === 'active').length;
  const totalWagesPaid = employees.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0);
  const totalBalanceDue = employees.reduce((acc, curr) => acc + (curr.balanceDue || 0), 0);

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !dailyWageOrSalary || Number(dailyWageOrSalary) <= 0) {
      alert('Please fill employee name, phone number, and wage rate.');
      return;
    }

    addEmployee({
      name: name.trim(),
      phone: phone.trim().replace(/\D/g, '').slice(-10),
      role,
      dailyWageOrSalary: Number(dailyWageOrSalary),
      wageType,
      status: 'active',
      notes: notes.trim(),
    });

    sounds.cashSuccess?.();
    setFeedbackMsg(`✓ Added ${name.trim()} to Mandi Staff roster.`);
    setTimeout(() => setFeedbackMsg(null), 3000);

    setName('');
    setPhone('');
    setDailyWageOrSalary('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleConfirmPayWage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalEmployee || !payAmount || Number(payAmount) <= 0) return;

    recordEmployeePayment(paymentModalEmployee.id, Number(payAmount));
    sounds.cashSuccess?.();
    setFeedbackMsg(
      `✓ Paid ₹${Number(payAmount).toLocaleString('en-IN')} to ${paymentModalEmployee.name} via ${payMode}.`
    );
    setTimeout(() => setFeedbackMsg(null), 3000);

    setPaymentModalEmployee(null);
    setPayAmount('');
    setPayNotes('');
  };

  const handleConfirmDelete = () => {
    if (deleteModalConfig.employee) {
      deleteEmployee(deleteModalConfig.employee.id);
      sounds.playTrashSound?.();
      setFeedbackMsg(`✓ Staff record for ${deleteModalConfig.employee.name} removed.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      setDeleteModalConfig({ isOpen: false, employee: null });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-700 text-white font-bold flex items-center gap-3 shadow-md animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <span>Mandi Employees & Labor Wages</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage weighmen (taula), hamali team, accountants, daily attendance & salary payouts
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition active:scale-95 min-h-[48px] cursor-pointer"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalEmployees}
          </div>
          <div className="text-xs text-slate-500 font-medium">Registered staff on payroll</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active on Duty</span>
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono">
            {activeCount}
          </div>
          <div className="text-xs text-slate-500 font-medium">Available for auction floor work</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Wages Settled</span>
            <Banknote className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
            ₹{totalWagesPaid.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 font-medium">Historical payouts recorded</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Dues / Balance</span>
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
            ₹{totalBalanceDue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 font-medium">Pending wage balances</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name, phone, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'Accountant', label: 'Accountant' },
            { id: 'Weighman (Taula)', label: 'Weighman (Taula)' },
            { id: 'Hamal / Coolie', label: 'Hamal / Coolie' },
            { id: 'Supervisor', label: 'Supervisor' },
            { id: 'Clerk', label: 'Clerk' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer min-h-[38px] ${
                roleFilter === r.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employee List - Vertical Cards */}
      <div className="space-y-4">
        {filteredEmployees.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No employee records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your weighmen, hamals, accountants, and clerks to keep wage settlements organized.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Staff Member</span>
            </button>
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-emerald-800 border border-slate-200 flex items-center justify-center font-black text-sm">
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900">{emp.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {emp.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {emp.phone}
                      </span>
                      <span>•</span>
                      <span>Joined: {emp.joinedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setPaymentModalEmployee(emp);
                      setPayAmount(emp.dailyWageOrSalary || '');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs min-h-[44px] cursor-pointer"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Pay Wage / Salary</span>
                  </button>

                  <button
                    onClick={() => setDeleteModalConfig({ isOpen: true, employee: emp })}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    title="Delete Staff Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Wage & Financial Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block font-medium">Wage Rate:</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    ₹{emp.dailyWageOrSalary.toLocaleString('en-IN')}/{emp.wageType === 'daily' ? 'day' : 'month'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block font-medium">Status:</span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                    {emp.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block font-medium">Total Paid to Date:</span>
                  <span className="text-base font-black text-emerald-800 font-mono">
                    ₹{emp.totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <span className="text-amber-800 block font-medium">Balance Due:</span>
                  <span className="text-base font-black text-amber-900 font-mono">
                    ₹{emp.balanceDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {emp.notes && (
                <p className="text-xs text-slate-500 italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  Note: {emp.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div
          id="add-employee-modal-overlay"
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
        >
          <div
            id="add-employee-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* FIXED HEADER */}
            <div className="flex-shrink-0 px-3 sm:px-5 py-3 sm:py-4 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  aria-label="Go Back"
                  className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-white/10 hidden sm:flex items-center justify-center text-[#d4af37] shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight">Add Mandi Employee</h3>
                  <p className="text-[11px] text-slate-200/80 leading-none mt-0.5">Register staff on mandi payroll</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs bg-[#f8fafc]">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rameshwar Lal Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-[#1a3a52]/20 focus:border-[#1a3a52] bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as EmployeeRecord['role'])}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  >
                    <option value="Weighman (Taula)">Weighman (Taula)</option>
                    <option value="Hamal / Coolie">Hamal / Coolie</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Clerk">Clerk</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Daily Wage or Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 750 or 25000"
                    value={dailyWageOrSalary}
                    onChange={(e) => setDailyWageOrSalary(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Wage Frequency *</label>
                  <select
                    value={wageType}
                    onChange={(e) => setWageType(e.target.value as 'daily' | 'monthly')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  >
                    <option value="daily">Per Day (Daily Wage)</option>
                    <option value="monthly">Monthly Salary</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Notes / Floor Duty</label>
                <input
                  type="text"
                  placeholder="e.g. Scale #1, Unloading Bay 2, Gate Entry"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition min-h-[48px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-bold transition shadow-sm min-h-[48px] cursor-pointer"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Wage Modal */}
      {paymentModalEmployee && (
        <div
          id="pay-wage-modal-overlay"
          onClick={() => setPaymentModalEmployee(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
        >
          <div
            id="pay-wage-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* FIXED HEADER */}
            <div className="flex-shrink-0 px-3 sm:px-4 py-3 bg-[#1a3a52] text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentModalEmployee(null)}
                  aria-label="Go Back"
                  className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Record Wage Payment</h3>
                  <p className="text-[10px] text-slate-200/80 leading-none mt-0.5">{paymentModalEmployee.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalEmployee(null)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#f8fafc]">
              <p className="text-xs text-slate-600">
                Disburse wage / salary to <strong>{paymentModalEmployee.name}</strong> ({paymentModalEmployee.role}).
              </p>

              <form onSubmit={handleConfirmPayWage} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Amount to Pay (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 750"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Payment Date</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Payment Mode</label>
                    <select
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / PhonePe</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Week 3 wages, overtime"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentModalEmployee(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 min-h-[48px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#1a3a52] hover:bg-[#122839] text-white font-bold min-h-[48px] cursor-pointer"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        title="Remove Staff Record"
        itemName={deleteModalConfig.employee?.name}
        itemDetails={`${deleteModalConfig.employee?.role || ''} • ${deleteModalConfig.employee?.phone || ''}`}
        message="Are you sure you want to remove this employee from the Mandi roster? All historical paid records will remain in ledger archives."
        onClose={() => setDeleteModalConfig({ isOpen: false, employee: null })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
