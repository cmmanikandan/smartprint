export type UserRole = 'customer' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
  isBlocked?: boolean;
  photoURL?: string;
}

export type OrderStatus = 'uploaded' | 'queue' | 'printing' | 'printed' | 'delivered';
export type PaymentStatus = 'pending' | 'paid';
export type PaymentMode = 'upi' | 'cash' | 'online';

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerPhone?: string;
  totalPrice: number;
  status: OrderStatus;
  emergency: boolean;
  paymentStatus: PaymentStatus;
  paymentMode?: PaymentMode;
  createdAt: string;
  deliveredAt?: string;
}

export interface PrintFile {
  id: string;
  orderId: string;
  fileName: string;
  fileUrl: string;
  pages: number;
  copies: number;
  color: 'bw' | 'color';
  duplex: boolean;
  orientation: 'portrait' | 'landscape';
  paperSize: 'a4' | 'a3' | 'legal';
  extras?: {
    lamination?: boolean;
    spiral?: boolean;
    stapler?: boolean;
    coverPage?: boolean;
  };
}

export interface QueueItem {
  id: string;
  orderId: string;
  customerName: string;
  priority: 'normal' | 'emergency';
  position: number;
  status: 'waiting' | 'printing' | 'completed' | 'paused' | 'cancelled';
  totalPages: number;
  estimatedTime: number; // in minutes
  createdAt: string;
}

export interface ShopSettings {
  pricePerBW: number;
  pricePerColor: number;
  emergencyCharge: number;
  laminationPrice: number;
  spiralPrice: number;
  shopStatus: 'open' | 'closed';
  contactPhone: string;
}
