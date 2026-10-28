import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Lock,
  Wallet,
  FileText,
  Receipt,
  Image as ImageIcon,
  Building2,
  Percent,
  Calendar,
} from 'lucide-react';
import { OrderItem, TaskItem, FreelancerStats, UserSession, OrderStatus, TaskStatus } from '../types.ts';
import { formatINR, formatDate, getStatusBadge } from '../utils/format.ts';
import { apiFetch } from '../utils/api.ts';
import { FreelancerPayoutModal, PayoutBillData } from './FreelancerPayoutModal.tsx';

interface FreelancerDashboardProps {
  user: UserSession;
}

export const FreelancerDashboard: React.FC<FreelancerDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'tasks' | 'payouts'>('orders');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<FreelancerStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedPayoutBill, setSelectedPayoutBill] = useState<PayoutBillData | null>(null);

  const fetchFreelancerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/my');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to load your assigned workload (${res.status})`);
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreelancerData();
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleUpdateOrderStatus = async (code: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/api/my/orders/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      await fetchFreelancerData();
      notifySuccess(`Order ${code} marked as ${newStatus}.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateTaskStatus = async (code: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/api/my/tasks/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      await fetchFreelancerData();
      notifySuccess(`Task ${code} marked as ${newStatus}.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Freelancers are permitted to set status ONLY to: Assigned, In progress, Review, Delivered (Paid is locked)
  const allowedStatuses: OrderStatus[] = ['Assigned', 'In progress', 'Review', 'Delivered'];

  // Combine settled orders and tasks for the Payouts & Settlement Bills view
  const allProjects = [
    ...orders.map(o => ({
      code: o.code,
      type: 'order' as const,
      title: o.service,
      service: o.service,
      deadline: o.deadline,
      status: o.status,
      clientPaid: (o as any).clientPaid || 0,
      commissionRate: (o as any).commissionRate || 35,
      adminShare: (o as any).agencyDeduction || 0,
      freelancerShare: (o as any).freelancerNetEarned || 0,
      payoutStatus: o.freelancer_payout_status || 'pending',
      payoutAt: o.freelancer_payout_at,
      payoutNote: o.freelancer_payout_note,
      payoutProof: o.freelancer_payout_proof,
    })),
    ...tasks.map(t => ({
      code: t.code,
      type: 'task' as const,
      title: t.title,
      service: 'Custom Task',
      deadline: t.deadline,
      status: t.status,
      clientPaid: (t as any).clientPaid || Number(t.paid || 0),
      commissionRate: (t as any).commissionRate || 35,
      adminShare: (t as any).agencyDeduction || 0,
      freelancerShare: (t as any).freelancerNetEarned || Number(t.paid || 0),
      payoutStatus: t.freelancer_payout_status || 'pending',
      payoutAt: t.freelancer_payout_at,
      payoutNote: t.freelancer_payout_note,
      payoutProof: t.freelancer_payout_proof,
    })),
  ];

  const settledProjects = allProjects.filter(p => p.payoutStatus === 'settled');
  const pendingProjects = allProjects.filter(p => p.payoutStatus !== 'settled' && p.clientPaid > 0);

  const pendingAmount = stats?.totalPendingPayouts ?? 0;
  const settledAmount = stats?.totalSettledPayouts ?? stats?.receivedEarnings ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Freelancer Workspace
            </span>
            <span className="text-xs text-slate-500">
              Assigned Workload & Settlement Bills
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Hello, {user.name}
          </h1>
        </div>

        <button
          onClick={fetchFreelancerData}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh assignments"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Assigned Orders</span>
          <div className="text-2xl font-black text-white mt-1">{stats?.assignedOrders || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Active Working</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats?.activeOrders || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Delivered</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats?.deliveredOrders || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Net Earned</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {formatINR(stats?.totalNetEarned ?? stats?.totalEarnings ?? 0)}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Payouts Settled</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {formatINR(settledAmount)}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Pending Due</span>
          {pendingAmount > 0 ? (
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {formatINR(pendingAmount)}
            </div>
          ) : (
            <div className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 inline-flex items-center gap-1 mt-1 shadow-sm shadow-emerald-500/10">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>No payments due</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-slate-800/80 py-4 mt-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>1. Assigned Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>2. Custom Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center sm:justify-start gap-2 transition-all cursor-pointer ${
            activeTab === 'payouts'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>3. Payouts & Settlement Bills ({settledProjects.length})</span>
        </button>
      </div>

      {/* TAB 1: ASSIGNED ORDERS */}
      {activeTab === 'orders' && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-200">
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              <strong>Privacy Protection Enabled:</strong> Client contact details and client invoice prices are strictly hidden per Cutline Studio policy.
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs sm:text-sm">
              No orders currently assigned to you. When the owner assigns an order, it will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map(order => {
                const badge = getStatusBadge(order.status);
                const isDeliveredOrPaid = order.status === 'Delivered' || order.status === 'Paid';
                const isPayoutSettled = order.freelancer_payout_status === 'settled';

                return (
                  <div
                    key={order.code}
                    className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700/80 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {order.code}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Status:</span>
                          <select
                            value={order.status}
                            disabled={order.status === 'Paid'}
                            onChange={e => handleUpdateOrderStatus(order.code, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border} bg-slate-950 focus:outline-none disabled:opacity-75`}
                          >
                            {order.status === 'Paid' ? (
                              <option value="Paid">Paid (Locked)</option>
                            ) : (
                              allowedStatuses.map(s => (
                                <option key={s} value={s} className="bg-slate-900 text-white">
                                  {s}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {order.service}
                      </h3>

                      <div className="mt-2 text-xs text-slate-400">
                        Target Deadline:{' '}
                        <strong className="text-slate-200">{formatDate(order.deadline)}</strong>
                      </div>

                      <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Production Brief:
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {order.brief}
                        </p>
                      </div>

                      {/* Financial Payout Summary Badge for this order */}
                      {(order as any).freelancerNetEarned > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block">Your Net Payout</span>
                            <span className="text-sm font-bold text-emerald-400 font-mono">
                              {formatINR((order as any).freelancerNetEarned)}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              After {(order as any).commissionRate || 35}% agency deduction
                            </span>
                          </div>
                          {isPayoutSettled ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Payout Pending
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                      {order.link ? (
                        <a
                          href={order.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-300 font-semibold text-xs transition-colors"
                        >
                          <span>Open Cloud Footage Link</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">No link attached</span>
                      )}

                      {/* View Payout Bill Button */}
                      {isPayoutSettled ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPayoutBill({
                            code: order.code,
                            type: 'order',
                            title: order.service,
                            service: order.service,
                            freelancerName: user.name,
                            clientPaid: (order as any).clientPaid || 0,
                            commissionRate: (order as any).commissionRate || 35,
                            adminShare: (order as any).agencyDeduction || 0,
                            freelancerShare: (order as any).freelancerNetEarned || 0,
                            payoutStatus: 'settled',
                            payoutAt: order.freelancer_payout_at,
                            payoutNote: order.freelancer_payout_note,
                            payoutProof: order.freelancer_payout_proof,
                          })}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>View Payout Bill</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOM TASKS */}
      {activeTab === 'tasks' && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-200">
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400">
            For internal custom tasks assigned directly by the owner, your agreed payout price and payment status are displayed below.
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs sm:text-sm">
              No internal tasks assigned to you.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map(task => {
                const badge = getStatusBadge(task.status);
                const price = Number(task.price) || 0;
                const paid = Number(task.paid) || 0;
                const balance = Math.max(0, price - paid);
                const isPayoutSettled = task.freelancer_payout_status === 'settled';

                return (
                  <div
                    key={task.code}
                    className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-purple-400">
                          {task.code}
                        </span>
                        <select
                          value={task.status}
                          disabled={task.status === 'Paid'}
                          onChange={e => handleUpdateTaskStatus(task.code, e.target.value)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border} bg-slate-950 focus:outline-none`}
                        >
                          {task.status === 'Paid' ? (
                            <option value="Paid">Paid (Locked)</option>
                          ) : (
                            allowedStatuses.map(s => (
                              <option key={s} value={s} className="bg-slate-900 text-white">
                                {s}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <h4 className="text-base font-bold text-white tracking-tight">
                        {task.title}
                      </h4>

                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        {task.description}
                      </p>

                      <div className="mt-3 text-xs text-slate-400">
                        Deadline: <strong className="text-slate-200">{formatDate(task.deadline)}</strong>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 text-center text-xs">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Payout</div>
                          <div className="font-bold text-white">{formatINR(price)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Received</div>
                          <div className="font-bold text-emerald-400">{formatINR(paid)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Balance</div>
                          <div className="font-bold text-rose-400">{formatINR(balance)}</div>
                        </div>
                      </div>

                      {isPayoutSettled && (
                        <button
                          type="button"
                          onClick={() => setSelectedPayoutBill({
                            code: task.code,
                            type: 'task',
                            title: task.title,
                            service: 'Custom Task',
                            freelancerName: user.name,
                            clientPaid: (task as any).clientPaid || price,
                            commissionRate: (task as any).commissionRate || 35,
                            adminShare: (task as any).agencyDeduction || 0,
                            freelancerShare: (task as any).freelancerNetEarned || paid,
                            payoutStatus: 'settled',
                            payoutAt: task.freelancer_payout_at,
                            payoutNote: task.freelancer_payout_note,
                            payoutProof: task.freelancer_payout_proof,
                          })}
                          className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>View Settlement Bill & Proof</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYOUTS & SETTLEMENT BILLS */}
      {activeTab === 'payouts' && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          {/* Top Status Callout */}
          {pendingAmount === 0 ? (
            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm shadow-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <span>No payments due</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Account Up-to-Date
                    </span>
                  </div>
                  <div className="text-xs text-emerald-400/80 mt-0.5">
                    All completed project earnings have been remitted in full by Cutline Studio Administration.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto font-mono">
                <span className="text-xs text-slate-400">Total Settled:</span>
                <span className="text-base font-black text-emerald-300">{formatINR(settledAmount)}</span>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">Pending Clearance Payouts</div>
                  <div className="text-xs text-amber-400/80 mt-0.5">
                    Cutline Studio will transfer your net share upon settlement.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto font-mono">
                <span className="text-xs text-slate-400">Pending Amount:</span>
                <span className="text-xl font-black text-amber-300">{formatINR(pendingAmount)}</span>
              </div>
            </div>
          )}

          {/* Settled Bills List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Settlement Remittance Bills & Payment Receipts</span>
                </h3>
                <p className="text-xs text-slate-400">
                  View your official project settlement bills with order payout details and verified payment proof.
                </p>
              </div>
            </div>

            {settledProjects.length === 0 ? (
              <div className="p-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center text-slate-500 text-xs sm:text-sm space-y-1">
                <div className="font-semibold text-slate-400">No settled payout bills generated yet.</div>
                <div>When the admin marks a project as settled, your official voucher will appear here.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settledProjects.map(item => (
                  <div
                    key={`${item.type}-${item.code}`}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-colors flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                            <span>VCH-{item.code}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase font-bold">
                              {item.type}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-1 line-clamp-1">
                            {item.title}
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Settled
                        </span>
                      </div>

                      {/* Order Compensation Card */}
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Order Payout Price
                          </span>
                          <span className="text-[11px] text-emerald-400 font-medium">
                            Compensation for this project
                          </span>
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-base sm:text-lg">
                          {formatINR(item.freelancerShare)}
                        </span>
                      </div>

                      {item.payoutNote && (
                        <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                          <strong className="text-slate-400">Note:</strong> {item.payoutNote}
                        </div>
                      )}

                      {/* Verified Screenshot Thumbnail */}
                      {item.payoutProof && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={item.payoutProof}
                              alt="Proof Thumbnail"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-800"
                            />
                            <div>
                              <div className="text-xs font-semibold text-white flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Payment Slip Attached</span>
                              </div>
                              <div className="text-[10px] text-slate-400">Verified by Admin</div>
                            </div>
                          </div>
                          <a
                            href={item.payoutProof}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Enlarge</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        {item.payoutAt ? `Settled on ${formatDate(item.payoutAt)}` : 'Settled'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPayoutBill({
                          code: item.code,
                          type: item.type,
                          title: item.title,
                          service: item.service,
                          freelancerName: user.name,
                          clientPaid: item.clientPaid,
                          commissionRate: item.commissionRate,
                          adminShare: item.adminShare,
                          freelancerShare: item.freelancerShare,
                          payoutStatus: 'settled',
                          payoutAt: item.payoutAt,
                          payoutNote: item.payoutNote,
                          payoutProof: item.payoutProof,
                        })}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View / Save Payout Bill</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: View Freelancer Payout Bill & Voucher */}
      {selectedPayoutBill && (
        <FreelancerPayoutModal
          bill={selectedPayoutBill}
          onClose={() => setSelectedPayoutBill(null)}
        />
      )}
    </div>
  );
};
