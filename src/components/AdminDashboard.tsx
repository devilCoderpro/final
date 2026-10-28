import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  CheckSquare,
  Sparkles,
  Receipt,
  Users,
  Database,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  DollarSign,
  UserCheck,
  RefreshCw,
  AlertCircle,
  FileText,
  KeyRound,
  Eye,
  CheckCircle2,
  Clock,
  Upload,
  Image as ImageIcon,
  Send,
  Download,
  RotateCcw,
  ShieldAlert,
  Lock,
  History,
  HardDrive,
  Percent,
  Coins,
  Wallet,
  SlidersHorizontal,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Share2,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  OrderItem,
  TaskItem,
  TeamMember,
  AdminStats,
  ServiceItem,
  AppConfig,
  OrderStatus,
  TaskStatus,
  CommissionRecord,
  FreelancerCommissionSummary,
  CommissionStats,
} from '../types.ts';
import {
  formatINR,
  formatDate,
  getStatusBadge,
  getPaymentStatus,
  exportToCSV,
  compressImageFile,
  getWhatsAppShareLink,
} from '../utils/format.ts';
import { apiFetch } from '../utils/api.ts';
import { resolveServicePrice } from '../utils/pricing.ts';
import { sendBillPdfViaWhatsApp } from '../utils/invoicePdf.ts';
import { sendPayoutBillViaWhatsApp } from '../utils/payoutPdf.ts';
import { FreelancerPayoutModal } from './FreelancerPayoutModal.tsx';
import { PayoutBillData } from '../types.ts';

