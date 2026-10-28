export type UserRole = 'admin' | 'freelancer' | 'customer' | 'guest';

export interface UserSession {
  userId?: string;
  role: UserRole;
  name: string;
  phone?: string;
  email?: string;
}

export interface AppConfig {
  businessName: string;
  tagline: string;
  whatsappNumber: string;
  email: string;
  currency: string;
  currencySymbol: string;
  defaultCommissionRate?: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  base_price?: number;
  price_text: string;
  blurb: string;
  points: string[];
  sort: number;
}

export type OrderStatus = 'New' | 'Assigned' | 'In progress' | 'Review' | 'Delivered' | 'Paid';
export type TaskStatus = 'Assigned' | 'In progress' | 'Review' | 'Delivered' | 'Paid';

export interface OrderItem {
  id: string;
  code: string;
  customer_name?: string; // Omitted in freelancer view
  phone?: string;         // Omitted in freelancer view
  email?: string;         // Omitted in freelancer view
  service: string;
  deadline: string;
  budget?: string;        // Omitted in freelancer view
  brief: string;
  link: string;
  status: OrderStatus;
  assignee_id?: string | null;
  assigneeId?: string | null;
  assignee_name?: string;
  price?: number;         // Omitted in freelancer view
  paid?: number;          // Omitted in freelancer view
  payment_proof?: string | null;
  payment_note?: string | null;
  billed_at?: string | null;
  commission_rate?: number | null;
  freelancer_payout_status?: 'pending' | 'settled';
  freelancer_payout_at?: string | null;
  freelancer_payout_note?: string | null;
  freelancer_payout_proof?: string | null;
  created_at: string;
}

export interface TaskItem {
  id: string;
  code: string;
  title: string;
  description: string;
  assignee_id?: string | null;
  assignee_name?: string;
  deadline: string;
  status: TaskStatus;
  price: number;
  paid: number;
  commission_rate?: number | null;
  freelancer_payout_status?: 'pending' | 'settled';
  freelancer_payout_at?: string | null;
  freelancer_payout_note?: string | null;
  freelancer_payout_proof?: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  role: 'freelancer';
  name: string;
  phone?: string;
  email?: string;
  active: number;
  created_at: string;
  assignedCount?: number;
  activeCount?: number;
  orderValue?: number;
}

export interface AdminStats {
  newCount: number;
  inProgressCount: number;
  reviewCount: number;
  deliveredCount: number;
  totalOrders: number;
  totalOrderValue: number;
  totalCollected: number;
  balanceDue: number;
}

export interface FreelancerStats {
  assignedOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  totalTasks: number;
  totalEarnings: number;
  receivedEarnings: number;
  pendingEarnings: number;
  totalNetEarned?: number;
  totalSettledPayouts?: number;
  totalPendingPayouts?: number;
}

export interface CommissionRecord {
  id: string;
  code: string;
  type: 'order' | 'task';
  title: string;
  clientName: string;
  service: string;
  assigneeId: string;
  assigneeName: string;
  totalPrice: number;
  clientPaid: number;
  commissionRate: number; // e.g. 35 for 35%
  adminShare: number;     // clientPaid * (commissionRate / 100)
  freelancerShare: number;// clientPaid * ((100 - commissionRate) / 100)
  payoutStatus: 'pending' | 'settled';
  payoutAt?: string | null;
  payoutNote?: string | null;
  payoutProof?: string | null;
  createdAt: string;
}

export interface FreelancerCommissionSummary {
  freelancerId: string;
  freelancerName: string;
  phone?: string;
  ordersCount: number;
  totalPaidByClients: number;
  adminCommissionEarned: number;
  freelancerTotalEarned: number;
  pendingPayouts: number;
  settledPayouts: number;
}

export interface CommissionStats {
  defaultRate: number;
  totalClientPaid: number;
  totalAdminCommission: number;
  totalFreelancerShare: number;
  totalPendingPayouts: number;
  totalSettledPayouts: number;
}

export interface PayoutBillData {
  orderCode?: string;
  code?: string;
  type?: 'order' | 'task';
  title?: string;
  customerName?: string;
  service: string;
  freelancerName: string;
  freelancerPhone?: string;
  clientPaid?: number;
  commissionRate?: number;
  adminShare?: number;
  freelancerShare: number;
  payoutStatus: string;
  payoutAt?: string | null;
  payoutNote?: string | null;
  payoutProof?: string | null;
}