interface AdminDashboardProps {
  config: AppConfig | null;
  services?: ServiceItem[];
  onViewInvoice: (order: OrderItem) => void;
  onServicesUpdated: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  config,
  services: initialServices = [],
  onViewInvoice,
  onServicesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'tasks' | 'services' | 'billing' | 'team' | 'commission' | 'backup'
  >('overview');

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (initialServices && initialServices.length > 0) {
      setServices(initialServices);
    }
  }, [initialServices]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals & sub-state
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<OrderItem | null>(null);
  const [showResetPassModal, setShowResetPassModal] = useState<TeamMember | null>(null);
  const [selectedBriefOrder, setSelectedBriefOrder] = useState<OrderItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'order' | 'task' | 'team' | 'service';
    id: string;
    name?: string;
    title: string;
    description: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Payment modal state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentRefNote, setPaymentRefNote] = useState('');
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [paymentProofFileName, setPaymentProofFileName] = useState('');
  const [paymentUploading, setPaymentUploading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Snapshots & Restore State
  const [snapshots, setSnapshots] = useState<Array<{ filename: string; size: number; createdAt: string }>>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState<{ filename: string; size: number; createdAt: string } | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestorePasswordText, setShowRestorePasswordText] = useState(false);

  // Commission & Payout State
  const [commissionRecords, setCommissionRecords] = useState<CommissionRecord[]>([]);
  const [freelancerSummaries, setFreelancerSummaries] = useState<FreelancerCommissionSummary[]>([]);
  const [commissionStats, setCommissionStats] = useState<CommissionStats | null>(null);
  const [defaultRate, setDefaultRate] = useState<number>(config?.defaultCommissionRate || 30);
  const [isEditingDefaultRate, setIsEditingDefaultRate] = useState(false);
  const [newDefaultRateInput, setNewDefaultRateInput] = useState<string>('30');
  const [loadingCommission, setLoadingCommission] = useState(false);

  // Filters for Commission Tab
  const [commissionFilterEditor, setCommissionFilterEditor] = useState<string>('all');
  const [commissionFilterStatus, setCommissionFilterStatus] = useState<string>('all');
  const [commissionSearchQuery, setCommissionSearchQuery] = useState<string>('');

  // Modals for Commission
  const [settlePayoutItem, setSettlePayoutItem] = useState<CommissionRecord | null>(null);
  const [settlePayoutNote, setSettlePayoutNote] = useState<string>('');
  const [settlePayoutProofPreview, setSettlePayoutProofPreview] = useState<string | null>(null);
  const [settlePayoutProofFileName, setSettlePayoutProofFileName] = useState<string>('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [viewingPayoutBill, setViewingPayoutBill] = useState<PayoutBillData | null>(null);

  const [editSplitItem, setEditSplitItem] = useState<CommissionRecord | null>(null);
  const [customSplitInput, setCustomSplitInput] = useState<string>('');
  const [isSubmittingSplit, setIsSubmittingSplit] = useState(false);

  const [bulkSettleFreelancer, setBulkSettleFreelancer] = useState<FreelancerCommissionSummary | null>(null);
  const [bulkSettleNote, setBulkSettleNote] = useState<string>('');
  const [isSubmittingBulkSettle, setIsSubmittingBulkSettle] = useState(false);

  // Lightbox & Mobile FAB
  const [activeProofLightbox, setActiveProofLightbox] = useState<{ url: string; title: string } | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  // --- 1-CLICK CSV EXPORTS ---
  const handleExportBillingCSV = () => {
    if (orders.length === 0) {
      setError('No orders available to export.');
      return;
    }
    const headers = [
      'Order Code',
      'Client Name',
      'Phone',
      'Service',
      'Invoiced (INR)',
      'Paid (INR)',
      'Balance (INR)',
      'Payment Status',
      'Proof Screenshot Attached',
    ];
    const rows = orders.map(o => {
      const price = Number(o.price) || 0;
      const paid = Number(o.paid) || 0;
      const balance = Math.max(0, price - paid);
      const payStatus = getPaymentStatus(price, paid);
      return [
        o.code,
        o.customer_name,
        `+91 ${o.phone}`,
        o.service,
        price,
        paid,
        balance,
        payStatus.label,
        o.payment_proof ? 'Yes' : 'No',
      ];
    });
    exportToCSV(`cutline-billing-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    notifySuccess('Billing registry exported to CSV successfully.');
  };

  const handleExportCommissionCSV = () => {
    if (commissionRecords.length === 0) {
      setError('No commission records available to export.');
      return;
    }
    const headers = [
      'Type',
      'Code',
      'Client Name',
      'Service',
      'Editor Name',
      'Client Paid (INR)',
      'Total Project Value (INR)',
      'Commission Rate',
      'Agency Share (INR)',
      'Editor Share (INR)',
      'Payout Status',
      'Settlement Date',
      'Payout Note',
      'Proof Screenshot Verified',
    ];
    const rows = commissionRecords.map(r => [
      r.type.toUpperCase(),
      r.code,
      r.clientName,
      r.service,
      r.assigneeName,
      r.clientPaid,
      r.totalPrice,
      `${r.commissionRate}%`,
      r.adminShare,
      r.freelancerShare,
      r.payoutStatus,
      r.payoutAt ? formatDate(r.payoutAt) : '-',
      r.payoutNote || '-',
      r.payoutProof ? 'Yes' : 'No',
    ]);
    exportToCSV(`cutline-commission-ledger-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    notifySuccess('Commission ledger exported to CSV successfully.');
  };

  // --- 1-TAP WHATSAPP SHARE ---
  const [sharingBillCode, setSharingBillCode] = useState<string | null>(null);
  const [sharingPayoutCode, setSharingPayoutCode] = useState<string | null>(null);
  const [activeShareHelper, setActiveShareHelper] = useState<{
    recipient: string;
    message: string;
    type: 'client' | 'payout';
  } | null>(null);

  const handleWhatsAppShareBill = async (order: OrderItem) => {
    const paid = Number(order.paid) || 0;
    if (paid <= 0) {
      setError(`Cannot share bill for Order ${order.code}: Payment is unpaid. Bill sharing is only active when partial or full payment is done.`);
      return;
    }

    try {
      setSharingBillCode(order.code);
      notifySuccess(`Generating official bill PDF for ${order.code}...`);
      const res = await sendBillPdfViaWhatsApp(order, config);
      setActiveShareHelper({
        recipient: order.customer_name || 'Client',
        message: res.customMessage,
        type: 'client',
      });
      if (res.sharedWithFile) {
        notifySuccess(`PDF bill attached! Tap "Add a message..." and Paste in WhatsApp.`);
      } else {
        notifySuccess(`Bill PDF saved & WhatsApp opened for ${order.code}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to share bill PDF via WhatsApp.');
    } finally {
      setSharingBillCode(null);
    }
  };

  const handleWhatsAppSharePayout = async (rec: CommissionRecord) => {
    try {
      setSharingPayoutCode(rec.code);
      notifySuccess(`Generating official payout settlement PDF for ${rec.assigneeName}...`);
      const teamMember = team.find(m => m.id === rec.assigneeId);
      const phone = teamMember?.phone || '';
      const payoutBillData: PayoutBillData = {
        code: rec.code,
        type: rec.type,
        title: rec.title,
        customerName: rec.clientName,
        service: rec.service,
        freelancerName: rec.assigneeName,
        freelancerPhone: phone,
        clientPaid: rec.clientPaid,
        commissionRate: rec.commissionRate,
        adminShare: rec.adminShare,
        freelancerShare: rec.freelancerShare,
        payoutStatus: rec.payoutStatus,
        payoutAt: rec.payoutAt,
        payoutNote: rec.payoutNote,
        payoutProof: rec.payoutProof,
      };

      const res = await sendPayoutBillViaWhatsApp(payoutBillData, phone);
      setActiveShareHelper({
        recipient: rec.assigneeName,
        message: res.customMessage,
        type: 'payout',
      });
      if (res.sharedWithFile) {
        notifySuccess(`Payout bill PDF attached! Tap "Add a message..." and Paste in WhatsApp.`);
      } else {
        notifySuccess(`Payout bill PDF saved & WhatsApp opened for ${rec.assigneeName}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to share payout bill via WhatsApp.');
    } finally {
      setSharingPayoutCode(null);
    }
  };

  // Manual order form
  const [manualOrder, setManualOrder] = useState({
    customer_name: '',
    phone: '',
    email: '',
    service: 'Video Editing',
    deadline: '',
    budget: '',
    brief: '',
    link: '',
    price: '',
    assignee_id: '',
  });

  // Task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: '',
    assignee_id: '',
    price: '',
    paid: '',
  });

  // Service form
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    base_price: 3500,
    price_text: '',
    blurb: '',
    points: '',
    sort: 1,
  });

  // Team member form
  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });

  const updateManualOrderService = (nextService: string) => {
    const autoPrice = resolveServicePrice(nextService, services);
    setManualOrder(prev => ({
      ...prev,
      service: nextService,
      price: String(autoPrice),
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const adminRes = await apiFetch('/api/admin/data');
      if (!adminRes.ok) {
        const errData = await adminRes.json().catch(() => ({}));
        if (adminRes.status === 401 || adminRes.status === 403) {
          throw new Error('Admin authorization required. Please login with your administrator credentials.');
        }
        throw new Error(errData.error || `Unable to load dashboard data (${adminRes.status})`);
      }

      const adminData = await adminRes.json();
      setOrders(adminData.orders || []);
      setTasks(adminData.tasks || []);
      setTeam(adminData.team || []);
      setStats(adminData.stats || null);

      try {
        const servRes = await apiFetch('/api/services');
        if (servRes.ok) {
          const servData = await servRes.json();
          if (servData.services && servData.services.length > 0) {
            setServices(servData.services);
          }
        }
      } catch {
        // preserve current services state
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // --- ORDER ACTIONS ---
  const handleUpdateOrder = async (code: string, fields: Partial<OrderItem>) => {
    try {
      const res = await apiFetch(`/api/admin/orders/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error('Failed to update order');
      await fetchData();
      notifySuccess(`Order ${code} updated successfully.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteOrder = (code: string, customerName?: string) => {
    setConfirmDelete({
      type: 'order',
      id: code,
      name: customerName,
      title: `Delete Order ${code}?`,
      description: `Are you sure you want to permanently delete order ${code}${customerName ? ` for ${customerName}` : ''}? This order will be completely purged from the system and billing registries.`,
    });
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualOrder),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      setShowAddOrderModal(false);
      setManualOrder({
        customer_name: '',
        phone: '',
        email: '',
        service: 'Video Editing',
        deadline: '',
        budget: '',
        brief: '',
        link: '',
        price: '',
        assignee_id: '',
      });
      await fetchData();
      notifySuccess(`Order ${data.code} created manually.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- RECORD PAYMENT & PROOF ---
  const openPaymentModal = (order: OrderItem) => {
    const price = Number(order.price) || 0;
    const paid = Number(order.paid) || 0;
    const balance = Math.max(0, price - paid);
    setShowPaymentModal(order);
    setPaymentAmount(balance > 0 ? String(balance) : '');
    setPaymentMode('UPI');
    setPaymentRefNote(order.payment_note || '');
    setPaymentProofPreview(order.payment_proof || null);
    setPaymentProofFileName('');
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    setPaymentUploading(true);
    try {
      setPaymentProofFileName(file.name);
      const compressedData = await compressImageFile(file, 1280, 0.82);
      setPaymentProofPreview(compressedData);
    } catch {
      setError('Failed to compress image. Please try another file.');
    } finally {
      setPaymentUploading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    try {
      setPaymentUploading(true);
      const addAmt = Number(paymentAmount) || 0;

      const res = await apiFetch(`/api/admin/orders/${showPaymentModal.code}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: addAmt,
          payment_mode: paymentMode,
          payment_note: paymentRefNote,
          proof_image: paymentProofPreview && paymentProofPreview.startsWith('data:') ? paymentProofPreview : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      setShowPaymentModal(null);
      setPaymentAmount('');
      setPaymentProofPreview(null);
      setPaymentProofFileName('');
      await fetchData();
      notifySuccess(`Payment of ${formatINR(addAmt)} & transaction proof saved for ${showPaymentModal.code}.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaymentUploading(false);
    }
  };

  // --- TASK ACTIONS ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create custom task');

      setShowAddTaskModal(false);
      setNewTask({
        title: '',
        description: '',
        deadline: '',
        assignee_id: '',
        price: '',
        paid: '',
      });
      await fetchData();
      notifySuccess(`Task ${data.code} created successfully.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateTask = async (code: string, fields: Partial<TaskItem>) => {
    try {
      const res = await apiFetch(`/api/admin/tasks/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error('Failed to update task');
      await fetchData();
      notifySuccess(`Task ${code} updated.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTask = (code: string, taskTitle?: string) => {
    setConfirmDelete({
      type: 'task',
      id: code,
      name: taskTitle,
      title: `Delete Task ${code}?`,
      description: `Are you sure you want to permanently delete task "${taskTitle || code}"? This cannot be undone.`,
    });
  };

  // --- TEAM ACTIONS ---
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add team member');

      setShowAddMemberModal(false);
      setNewMember({ name: '', phone: '', email: '', password: '' });
      await fetchData();
      notifySuccess('New team member added successfully.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetPassModal) return;
    try {
      const res = await apiFetch(`/api/admin/team/${showResetPassModal.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setShowResetPassModal(null);
      setNewPassword('');
      notifySuccess(`Password reset for ${showResetPassModal.name}.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = (id: string, name: string) => {
    setConfirmDelete({
      type: 'team',
      id,
      name,
      title: `Remove ${name}?`,
      description: `Are you sure you want to remove team member ${name}? Their active sessions will terminate and their tasks/orders will be set to Unassigned.`,
    });
  };

  // --- SERVICE ACTIONS ---
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pointsArray = serviceForm.points.split('\n').filter(Boolean);
      const url = editingService ? `/api/admin/services/${editingService.id}` : '/api/admin/services';
      const method = editingService ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: serviceForm.name,
          base_price: Number(serviceForm.base_price) || 0,
          price_text: serviceForm.price_text,
          blurb: serviceForm.blurb,
          points: pointsArray,
          sort: Number(serviceForm.sort) || 1,
        }),
      });

      if (!res.ok) throw new Error('Failed to save service');
      setShowAddServiceModal(false);
      setEditingService(null);
      setServiceForm({ name: '', base_price: 3500, price_text: '', blurb: '', points: '', sort: 1 });
      await fetchData();
      onServicesUpdated();
      notifySuccess('Service catalog updated.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteService = (id: string, name?: string) => {
    setConfirmDelete({
      type: 'service',
      id,
      name,
      title: `Delete Service "${name || id}"?`,
      description: 'Are you sure you want to remove this service from the public website?',
    });
  };

  const handleExecuteDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      if (confirmDelete.type === 'order') {
        const res = await apiFetch(`/api/admin/orders/${encodeURIComponent(confirmDelete.id)}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to delete order');
        }
        await fetchData();
        notifySuccess(`Order ${confirmDelete.id} deleted successfully.`);
      } else if (confirmDelete.type === 'task') {
        const res = await apiFetch(`/api/admin/tasks/${encodeURIComponent(confirmDelete.id)}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to delete task');
        }
        await fetchData();
        notifySuccess(`Task ${confirmDelete.id} deleted successfully.`);
      } else if (confirmDelete.type === 'team') {
        const res = await apiFetch(`/api/admin/team/${encodeURIComponent(confirmDelete.id)}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to remove team member');
        }
        await fetchData();
        notifySuccess(`Team member ${confirmDelete.name || ''} removed.`);
      } else if (confirmDelete.type === 'service') {
        const res = await apiFetch(`/api/admin/services/${encodeURIComponent(confirmDelete.id)}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to delete service');
        }
        await fetchData();
        onServicesUpdated();
        notifySuccess('Service removed successfully.');
      }
      setConfirmDelete(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- BACKUP & RESTORE ACTIONS ---
  const fetchSnapshots = async () => {
    try {
      setLoadingSnapshots(true);
      const res = await apiFetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (err: any) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      const res = await apiFetch('/api/admin/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create backup');
      notifySuccess(`Safe snapshot created: ${data.filename}`);
      await fetchSnapshots();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenRestoreModal = (snapshot: { filename: string; size: number; createdAt: string }) => {
    setShowRestoreModal(snapshot);
    setRestorePassword('');
    setRestoreError(null);
    setShowRestorePasswordText(false);
  };

  const handleConfirmRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRestoreModal) return;
    if (!restorePassword.trim()) {
      setRestoreError('Please enter your admin password to authorize restore.');
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);

    try {
      const res = await apiFetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: showRestoreModal.filename,
          password: restorePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Restore failed.');
      }

      setShowRestoreModal(null);
      setRestorePassword('');
      notifySuccess(`Database restored to snapshot: ${showRestoreModal.filename}`);
      // Refresh dashboard data to display the restored state
      await fetchData();
      await fetchSnapshots();
      if (onServicesUpdated) onServicesUpdated();
    } catch (err: any) {
      setRestoreError(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSnapshot = async (filename: string) => {
    try {
      const res = await apiFetch(`/api/admin/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete snapshot');
      }
      notifySuccess(`Snapshot ${filename} deleted.`);
      await fetchSnapshots();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchSnapshots();
    }
  }, [activeTab]);

  // --- COMMISSION & PAYOUT ACTIONS ---
  const fetchCommissionData = async () => {
    try {
      setLoadingCommission(true);
      const res = await apiFetch('/api/admin/commission');
      if (res.ok) {
        const data = await res.json();
        setCommissionRecords(data.records || []);
        setFreelancerSummaries(data.freelancerSummaries || []);
        setCommissionStats(data.stats || null);
        setDefaultRate(data.defaultRate || 30);
        setNewDefaultRateInput(String(data.defaultRate || 30));
      }
    } catch (err: any) {
      console.error('Failed to load commission data:', err);
    } finally {
      setLoadingCommission(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'commission') {
      fetchCommissionData();
    }
  }, [activeTab]);

  const handleUpdateDefaultRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = Number(newDefaultRateInput);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      setError('Default agency commission share must be between 0% and 100%.');
      return;
    }
    try {
      const res = await apiFetch('/api/admin/commission/rate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: rateNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update commission rate');
      setDefaultRate(rateNum);
      setIsEditingDefaultRate(false);
      notifySuccess(`Default agency commission share updated to ${rateNum}%.`);
      await fetchCommissionData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateOrderSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSplitItem) return;
    setIsSubmittingSplit(true);
    try {
      const rateVal = customSplitInput.trim() === '' ? null : Number(customSplitInput);
      const res = await apiFetch(`/api/admin/commission/split/${editSplitItem.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_rate: rateVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update split');
      setEditSplitItem(null);
      notifySuccess(`Custom split updated for ${editSplitItem.code}.`);
      await fetchCommissionData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingSplit(false);
    }
  };

  const handlePayoutProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    setIsSubmittingPayout(true);
    try {
      setSettlePayoutProofFileName(file.name);
      const compressedData = await compressImageFile(file, 1280, 0.82);
      setSettlePayoutProofPreview(compressedData);
    } catch {
      setError('Failed to compress image. Please choose another file.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleUpdatePayoutStatus = async (
    item: CommissionRecord,
    status: 'settled' | 'pending',
    note?: string,
    proofImage?: string | null
  ) => {
    try {
      setIsSubmittingPayout(true);
      const res = await apiFetch(`/api/admin/commission/payout/${item.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          note,
          proof_image: proofImage && proofImage.startsWith('data:') ? proofImage : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payout status');
      setSettlePayoutItem(null);
      setSettlePayoutProofPreview(null);
      setSettlePayoutProofFileName('');
      notifySuccess(`Payout marked as ${status} for ${item.code} with verified proof attached.`);
      await fetchCommissionData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleBulkSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSettleFreelancer) return;
    setIsSubmittingBulkSettle(true);
    try {
      const res = await apiFetch(`/api/admin/commission/settle-all/${bulkSettleFreelancer.freelancerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: bulkSettleNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed bulk settlement');
      setBulkSettleFreelancer(null);
      setBulkSettleNote('');
      notifySuccess(`All pending payouts settled for ${bulkSettleFreelancer.freelancerName}.`);
      await fetchCommissionData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingBulkSettle(false);
    }
  };

  const orderStatuses: OrderStatus[] = ['New', 'Assigned', 'In progress', 'Review', 'Delivered', 'Paid'];
  const taskStatuses: TaskStatus[] = ['Assigned', 'In progress', 'Review', 'Delivered', 'Paid'];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full min-w-0 overflow-hidden">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Admin & Owner Console
            </span>
            <span className="text-xs text-slate-500">
              Cutline Studio Central
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Agency Management Hub
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddOrderModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 font-bold ml-2">
            ×
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
            ×
          </button>
        </div>
      )}

      {/* Tabs Navigation - Direct Access Grid (No horizontal slide/scroll) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-1.5 border-b border-slate-800/80 py-4 mt-2">
        {[
          { id: 'overview', label: '1. Overview', icon: <LayoutDashboard className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'orders', label: `2. Orders (${orders.length})`, icon: <ShoppingCart className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'tasks', label: `3. Tasks (${tasks.length})`, icon: <CheckSquare className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'services', label: `4. Services (${services.length})`, icon: <Sparkles className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'billing', label: '5. Billing', icon: <Receipt className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'team', label: `6. Team (${team.length})`, icon: <Users className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'commission', label: '7. Commission', icon: <Percent className="w-3.5 h-3.5 shrink-0" /> },
          { id: 'backup', label: '8. Backup & Restore', icon: <Database className="w-3.5 h-3.5 shrink-0" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center sm:justify-start gap-1.5 transition-all cursor-pointer min-w-0 overflow-hidden ${
              activeTab === tab.id
                ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-600/25 dark:text-purple-200 dark:border-purple-500/50 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80'
            }`}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8 animate-in fade-in duration-200 min-w-0">
          {loading && orders.length === 0 ? (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="h-3 w-16 bg-slate-800 rounded skeleton-shimmer" />
                    <div className="h-7 w-24 bg-slate-800 rounded skeleton-shimmer" />
                  </div>
                ))}
              </div>
              <div className="rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3">
                <div className="h-5 w-48 bg-slate-800 rounded skeleton-shimmer" />
                <div className="h-4 w-72 bg-slate-800/60 rounded skeleton-shimmer" />
                <div className="space-y-3 pt-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-slate-950/60 border border-slate-800/60 skeleton-shimmer" />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Key Metric Cards with Ambient Glows */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-4">
                <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden after:absolute after:-top-8 after:-right-8 after:w-24 after:h-24 after:bg-blue-500/10 after:blur-xl after:rounded-full after:pointer-events-none tap-active">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">New Orders</span>
                  <div className="text-xl sm:text-2xl font-black text-blue-400 mt-1 truncate">{stats?.newCount || 0}</div>
                </div>
            <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden after:absolute after:-top-8 after:-right-8 after:w-24 after:h-24 after:bg-amber-500/10 after:blur-xl after:rounded-full after:pointer-events-none tap-active">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">In Progress</span>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 truncate">{stats?.inProgressCount || 0}</div>
            </div>
            <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden after:absolute after:-top-8 after:-right-8 after:w-24 after:h-24 after:bg-emerald-500/10 after:blur-xl after:rounded-full after:pointer-events-none tap-active">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Delivered</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 truncate">{stats?.deliveredCount || 0}</div>
            </div>
            <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden after:absolute after:-top-8 after:-right-8 after:w-24 after:h-24 after:bg-purple-500/10 after:blur-xl after:rounded-full after:pointer-events-none tap-active">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Total Value</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-1 truncate">{formatINR(stats?.totalOrderValue)}</div>
            </div>
            <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden after:absolute after:-top-8 after:-right-8 after:w-24 after:h-24 after:bg-emerald-500/15 after:blur-xl after:rounded-full after:pointer-events-none tap-active">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Collected</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 truncate">{formatINR(stats?.totalCollected)}</div>
            </div>
            <div className="relative p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden after:absolute after:-top-8 after:-right-8 after:w-24 after:h-24 after:bg-rose-500/10 after:blur-xl after:rounded-full after:pointer-events-none tap-active">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">Balance Due</span>
              <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1 truncate">{formatINR(stats?.balanceDue)}</div>
            </div>
          </div>

          {/* New Orders Queue with Quick Assign Dropdown */}
          <div className="rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800 p-3.5 sm:p-6 space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Unassigned & New Orders Queue</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Orders submitted through the client website requiring assignment to a freelancer.
                </p>
              </div>
              <span className="self-start sm:self-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap shrink-0">
                {orders.filter(o => o.status === 'New').length} Pending
              </span>
            </div>

            {orders.filter(o => o.status === 'New').length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                🎉 All new orders have been assigned to team members!
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {orders
                  .filter(o => o.status === 'New')
                  .map(order => (
                    <div
                      key={order.code}
                      className="py-3.5 sm:py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 min-w-0"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                          <span className="font-mono font-bold text-white text-sm shrink-0">{order.code}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold break-words">
                            {order.service}
                          </span>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            Deadline: <strong className="text-slate-300">{formatDate(order.deadline)}</strong>
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 break-words">
                          Client: <strong className="text-white">{order.customer_name}</strong> (+91 {order.phone})
                        </div>
                        {order.brief && (
                          <div className="text-xs text-slate-400 line-clamp-2 italic break-words max-w-xl">
                            &quot;{order.brief}&quot;
                          </div>
                        )}
                      </div>

                      {/* Instant Assign Dropdown & Action */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full xl:w-auto shrink-0 pt-2.5 xl:pt-0 border-t xl:border-t-0 border-slate-800/80">
                        <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
                          <span className="text-xs text-slate-400 whitespace-nowrap shrink-0 font-medium">Assign To:</span>
                          <select
                            defaultValue=""
                            onChange={e => {
                              if (e.target.value) {
                                handleUpdateOrder(order.code, { assigneeId: e.target.value });
                              }
                            }}
                            className="w-full sm:w-48 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 truncate cursor-pointer"
                          >
                            <option value="" disabled>
                              Select Freelancer...
                            </option>
                            {team.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.activeCount || 0} active)
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => setSelectedBriefOrder(order)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 transition-colors text-center shrink-0 cursor-pointer"
                        >
                          View Brief
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: ORDERS TABLE */}
      {activeTab === 'orders' && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">All Client Orders</h3>
              <p className="text-xs text-slate-400">
                Manage status, assign freelancers, set pricing, view invoices, and track delivery.
              </p>
            </div>
            <button
              onClick={() => setShowAddOrderModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Order Manually</span>
            </button>
          </div>

          {/* Mobile Orders Feed (< md) - ZERO horizontal scroll */}
          <div className="space-y-3.5 md:hidden">
            {orders.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs rounded-xl bg-slate-900/60 border border-slate-800">
                No orders registered yet.
              </div>
            ) : (
              orders.map(order => {
                const badge = getStatusBadge(order.status);
                const price = Number(order.price) || 0;
                const paid = Number(order.paid) || 0;

                return (
                  <div
                    key={order.code}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 min-w-0 shadow-lg"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-white text-sm">{order.code}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold break-words">
                            {order.service}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white mt-1 break-words">
                          {order.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          +91 {order.phone}
                        </div>
                      </div>

                      {/* Status Select */}
                      <select
                        value={order.status}
                        onChange={e => handleUpdateOrder(order.code, { status: e.target.value as any })}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border} bg-slate-950 focus:outline-none shrink-0 cursor-pointer`}
                      >
                        {orderStatuses.map(s => (
                          <option key={s} value={s} className="bg-slate-900 text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Details Row: Deadline, Asset Link, Assignee */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">Deadline</span>
                        <span className="text-slate-300 font-medium">{formatDate(order.deadline)}</span>
                        {order.link && (
                          <a
                            href={order.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline mt-0.5 block"
                          >
                            <span>Assets</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">Assignee</span>
                        <select
                          value={order.assignee_id || ''}
                          onChange={e => handleUpdateOrder(order.code, { assigneeId: e.target.value || null })}
                          className="w-full mt-0.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none truncate"
                        >
                          <option value="">Unassigned</option>
                          {team.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Financial summary: Price & Paid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 items-center">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">Price (₹)</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-slate-500 font-mono text-xs">₹</span>
                          <input
                            key={`m-${order.code}-${price}`}
                            type="number"
                            defaultValue={price}
                            onKeyDown={e => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            onBlur={e => {
                              const val = Number(e.target.value) || 0;
                              if (val !== price) handleUpdateOrder(order.code, { price: val });
                            }}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold block">Paid</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-semibold text-emerald-400 text-xs">{formatINR(paid)}</span>
                          <button
                            onClick={() => openPaymentModal(order)}
                            className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                          >
                            + Pay
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedBriefOrder(order)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs text-center"
                      >
                        Read Brief
                      </button>
                      <button
                        onClick={() => onViewInvoice(order)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-xs text-center"
                      >
                        View Bill
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.code, order.customer_name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Delete Order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop & Tablet Table (shown on md+ screens) */}
          <div className="hidden md:block border border-slate-800 rounded-2xl bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="overflow-x-auto no-scrollbar scrollbar-none">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Code / Service</th>
                    <th className="py-3.5 px-4">Client Contact</th>
                    <th className="py-3.5 px-4">Deadline & Link</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Assignee</th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span>Price (₹)</span>
                        <span className="text-[9px] lowercase font-normal text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-1 py-0.5 rounded">
                          editable
                        </span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">Paid (₹)</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No orders registered yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map(order => {
                      const badge = getStatusBadge(order.status);
                      const price = Number(order.price) || 0;
                      const paid = Number(order.paid) || 0;
                      return (
                        <tr key={order.code} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-white">{order.code}</div>
                            <div className="text-[11px] text-indigo-400 font-medium">{order.service}</div>
                            <button
                              onClick={() => setSelectedBriefOrder(order)}
                              className="text-[10px] text-slate-400 hover:text-white underline mt-0.5 block"
                            >
                              Read brief
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{order.customer_name}</div>
                            <div className="text-slate-400">+91 {order.phone}</div>
                            {order.email && <div className="text-slate-500 text-[10px]">{order.email}</div>}
                          </td>

                          <td className="py-3.5 px-4">
                            <div>{formatDate(order.deadline)}</div>
                            {order.link && (
                              <a
                                href={order.link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline mt-0.5"
                              >
                                <span>Assets Link</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={order.status}
                              onChange={e => handleUpdateOrder(order.code, { status: e.target.value as any })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border} bg-slate-950 focus:outline-none`}
                            >
                              {orderStatuses.map(s => (
                                <option key={s} value={s} className="bg-slate-900 text-white">
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={order.assignee_id || ''}
                              onChange={e => handleUpdateOrder(order.code, { assigneeId: e.target.value || null })}
                              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                            >
                              <option value="">Unassigned</option>
                              {team.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 font-mono text-xs">₹</span>
                              <input
                                key={`${order.code}-${price}`}
                                type="number"
                                defaultValue={price}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                onBlur={e => {
                                  const val = Number(e.target.value) || 0;
                                  if (val !== price) handleUpdateOrder(order.code, { price: val });
                                }}
                                className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
                                title="Click to edit order price. Saves on blur or Enter."
                              />
                            </div>
                            {price === 0 && (
                              <button
                                onClick={() => {
                                  const autoP = resolveServicePrice(order.service, services);
                                  handleUpdateOrder(order.code, { price: autoP });
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline mt-1 block"
                                title="Auto-fill with standard rate for this service"
                              >
                                Auto: {formatINR(resolveServicePrice(order.service, services))}
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-emerald-400">{formatINR(paid)}</span>
                              <button
                                onClick={() => openPaymentModal(order)}
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                title="Add payment / upload proof screenshot"
                              >
                                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                              {order.payment_proof && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5"
                                  title="Transaction screenshot proof archived in transaction proofs"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Proof
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onViewInvoice(order)}
                                className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-[11px]"
                                title="View Bill"
                              >
                                View Bill
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.code, order.customer_name)}
                                className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM TASKS */}
      {activeTab === 'tasks' && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Agency Internal Tasks</h3>
              <p className="text-xs text-slate-400">
                Tasks created directly by the admin (not from the public website) with internal price & payment tracking.
              </p>
            </div>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Task</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                No custom tasks added yet. Click &quot;Add Custom Task&quot; above.
              </div>
            ) : (
              tasks.map(task => {
                const badge = getStatusBadge(task.status);
                const price = Number(task.price) || 0;
                const paid = Number(task.paid) || 0;
                const balance = Math.max(0, price - paid);
                return (
                  <div
                    key={task.code}
                    className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-purple-400">{task.code}</span>
                        <select
                          value={task.status}
                          onChange={e => handleUpdateTask(task.code, { status: e.target.value as any })}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border} bg-slate-950 focus:outline-none`}
                        >
                          {taskStatuses.map(s => (
                            <option key={s} value={s} className="bg-slate-900 text-white">
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <h4 className="font-bold text-white text-base">{task.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                        {task.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Assignee:</span>
                        <select
                          value={task.assignee_id || ''}
                          onChange={e => handleUpdateTask(task.code, { assignee_id: e.target.value || null })}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                        >
                          <option value="">Unassigned</option>
                          {team.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>Deadline:</span>
                        <strong className="text-slate-200">{formatDate(task.deadline)}</strong>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 text-center">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Price</div>
                          <div className="font-bold text-white text-xs">{formatINR(price)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Paid</div>
                          <div className="font-bold text-emerald-400 text-xs">{formatINR(paid)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Balance</div>
                          <div className="font-bold text-rose-400 text-xs">{formatINR(balance)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleDeleteTask(task.code, task.title)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SERVICES MANAGEMENT */}
      {activeTab === 'services' && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Website Services & Offerings</h3>
              <p className="text-xs text-slate-400">
                These cards and prices are displayed publicly to visitors on the homepage.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingService(null);
                setServiceForm({
                  name: '',
                  base_price: 3500,
                  price_text: 'from ₹3,500',
                  blurb: '',
                  points: '',
                  sort: services.length + 1,
                });
                setShowAddServiceModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <div
                key={service.id}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-slate-500">Sort: #{service.sort}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingService(service);
                          setServiceForm({
                            name: service.name,
                            base_price: service.base_price || 0,
                            price_text: service.price_text,
                            blurb: service.blurb,
                            points: service.points.join('\n'),
                            sort: service.sort,
                          });
                          setShowAddServiceModal(true);
                        }}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id, service.name)}
                        className="p-1.5 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete Service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xl font-bold text-white">{service.name}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1 mb-3">
                    <span className="text-base font-extrabold text-indigo-400">
                      {service.price_text}
                    </span>
                    {service.base_price ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                        Default Quote: {formatINR(service.base_price)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{service.blurb}</p>

                  <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs text-slate-300">
                    {service.points.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: BILLING & INVOICES */}
      {activeTab === 'billing' && (
        <div className="mt-6 sm:mt-8 space-y-6 animate-in fade-in duration-200 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Billing & Payments Registry</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Track invoiced amounts, record client payments, and generate official bills.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBillingCSV}
              className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm tap-active"
              title="Export all client invoices and payments to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block truncate">Total Invoiced</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-1 truncate">{formatINR(stats?.totalOrderValue)}</div>
            </div>
            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block truncate">Total Collected</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 truncate">{formatINR(stats?.totalCollected)}</div>
            </div>
            <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800 min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block truncate">Outstanding Balance</span>
              <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1 truncate">{formatINR(stats?.balanceDue)}</div>
            </div>
          </div>

          {/* Mobile Invoices & Billing Cards (shown on small screens & Android devices - ZERO horizontal scrolling) */}
          <div className="space-y-3.5 md:hidden">
            {orders.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs rounded-xl bg-slate-900/60 border border-slate-800">
                No billing records found.
              </div>
            ) : (
              orders.map(order => {
                const price = Number(order.price) || 0;
                const paid = Number(order.paid) || 0;
                const balance = Math.max(0, price - paid);
                const payStatus = getPaymentStatus(price, paid);

                return (
                  <div
                    key={order.code}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 min-w-0 shadow-lg"
                  >
                    {/* Top Row: Order Code, Invoice ID, and Status */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-white text-sm">{order.code}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            INV-{order.code}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white mt-1 break-words">
                          {order.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          +91 {order.phone}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${payStatus.color}`}>
                          {payStatus.label}
                        </span>
                        {order.payment_proof && (
                          <button
                            type="button"
                            onClick={() => setActiveProofLightbox({ url: order.payment_proof!, title: `Payment Proof - ${order.code} (${order.customer_name})` })}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 cursor-pointer tap-active transition-colors"
                            title="Click to view payment proof screenshot"
                          >
                            <ZoomIn className="w-2.5 h-2.5" /> Proof
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Financial Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-1.5 py-2 px-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-center">
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 uppercase font-medium truncate">Invoiced</div>
                        <div className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">{formatINR(price)}</div>
                      </div>
                      <div className="min-w-0 border-x border-slate-800/80 px-1">
                        <div className="text-[10px] text-slate-400 uppercase font-medium truncate">Paid</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-400 truncate mt-0.5">{formatINR(paid)}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 uppercase font-medium truncate">Balance</div>
                        <div className={`text-xs sm:text-sm font-bold truncate mt-0.5 ${balance > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {formatINR(balance)}
                        </div>
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => openPaymentModal(order)}
                        className="flex-1 min-w-[85px] py-2 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 active:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-semibold text-xs text-center transition-all cursor-pointer tap-active"
                      >
                        + Payment
                      </button>
                      <button
                        onClick={() => onViewInvoice(order)}
                        className="flex-1 min-w-[75px] py-2 px-2.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 active:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-semibold text-xs text-center transition-all cursor-pointer tap-active"
                      >
                        View Bill
                      </button>
                      {paid <= 0 ? (
                        <button
                          type="button"
                          disabled
                          className="py-2 px-3 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-500 font-medium text-xs inline-flex items-center justify-center gap-1 cursor-not-allowed opacity-50"
                          title="Disabled: Bill sharing is only active when partial or full payment is received"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={sharingBillCode === order.code}
                          onClick={() => handleWhatsAppShareBill(order)}
                          className="py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 active:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-semibold text-xs inline-flex items-center justify-center gap-1 transition-all cursor-pointer tap-active disabled:opacity-60"
                          title="Send bill PDF document and custom message via WhatsApp"
                        >
                          <Share2 className={`w-3.5 h-3.5 ${sharingBillCode === order.code ? 'animate-spin' : ''}`} />
                          <span>{sharingBillCode === order.code ? 'Sending...' : 'Share'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOrder(order.code, order.customer_name)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors cursor-pointer tap-active"
                        title="Delete Order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop & Tablet Table (shown on md+ screens) */}
          <div className="hidden md:block border border-slate-800 rounded-2xl bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar scrollbar-none">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-3.5 px-4">Order / Invoice #</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Invoiced</th>
                    <th className="py-3.5 px-4">Paid</th>
                    <th className="py-3.5 px-4">Balance</th>
                    <th className="py-3.5 px-4">Payment Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {orders.map(order => {
                    const price = Number(order.price) || 0;
                    const paid = Number(order.paid) || 0;
                    const balance = Math.max(0, price - paid);
                    const payStatus = getPaymentStatus(price, paid);
                    return (
                      <tr key={order.code} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-white">{order.code}</div>
                          <div className="text-[10px] text-slate-500">INV-{order.code}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{order.customer_name}</div>
                          <div className="text-slate-400">+91 {order.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">{formatINR(price)}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-400">{formatINR(paid)}</td>
                        <td className="py-3.5 px-4 font-semibold text-rose-400">{formatINR(balance)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${payStatus.color}`}
                            >
                              {payStatus.label}
                            </span>
                            {order.payment_proof && (
                              <button
                                type="button"
                                onClick={() => setActiveProofLightbox({ url: order.payment_proof!, title: `Payment Proof - ${order.code} (${order.customer_name})` })}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 cursor-pointer transition-colors"
                                title="Click to view payment proof screenshot"
                              >
                                <ZoomIn className="w-2.5 h-2.5" /> Proof
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openPaymentModal(order)}
                              className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] hover:scale-102 transition-all cursor-pointer"
                            >
                              Add Payment
                            </button>
                            <button
                              onClick={() => onViewInvoice(order)}
                              className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-[11px] cursor-pointer"
                            >
                              View Bill
                            </button>
                            {paid <= 0 ? (
                              <button
                                type="button"
                                disabled
                                className="px-2.5 py-1 rounded bg-slate-800/40 text-slate-500 border border-slate-800 font-medium text-[11px] inline-flex items-center gap-1 cursor-not-allowed opacity-50"
                                title="Disabled: Bill sharing is only active when partial or full payment is received"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={sharingBillCode === order.code}
                                onClick={() => handleWhatsAppShareBill(order)}
                                className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                                title="Send bill PDF document and custom message via WhatsApp"
                              >
                                <Share2 className={`w-3 h-3 ${sharingBillCode === order.code ? 'animate-spin' : ''}`} />
                                <span>{sharingBillCode === order.code ? 'Sending...' : 'WhatsApp'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(order.code, order.customer_name)}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TEAM / FREELANCERS */}
      {activeTab === 'team' && (
        <div className="mt-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Freelancers & Creative Team</h3>
              <p className="text-xs text-slate-400">
                Manage team members, reset passwords, and monitor assigned project loads.
              </p>
            </div>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Freelancer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map(member => (
              <div
                key={member.id}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setShowResetPassModal(member);
                          setNewPassword('');
                        }}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        className="p-1.5 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                        title="Remove Freelancer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-lg font-bold text-white">{member.name}</h4>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Phone: {member.phone ? `+91 ${member.phone}` : '-'}
                  </div>
                  {member.email && (
                    <div className="text-xs text-slate-400">Email: {member.email}</div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Assigned</div>
                    <div className="text-base font-bold text-white">{member.assignedCount || 0}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Active</div>
                    <div className="text-base font-bold text-amber-400">{member.activeCount || 0}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Value</div>
                    <div className="text-xs font-bold text-emerald-400 mt-1">
                      {formatINR(member.orderValue)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: COMMISSION & PAYOUT LEDGER */}
      {activeTab === 'commission' && (
        <div className="mt-8 space-y-8 animate-in fade-in duration-200">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-400" />
                <span>Agency Commission & Editor Payout Ledger</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically retain {defaultRate}% agency commission on client payments and track editor payout balances.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCommissionData}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCommission ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {/* Default Commission Rate Config Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Default Agency Commission Rate</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  Agency retains <span className="text-indigo-400 font-bold text-base">{defaultRate}%</span> &bull; Freelancer receives <span className="text-emerald-400 font-bold text-base">{100 - defaultRate}%</span> of every client payment
                </div>
              </div>

              {!isEditingDefaultRate ? (
                <button
                  type="button"
                  onClick={() => setIsEditingDefaultRate(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Change Default Split %
                </button>
              ) : (
                <form onSubmit={handleUpdateDefaultRate} className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newDefaultRateInput}
                      onChange={e => setNewDefaultRateInput(e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500 text-white font-mono text-sm font-bold text-center focus:outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingDefaultRate(false);
                      setNewDefaultRateInput(String(defaultRate));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            {/* Visual Split Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
                <div
                  style={{ width: `${defaultRate}%` }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                  title={`Agency Share: ${defaultRate}%`}
                />
                <div
                  style={{ width: `${100 - defaultRate}%` }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  title={`Freelancer Share: ${100 - defaultRate}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  <span>Agency Share ({defaultRate}%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Editor Share ({100 - defaultRate}%)</span>
                </span>
              </div>
            </div>
          </div>

          {/* 4 Financial Highlight Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Client Collections</span>
                <Coins className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {formatINR(commissionStats?.totalClientPaid || 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                Total paid by clients on assigned work
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-indigo-950/20 border border-indigo-500/30 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                <span>Agency Commission</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-300 font-mono mt-1">
                {formatINR(commissionStats?.totalAdminCommission || 0)}
              </div>
              <div className="text-[11px] text-indigo-400/80 font-medium">
                Your retained agency profit ({defaultRate}% avg)
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Total Editor Share</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {formatINR(commissionStats?.totalFreelancerShare || 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                Gross earnings earned by freelancers
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                <span>Pending Payouts Due</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono mt-1">
                {formatINR(commissionStats?.totalPendingPayouts || 0)}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium">
                ✓ {formatINR(commissionStats?.totalSettledPayouts || 0)} Settled
              </div>
            </div>
          </div>

          {/* Per-Freelancer Summary Cards */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Editor Payout & Performance Summaries</span>
            </h4>

            {freelancerSummaries.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                No freelancers assigned to orders or tasks yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {freelancerSummaries.map(f => {
                  return (
                    <div
                      key={f.freelancerId}
                      className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-bold text-white line-clamp-1">{f.freelancerName}</div>
                            {f.phone && <div className="text-xs text-slate-400 font-mono">{f.phone}</div>}
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                            {f.ordersCount} {f.ordersCount === 1 ? 'Project' : 'Projects'}
                          </span>
                        </div>

                        {/* Financial Stats */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Client Paid</div>
                            <div className="text-xs font-bold text-white mt-0.5">{formatINR(f.totalPaidByClients)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-indigo-400 uppercase">Agency Cut</div>
                            <div className="text-xs font-bold text-indigo-300 mt-0.5">{formatINR(f.adminCommissionEarned)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-emerald-400 uppercase">Editor Net</div>
                            <div className="text-xs font-bold text-emerald-400 mt-0.5">{formatINR(f.freelancerTotalEarned)}</div>
                          </div>
                        </div>

                        {/* Status Balance */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-slate-400">Pending:</span>
                            <span className="font-bold text-amber-300 font-mono">{formatINR(f.pendingPayouts)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-slate-400">Settled:</span>
                            <span className="font-bold text-slate-300 font-mono">{formatINR(f.settledPayouts)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {f.pendingPayouts > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBulkSettleFreelancer(f);
                            setBulkSettleNote(`UPI Settlement to ${f.freelancerName}`);
                          }}
                          className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settle All Due ({formatINR(f.pendingPayouts)})</span>
                        </button>
                      ) : (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>No payments due</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Commission Ledger Table & Mobile Cards */}
          <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 sm:space-y-5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-800/80 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-base font-bold text-white tracking-tight">Project-by-Project Commission Ledger</h4>
                  <button
                    type="button"
                    onClick={handleExportCommissionCSV}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm tap-active"
                    title="Export complete commission ledger to CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed commission split and payout confirmation for every assigned order and custom task.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search code or client..."
                  value={commissionSearchQuery}
                  onChange={e => setCommissionSearchQuery(e.target.value)}
                  className="w-full sm:w-48 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <select
                  value={commissionFilterEditor}
                  onChange={e => setCommissionFilterEditor(e.target.value)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none truncate"
                >
                  <option value="all">All Editors</option>
                  {team.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  value={commissionFilterStatus}
                  onChange={e => setCommissionFilterStatus(e.target.value)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none truncate"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Due Only</option>
                  <option value="settled">Settled Only</option>
                </select>
              </div>
            </div>

            {/* Filtered Records Resolution */}
            {(() => {
              const filteredRecords = commissionRecords.filter(rec => {
                if (commissionFilterEditor !== 'all' && rec.assigneeId !== commissionFilterEditor) return false;
                if (commissionFilterStatus !== 'all' && rec.payoutStatus !== commissionFilterStatus) return false;
                if (commissionSearchQuery.trim()) {
                  const q = commissionSearchQuery.toLowerCase();
                  return (
                    rec.code.toLowerCase().includes(q) ||
                    rec.clientName.toLowerCase().includes(q) ||
                    rec.service.toLowerCase().includes(q) ||
                    rec.assigneeName.toLowerCase().includes(q)
                  );
                }
                return true;
              });

              if (commissionRecords.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No assigned projects found. Assign a freelancer to an order to start tracking commissions.
                  </div>
                );
              }

              if (filteredRecords.length === 0) {
                return (
                  <div className="py-10 text-center text-xs text-slate-500">
                    No projects match your search or filter criteria.
                  </div>
                );
              }

              return (
                <>
                  {/* Mobile Commission Ledger Cards (< lg screens) - ZERO horizontal scroll */}
                  <div className="space-y-3.5 lg:hidden">
                    {filteredRecords.map(rec => {
                      const isSettled = rec.payoutStatus === 'settled';

                      return (
                        <div
                          key={`m-${rec.type}-${rec.code}`}
                          className="p-4 rounded-xl sm:rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 min-w-0 shadow-lg"
                        >
                          {/* Header row: Project Code, Type, and Payout Status */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${rec.type === 'order' ? 'bg-indigo-600/30 text-indigo-300' : 'bg-purple-600/30 text-purple-300'}`}>
                                  {rec.type === 'order' ? 'ORD' : 'TASK'}
                                </span>
                                <span className="font-mono text-sm font-bold text-white">{rec.code}</span>
                              </div>
                              <div className="text-xs text-slate-300 font-medium mt-1 break-words">
                                {rec.clientName} &bull; <span className="text-slate-400">{rec.service}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {isSettled ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold"
                                  title={rec.payoutNote ? `Note: ${rec.payoutNote}` : 'Settled'}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Settled</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending Due</span>
                                </span>
                              )}
                              {rec.payoutProof && (
                                <button
                                  type="button"
                                  onClick={() => setActiveProofLightbox({ url: rec.payoutProof!, title: `Payout Settlement Proof - ${rec.code} (${rec.assigneeName})` })}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/25 cursor-pointer tap-active transition-colors"
                                  title="Click to view transfer screenshot in high-res"
                                >
                                  <ZoomIn className="w-2.5 h-2.5" /> Proof
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Editor & Split % banner */}
                          <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-900/90 border border-slate-800">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                              <span className="text-[10px] uppercase text-slate-500 font-semibold shrink-0">Editor:</span>
                              <span className="font-semibold text-slate-200 truncate">{rec.assigneeName}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditSplitItem(rec);
                                setCustomSplitInput(String(rec.commissionRate));
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] font-bold border border-slate-700 shrink-0 cursor-pointer"
                              title="Click to override commission %"
                            >
                              <span>{rec.commissionRate}% Split</span>
                              <Edit className="w-2.5 h-2.5 text-slate-400" />
                            </button>
                          </div>

                          {/* Financial 3-Col Box */}
                          <div className="grid grid-cols-3 gap-1.5 py-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                            <div className="min-w-0">
                              <div className="text-[10px] text-slate-400 uppercase font-medium truncate">Client Paid</div>
                              <div className="text-xs sm:text-sm font-bold font-mono text-white truncate mt-0.5">
                                {formatINR(rec.clientPaid)}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate">of {formatINR(rec.totalPrice)}</div>
                            </div>
                            <div className="min-w-0 border-x border-slate-800/80 px-1">
                              <div className="text-[10px] text-indigo-400 uppercase font-medium truncate">Agency Cut</div>
                              <div className="text-xs sm:text-sm font-bold font-mono text-indigo-300 truncate mt-0.5">
                                {formatINR(rec.adminShare)}
                              </div>
                              <div className="text-[9px] text-indigo-400/70 truncate">{rec.commissionRate}%</div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] text-emerald-400 uppercase font-medium truncate">Editor Share</div>
                              <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400 truncate mt-0.5">
                                {formatINR(rec.freelancerShare)}
                              </div>
                              <div className="text-[9px] text-emerald-400/70 truncate">{100 - rec.commissionRate}%</div>
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setViewingPayoutBill({
                                  code: rec.code,
                                  type: rec.type,
                                  title: rec.title,
                                  service: rec.service,
                                  freelancerName: rec.assigneeName,
                                  clientPaid: rec.clientPaid,
                                  commissionRate: rec.commissionRate,
                                  adminShare: rec.adminShare,
                                  freelancerShare: rec.freelancerShare,
                                  payoutStatus: rec.payoutStatus,
                                  payoutAt: rec.payoutAt,
                                  payoutNote: rec.payoutNote,
                                  payoutProof: rec.payoutProof,
                                });
                              }}
                              className="flex-1 min-w-[85px] py-2 px-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer tap-active"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View Bill</span>
                            </button>

                            <button
                              type="button"
                              disabled={sharingPayoutCode === rec.code}
                              onClick={() => handleWhatsAppSharePayout(rec)}
                              className="py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/25 transition-colors cursor-pointer tap-active disabled:opacity-60"
                              title="Share official PDF settlement bill and message to freelancer via WhatsApp"
                            >
                              <Share2 className={`w-3.5 h-3.5 ${sharingPayoutCode === rec.code ? 'animate-spin' : ''}`} />
                            </button>

                            {isSettled ? (
                              <button
                                type="button"
                                onClick={() => handleUpdatePayoutStatus(rec, 'pending')}
                                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs font-semibold transition-colors cursor-pointer tap-active"
                              >
                                Mark Pending
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSettlePayoutItem(rec);
                                  setSettlePayoutNote(`Paid ${formatINR(rec.freelancerShare)} via UPI`);
                                  setSettlePayoutProofPreview(rec.payoutProof || null);
                                  setSettlePayoutProofFileName('');
                                }}
                                className="flex-1 min-w-[95px] py-2 px-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-1 transition-colors cursor-pointer tap-active"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Settled</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table (lg+ screens) */}
                  <div className="hidden lg:block overflow-x-auto no-scrollbar scrollbar-none">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                          <th className="pb-3 pl-2">Project</th>
                          <th className="pb-3">Editor</th>
                          <th className="pb-3 text-right">Client Paid</th>
                          <th className="pb-3 text-center">Split %</th>
                          <th className="pb-3 text-right">Agency Commission</th>
                          <th className="pb-3 text-right">Editor Share</th>
                          <th className="pb-3 text-center">Payout Status</th>
                          <th className="pb-3 text-right pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredRecords.map(rec => {
                          const isSettled = rec.payoutStatus === 'settled';

                          return (
                            <tr key={`${rec.type}-${rec.code}`} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3.5 pl-2">
                                <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${rec.type === 'order' ? 'bg-indigo-600/30 text-indigo-300' : 'bg-purple-600/30 text-purple-300'}`}>
                                    {rec.type === 'order' ? 'ORD' : 'TASK'}
                                  </span>
                                  <span>{rec.code}</span>
                                </div>
                                <div className="text-[11px] text-slate-300 font-medium mt-0.5 line-clamp-1">
                                  {rec.clientName} &bull; <span className="text-slate-400">{rec.service}</span>
                                </div>
                              </td>

                              <td className="py-3.5">
                                <span className="font-semibold text-slate-200">{rec.assigneeName}</span>
                              </td>

                              <td className="py-3.5 text-right font-mono font-bold text-white">
                                {formatINR(rec.clientPaid)}
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  of {formatINR(rec.totalPrice)}
                                </span>
                              </td>

                              <td className="py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditSplitItem(rec);
                                    setCustomSplitInput(String(rec.commissionRate));
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[11px] font-bold border border-slate-700 cursor-pointer"
                                  title="Click to override commission %"
                                >
                                  <span>{rec.commissionRate}%</span>
                                  <Edit className="w-2.5 h-2.5 text-slate-400" />
                                </button>
                              </td>

                              <td className="py-3.5 text-right font-mono font-bold text-indigo-300">
                                {formatINR(rec.adminShare)}
                              </td>

                              <td className="py-3.5 text-right font-mono font-bold text-emerald-400">
                                {formatINR(rec.freelancerShare)}
                              </td>

                              <td className="py-3.5 text-center">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  {isSettled ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold"
                                      title={rec.payoutNote ? `Note: ${rec.payoutNote}` : 'Settled'}
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Settled</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                      <Clock className="w-3 h-3" />
                                      <span>Pending Due</span>
                                    </span>
                                  )}
                                  {rec.payoutProof && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveProofLightbox({ url: rec.payoutProof!, title: `Payout Settlement Proof - ${rec.code} (${rec.assigneeName})` })}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/25 cursor-pointer transition-colors"
                                      title="Click to preview transfer screenshot"
                                    >
                                      <ZoomIn className="w-2.5 h-2.5" /> Proof
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 pr-2 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingPayoutBill({
                                        code: rec.code,
                                        type: rec.type,
                                        title: rec.title,
                                        service: rec.service,
                                        freelancerName: rec.assigneeName,
                                        clientPaid: rec.clientPaid,
                                        commissionRate: rec.commissionRate,
                                        adminShare: rec.adminShare,
                                        freelancerShare: rec.freelancerShare,
                                        payoutStatus: rec.payoutStatus,
                                        payoutAt: rec.payoutAt,
                                        payoutNote: rec.payoutNote,
                                        payoutProof: rec.payoutProof,
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-medium text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    title="View official settlement bill & proof screenshot"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>View Bill</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sharingPayoutCode === rec.code}
                                    onClick={() => handleWhatsAppSharePayout(rec)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/25 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] disabled:opacity-60"
                                    title="Share official PDF settlement bill and message to freelancer via WhatsApp"
                                  >
                                    <Share2 className={`w-3 h-3 ${sharingPayoutCode === rec.code ? 'animate-spin' : ''}`} />
                                    <span className="hidden xl:inline">{sharingPayoutCode === rec.code ? 'Sharing...' : 'WhatsApp'}</span>
                                  </button>
                                  {isSettled ? (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePayoutStatus(rec, 'pending')}
                                      className="px-2 py-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 text-[11px] transition-colors cursor-pointer"
                                      title="Revert to pending"
                                    >
                                      Mark Pending
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSettlePayoutItem(rec);
                                        setSettlePayoutNote(`Paid ${formatINR(rec.freelancerShare)} via UPI`);
                                        setSettlePayoutProofPreview(rec.payoutProof || null);
                                        setSettlePayoutProofFileName('');
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-colors cursor-pointer"
                                    >
                                      Mark Settled
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 8: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="mt-8 space-y-8 animate-in fade-in duration-200">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <span>Database Backup & Restore</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Create safe SQLite database snapshots and reset the system to any previously saved point in time.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Create Safe Snapshot</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Creates an immediate atomic snapshot of <code className="text-slate-300">data/cutline.sqlite</code> into the <code className="text-slate-300">backups/</code> directory. Each snapshot preserves all orders, client profiles, team assignments, and transaction records.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerBackup}
                className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Backup Snapshot Now</span>
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">Automated Pi / Server Backups</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  On a Raspberry Pi or Linux VPS, run under PM2 and configure a daily crontab entry for automated nightly snapshots.
                </p>
                <div className="text-[11px] font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                  <div className="text-slate-500"># Nightly automated snapshot:</div>
                  <div className="text-indigo-400">0 3 * * * curl -X POST http://localhost:3000/api/admin/backup</div>
                </div>
              </div>
            </div>
          </div>

          {/* Snapshots History & Restore Panel */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Saved Snapshots & Restore Points</h4>
                  <p className="text-xs text-slate-400">
                    Roll back the application database to any saved snapshot. Requires admin password confirmation.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 font-mono">
                  {snapshots.length} {snapshots.length === 1 ? 'Snapshot' : 'Snapshots'}
                </span>
                <button
                  type="button"
                  onClick={fetchSnapshots}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Refresh Snapshots List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSnapshots ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingSnapshots && snapshots.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Loading snapshots...</span>
              </div>
            ) : snapshots.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-300">No Snapshots Created Yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the &quot;Create Backup Snapshot Now&quot; button above to create your first safe database restore point.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="pb-3 pl-2">Snapshot File</th>
                      <th className="pb-3">Created Timestamp</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {snapshots.map(s => {
                      const dateObj = new Date(s.createdAt);
                      const formattedDate = isNaN(dateObj.getTime())
                        ? s.createdAt
                        : dateObj.toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          });
                      const sizeKb = (s.size / 1024).toFixed(1);

                      return (
                        <tr key={s.filename} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="py-3.5 pl-2 font-mono text-slate-200">
                            <div className="flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="font-semibold">{s.filename}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{formattedDate}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-slate-400 font-mono">
                            {sizeKb} KB
                          </td>
                          <td className="py-3.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenRestoreModal(s)}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                title="Reset database to this snapshot"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset to this Point</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSnapshot(s.filename)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Snapshot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Record Payment with Proof Upload */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  <span>Record Payment & Transaction Proof</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Order <strong className="text-indigo-400 font-mono">{showPaymentModal.code}</strong> &bull; Client: <span className="text-white font-medium">{showPaymentModal.customer_name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center mb-4">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Price</div>
                <div className="text-sm font-bold text-white mt-0.5">{formatINR(showPaymentModal.price)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Paid So Far</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">{formatINR(showPaymentModal.paid)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Due</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">
                  {formatINR(Math.max(0, (Number(showPaymentModal.price) || 0) - (Number(showPaymentModal.paid) || 0)))}
                </div>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              {/* Payment Amount & Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Payment Amount to Add (₹) <span className="text-rose-400">*</span>
                  </label>
                  {(() => {
                    const balance = Math.max(0, (Number(showPaymentModal.price) || 0) - (Number(showPaymentModal.paid) || 0));
                    return balance > 0 ? (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(balance))}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                      >
                        Fill Full Balance ({formatINR(balance)})
                      </button>
                    ) : null;
                  })()}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 3500"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Payment Mode & Reference Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Google Pay">Google Pay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Paytm">Paytm</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card / Online</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Transaction Ref / UTR (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref #482910..."
                    value={paymentRefNote}
                    onChange={e => setPaymentRefNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Screenshot Proof Upload Section */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold text-white">Upload Screenshot Image as Proof</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Saved in transaction proofs
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Upload screenshot receipt of the payment. Stored in folder <strong className="text-white font-mono">transaction proofs</strong> and printed automatically as <strong className="text-emerald-400">Page 2 of the official bill</strong>.
                </p>

                {/* Upload Box / Preview */}
                {paymentProofPreview ? (
                  <div className="relative rounded-xl border border-indigo-500/30 bg-slate-900 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Screenshot Attached
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentProofPreview(null);
                          setPaymentProofFileName('');
                        }}
                        className="text-rose-400 hover:text-rose-300 hover:underline text-[11px]"
                      >
                        Remove / Replace
                      </button>
                    </div>
                    <div className="max-h-48 overflow-hidden rounded-lg border border-slate-800 flex items-center justify-center bg-black/40">
                      <img
                        src={paymentProofPreview}
                        alt="Payment Screenshot Proof"
                        className="max-h-48 w-auto object-contain"
                      />
                    </div>
                    {paymentProofFileName && (
                      <div className="text-[10px] text-slate-400 truncate">
                        File: {paymentProofFileName}
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer hover:bg-slate-900/50 transition-all group">
                    <Upload className="w-7 h-7 text-slate-500 group-hover:text-indigo-400 transition-colors mb-1.5" />
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                      Click to choose screenshot or drag image here
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Supports PNG, JPG, JPEG, WEBP (UPI receipt, GPay / PhonePe / Bank transfer confirmation)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={paymentUploading}
                  onClick={() => setShowPaymentModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentUploading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {paymentUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Payment & Proof...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Payment & Attach Proof</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Manual Order */}
      {showAddOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-1">Add Order Manually</h3>
            <p className="text-xs text-slate-400 mb-4">
              Create an order received via offline inquiry or phone call.
            </p>
            <form onSubmit={handleCreateManualOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={manualOrder.customer_name}
                  onChange={e => setManualOrder({ ...manualOrder, customer_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={manualOrder.phone}
                    onChange={e => setManualOrder({ ...manualOrder, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={manualOrder.email}
                    onChange={e => setManualOrder({ ...manualOrder, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Select Service(s) — Choose separately or together:
                </label>
                {/* Checkbox cards for separate selection */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const isSocial = manualOrder.service === 'Social Media Management' || manualOrder.service.includes('Both');
                      const isVideo = manualOrder.service === 'Video Editing' || manualOrder.service.includes('Both');
                      const nextVideo = !isVideo;
                      if (nextVideo && isSocial) {
                        updateManualOrderService('Both (Video + Social Media)');
                      } else if (nextVideo) {
                        updateManualOrderService('Video Editing');
                      } else if (isSocial) {
                        updateManualOrderService('Social Media Management');
                      } else {
                        updateManualOrderService('Video Editing');
                      }
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                      manualOrder.service === 'Video Editing' || manualOrder.service.includes('Both')
                        ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🎬</span>
                        <span>Video Editing</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Separate deliverable</div>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                      manualOrder.service === 'Video Editing' || manualOrder.service.includes('Both')
                        ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                        : 'border-slate-700 bg-slate-900 text-transparent'
                    }`}>
                      ✓
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const isSocial = manualOrder.service === 'Social Media Management' || manualOrder.service.includes('Both');
                      const isVideo = manualOrder.service === 'Video Editing' || manualOrder.service.includes('Both');
                      const nextSocial = !isSocial;
                      if (nextSocial && isVideo) {
                        updateManualOrderService('Both (Video + Social Media)');
                      } else if (nextSocial) {
                        updateManualOrderService('Social Media Management');
                      } else if (isVideo) {
                        updateManualOrderService('Video Editing');
                      } else {
                        updateManualOrderService('Social Media Management');
                      }
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                      manualOrder.service === 'Social Media Management' || manualOrder.service.includes('Both')
                        ? 'bg-purple-950/70 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>📱</span>
                        <span>Social Media</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Separate deliverable</div>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                      manualOrder.service === 'Social Media Management' || manualOrder.service.includes('Both')
                        ? 'bg-purple-600 border-purple-500 text-white font-bold'
                        : 'border-slate-700 bg-slate-900 text-transparent'
                    }`}>
                      ✓
                    </div>
                  </button>
                </div>

                {/* 1-Tap Presets */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => updateManualOrderService('Video Editing')}
                    className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-center border transition-all ${
                      manualOrder.service === 'Video Editing'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Video Only
                  </button>
                  <button
                    type="button"
                    onClick={() => updateManualOrderService('Social Media Management')}
                    className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-center border transition-all ${
                      manualOrder.service === 'Social Media Management'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Social Only
                  </button>
                  <button
                    type="button"
                    onClick={() => updateManualOrderService('Both (Video + Social Media)')}
                    className={`py-1 px-2 rounded-lg text-[10px] font-semibold text-center border transition-all ${
                      manualOrder.service.includes('Both')
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    ✨ Both Combined
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">
                      Or select package from list:
                    </label>
                    <select
                      value={manualOrder.service}
                      onChange={e => updateManualOrderService(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Video Editing" className="bg-slate-900 text-white">
                        Video Editing (Separate)
                      </option>
                      <option value="Social Media Management" className="bg-slate-900 text-white">
                        Social Media Management (Separate)
                      </option>
                      <option value="Both (Video + Social Media)" className="bg-slate-900 text-white">
                        Both (Video + Social Media Combo)
                      </option>
                      {services
                        .filter(
                          s =>
                            s.name !== 'Video Editing' &&
                            s.name !== 'Social Media Management' &&
                            !s.name.includes('Both')
                        )
                        .map(s => (
                          <option key={s.id} value={s.name} className="bg-slate-900 text-white">
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="date"
                      required
                      value={manualOrder.deadline}
                      onChange={e => setManualOrder({ ...manualOrder, deadline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-semibold">Price (₹)</label>
                    <span className="text-[10px] text-indigo-400 font-medium">Auto-updated (editable)</span>
                  </div>
                  <input
                    type="number"
                    placeholder="3500"
                    value={manualOrder.price}
                    onChange={e => setManualOrder({ ...manualOrder, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assign To</label>
                  <select
                    value={manualOrder.assignee_id}
                    onChange={e => setManualOrder({ ...manualOrder, assignee_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Unassigned</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Brief Details</label>
                <textarea
                  rows={2}
                  required
                  value={manualOrder.brief}
                  onChange={e => setManualOrder({ ...manualOrder, brief: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Drive / YouTube Link</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={manualOrder.link}
                  onChange={e => setManualOrder({ ...manualOrder, link: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Custom Task */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Add Agency Custom Task</h3>
            <p className="text-xs text-slate-400 mb-4">
              Internal agency task assigned to a team member.
            </p>
            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cutline Studio 2026 Reel"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assignee</label>
                  <select
                    value={newTask.assignee_id}
                    onChange={e => setNewTask({ ...newTask, assignee_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">Unassigned</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Deadline</label>
                  <input
                    type="date"
                    required
                    value={newTask.deadline}
                    onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Price / Payout (₹)</label>
                  <input
                    type="number"
                    placeholder="2500"
                    value={newTask.price}
                    onChange={e => setNewTask({ ...newTask, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Paid So Far (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newTask.paid}
                    onChange={e => setNewTask({ ...newTask, paid: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Team Member */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Add Freelancer</h3>
            <p className="text-xs text-slate-400 mb-4">
              Create login credentials for a new editor or strategist.
            </p>
            <form onSubmit={handleAddTeamMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Seth"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={newMember.phone}
                  onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  placeholder="vikram@cutlinestudio.com"
                  value={newMember.email}
                  onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Temporary Password (min 8)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newMember.password}
                  onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password */}
      {showResetPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Set new password for <strong className="text-white">{showResetPassModal.name}</strong>. Active sessions will be terminated.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Service */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">
              {editingService ? 'Edit Service' : 'Add Website Service'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure what is displayed on the public website.
            </p>
            <form onSubmit={handleSaveService} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. YouTube Long-form Cuts"
                  value={serviceForm.name}
                  onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Base Price (₹)
                    <span className="text-[10px] text-indigo-400 font-normal block">Auto-quotes orders</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="3500"
                    value={serviceForm.base_price}
                    onChange={e => setServiceForm({ ...serviceForm, base_price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Display Price Text
                    <span className="text-[10px] text-slate-400 font-normal block">Shown on website</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="from ₹3,500 per video"
                    value={serviceForm.price_text}
                    onChange={e => setServiceForm({ ...serviceForm, price_text: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Short Description / Blurb</label>
                <textarea
                  rows={2}
                  required
                  value={serviceForm.blurb}
                  onChange={e => setServiceForm({ ...serviceForm, blurb: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Features (One per line)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Pacing & narrative cut&#10;Color grading & sound design&#10;2 revision rounds"
                  value={serviceForm.points}
                  onChange={e => setServiceForm({ ...serviceForm, points: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Brief */}
      {selectedBriefOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-400">
                  {selectedBriefOrder.code}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {selectedBriefOrder.customer_name} &bull; {selectedBriefOrder.service}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBriefOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedBriefOrder.brief}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Phone:</span>
                  <span className="text-white font-medium">+91 {selectedBriefOrder.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Deadline:</span>
                  <span className="text-white font-medium">{formatDate(selectedBriefOrder.deadline)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Invoiced Rate:</span>
                  <span className="text-white font-semibold">{formatINR(selectedBriefOrder.price)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Amount Paid:</span>
                  <span className="text-emerald-400 font-semibold">{formatINR(selectedBriefOrder.paid)}</span>
                </div>
              </div>

              {selectedBriefOrder.link && (
                <div>
                  <span className="text-slate-500 text-xs block mb-1">Cloud Footage Link:</span>
                  <a
                    href={selectedBriefOrder.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 hover:underline text-xs break-all"
                  >
                    <span>{selectedBriefOrder.link}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBriefOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRM DELETE MODAL (ZERO window.confirm DEPENDENCY) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">{confirmDelete.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{confirmDelete.description}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CONFIRM DATABASE RESTORE WITH ADMIN PASSWORD */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-150 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reset Database to Snapshot</h3>
                  <p className="text-xs text-slate-400">
                    Point-in-time state rollback authorization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(null);
                  setRestorePassword('');
                  setRestoreError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Warning Callout Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Critical Action: Database Will Revert</span>
              </div>
              <p className="text-slate-300">
                Restoring this snapshot will roll back all orders, tasks, team records, client accounts, and billing numbers to the exact state captured on that snapshot date. Any changes made after that snapshot will be replaced.
              </p>
            </div>

            {/* Target Snapshot Details Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Selected Snapshot:</span>
                <span className="font-mono text-indigo-300 font-semibold truncate max-w-[240px]">
                  {showRestoreModal.filename}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Snapshot Timestamp:</span>
                <span className="text-white font-medium">
                  {new Date(showRestoreModal.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Snapshot Size:</span>
                <span className="text-white font-mono font-medium">
                  {(showRestoreModal.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>

            {/* Password Authorization Form */}
            <form onSubmit={handleConfirmRestore} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Enter Admin Password to Authorize</span>
                  </span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">
                    Required for security
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showRestorePasswordText ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Enter your administrator password"
                    value={restorePassword}
                    onChange={e => {
                      setRestorePassword(e.target.value);
                      if (restoreError) setRestoreError(null);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs sm:text-sm font-mono placeholder-slate-600 focus:outline-none transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRestorePasswordText(!showRestorePasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
                    title={showRestorePasswordText ? 'Hide Password' : 'Show Password'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {restoreError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => {
                    setShowRestoreModal(null);
                    setRestorePassword('');
                    setRestoreError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isRestoring || !restorePassword.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-amber-600/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Restoring Database...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Confirm & Restore Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Settle Single Project Payout */}
      {settlePayoutItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Wallet className="w-4 h-4" />
                  </span>
                  <span>Confirm Freelancer Payout</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Project <span className="font-mono text-indigo-400 font-bold">{settlePayoutItem.code}</span> &bull; {settlePayoutItem.assigneeName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettlePayoutItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Split Breakdown Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Client Paid Amount:</span>
                <span className="font-mono font-bold text-white">{formatINR(settlePayoutItem.clientPaid)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Agency Commission ({settlePayoutItem.commissionRate}%):</span>
                <span className="font-mono font-bold text-indigo-300">+{formatINR(settlePayoutItem.adminShare)}</span>
              </div>
              <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-200">Editor Payout Amount:</span>
                <span className="font-mono font-black text-emerald-400 text-lg">
                  {formatINR(settlePayoutItem.freelancerShare)}
                </span>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleUpdatePayoutStatus(settlePayoutItem, 'settled', settlePayoutNote, settlePayoutProofPreview);
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Payment Reference / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent via UPI (GPay/PhonePe) Ref #839210"
                  value={settlePayoutNote}
                  onChange={e => setSettlePayoutNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs placeholder-slate-600 focus:outline-none"
                />
              </div>

              {/* Screenshot Proof Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Upload Transfer Screenshot Proof</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Saved in transaction proofs
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Upload screenshot receipt of the payout. Stored permanently and included on the freelancer's official settlement bill.
                </p>

                {settlePayoutProofPreview ? (
                  <div className="relative rounded-xl border border-emerald-500/30 bg-slate-900 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Proof Attached
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSettlePayoutProofPreview(null);
                          setSettlePayoutProofFileName('');
                        }}
                        className="text-rose-400 hover:text-rose-300 hover:underline text-[11px] cursor-pointer"
                      >
                        Remove / Replace
                      </button>
                    </div>
                    <div className="max-h-44 overflow-hidden rounded-lg border border-slate-800 flex items-center justify-center bg-black/40">
                      <img
                        src={settlePayoutProofPreview}
                        alt="Payout Transfer Screenshot Proof"
                        className="max-h-44 w-auto object-contain"
                      />
                    </div>
                    {settlePayoutProofFileName && (
                      <div className="text-[10px] text-slate-400 truncate">
                        File: {settlePayoutProofFileName}
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer hover:bg-slate-900/50 transition-all group">
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-emerald-400 transition-colors mb-1.5" />
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                      Click to choose screenshot or drag image here
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 text-center">
                      Supports PNG, JPG, JPEG, WEBP (UPI transfer slip, GPay / PhonePe / Bank receipt)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePayoutProofFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettlePayoutItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPayout ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Payout...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Attach Proof</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Commission Split Override */}
      {editSplitItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <SlidersHorizontal className="w-4 h-4" />
                  </span>
                  <span>Custom Split for {editSplitItem.code}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Client: {editSplitItem.clientName} &bull; Editor: {editSplitItem.assigneeName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditSplitItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateOrderSplit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Agency Commission Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder={`Default: ${defaultRate}%`}
                    value={customSplitInput}
                    onChange={e => setCustomSplitInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white font-mono text-sm font-bold focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Leave empty to reset to the global default ({defaultRate}%).
                </p>
              </div>

              {/* Dynamic Live Preview */}
              {(() => {
                const previewRate = customSplitInput.trim() !== '' && !isNaN(Number(customSplitInput))
                  ? Number(customSplitInput)
                  : defaultRate;
                const adminPreview = Math.round(editSplitItem.clientPaid * (previewRate / 100));
                const editorPreview = editSplitItem.clientPaid - adminPreview;

                return (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Agency ({previewRate}%):</span>
                      <span className="font-mono font-bold text-indigo-300">{formatINR(adminPreview)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Editor ({100 - previewRate}%):</span>
                      <span className="font-mono font-bold text-emerald-400">{formatINR(editorPreview)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditSplitItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSplit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {isSubmittingSplit ? 'Saving...' : 'Save Split'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Settle All for Freelancer */}
      {bulkSettleFreelancer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                    <Coins className="w-4 h-4" />
                  </span>
                  <span>Settle All Pending Due</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Freelancer: <span className="text-white font-bold">{bulkSettleFreelancer.freelancerName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkSettleFreelancer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1 text-xs">
              <span className="font-bold text-amber-300 block">Total Due to Transfer:</span>
              <span className="text-2xl font-black text-white font-mono block">
                {formatINR(bulkSettleFreelancer.pendingPayouts)}
              </span>
              <span className="text-slate-400 text-[11px] block mt-1">
                This will mark all pending projects for {bulkSettleFreelancer.freelancerName} as Settled.
              </span>
            </div>

            <form onSubmit={handleBulkSettle} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Payment Reference / Settlement Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent full balance via GPay UPI Ref #928172"
                  value={bulkSettleNote}
                  onChange={e => setBulkSettleNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBulkSettleFreelancer(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBulkSettle}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmittingBulkSettle ? 'Settling...' : 'Confirm Bulk Settlement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Freelancer Payout Bill & Voucher */}
      {viewingPayoutBill && (
        <FreelancerPayoutModal
          bill={viewingPayoutBill}
          onClose={() => setViewingPayoutBill(null)}
        />
      )}

      {/* FULL-SCREEN PROOF LIGHTBOX MODAL */}
      {activeProofLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setActiveProofLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden min-w-0"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {activeProofLightbox.title}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={activeProofLightbox.url}
                  download={`proof-${Date.now()}.png`}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer tap-active"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveProofLightbox(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer tap-active"
                  title="Close viewer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="p-3 sm:p-4 overflow-auto flex items-center justify-center bg-slate-950/50 min-h-[220px]">
              <img
                src={activeProofLightbox.url}
                alt={activeProofLightbox.title}
                className="max-h-[75vh] w-auto max-w-full rounded-xl border border-slate-800 shadow-lg object-contain select-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
      <div className="sm:hidden fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {fabOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-30 transition-opacity"
            onClick={() => setFabOpen(false)}
          />
        )}

        {fabOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-3 z-40 animate-in slide-in-from-bottom-3 duration-200">
            <button
              type="button"
              onClick={() => {
                setShowAddOrderModal(true);
                setFabOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/40 border border-indigo-400/30 tap-active cursor-pointer"
            >
              <span>+ New Order</span>
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddTaskModal(true);
                setFabOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-600/40 border border-purple-400/30 tap-active cursor-pointer"
            >
              <span>+ New Task</span>
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                fetchData();
                setFabOpen(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-800 text-slate-200 text-xs font-semibold shadow-lg border border-slate-700 tap-active cursor-pointer"
            >
              <span>Refresh Data</span>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setFabOpen(!fabOpen)}
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/45 border border-indigo-400/40 tap-active gpu-accelerated cursor-pointer z-40 active:scale-90 transition-transform"
          aria-label="Quick Actions"
        >
          <Plus className={`w-6 h-6 transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* WHATSAPP SHARING ASSISTANT FLOATING BANNER */}
      {activeShareHelper && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-md px-3 animate-in slide-in-from-bottom duration-200">
          <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl text-white space-y-2.5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  WhatsApp Bill Attached
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveShareHelper(null)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Official PDF bill attached!</strong> The message for <strong>{activeShareHelper.recipient}</strong> has been copied to your clipboard:
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 break-words select-all whitespace-pre-line max-h-24 overflow-y-auto no-scrollbar">
              {activeShareHelper.message}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 flex-wrap gap-2">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                👉 In WhatsApp: tap "Add a message..." &amp; Paste!
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(activeShareHelper.message);
                    notifySuccess('Message copied to clipboard!');
                  } catch {
                    // ignore
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
              >
                Copy Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
