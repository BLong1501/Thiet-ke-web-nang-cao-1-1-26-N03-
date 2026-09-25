// Types for FundVN Crowdfunding Platform

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'fundraiser' | 'user';
  isVerified: boolean;
  bio?: string;
  joinedAt: string;
  totalDonated?: number;
  totalRaised?: number;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  shortDesc: string;
  category: CampaignCategory;
  targetAmount: number;
  raisedAmount: number;
  donorCount: number;
  deadline: string;
  status: 'draft' | 'pending' | 'active' | 'completed' | 'rejected' | 'suspended';
  creator: User;
  thumbnail: string;
  images?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  updates?: CampaignUpdate[];
}

export type CampaignCategory =
  | 'y-te'
  | 'giao-duc'
  | 'moi-truong'
  | 'cuu-tro'
  | 'dong-vat'
  | 'cong-dong'
  | 'sang-tao'
  | 'khac';

export interface Donation {
  id: string;
  campaign: Campaign;
  donor: User | null;
  isAnonymous: boolean;
  amount: number;
  message?: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export interface CampaignUpdate {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  images?: string[];
}

export interface Notification {
  id: string;
  type: 'donation' | 'campaign' | 'verification' | 'social' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
  campaign?: Campaign;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  cover?: string;
  memberCount: number;
  campaignCount: number;
  category: string;
  isJoined: boolean;
}

export interface VerificationRequest {
  id: string;
  user: User;
  status: 'pending' | 'approved' | 'rejected' | 'need-info';
  documents: string[];
  submittedAt: string;
  reviewedAt?: string;
  note?: string;
}

export interface Stats {
  totalCampaigns: number;
  totalDonors: number;
  totalRaised: number;
  successRate: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export const CATEGORY_LABELS: Record<CampaignCategory, string> = {
  'y-te': 'Y tế & Sức khỏe',
  'giao-duc': 'Giáo dục',
  'moi-truong': 'Môi trường',
  'cuu-tro': 'Cứu trợ thiên tai',
  'dong-vat': 'Động vật',
  'cong-dong': 'Cộng đồng',
  'sang-tao': 'Sáng tạo',
  'khac': 'Khác',
};

export const CATEGORY_ICONS: Record<CampaignCategory, string> = {
  'y-te': '🏥',
  'giao-duc': '📚',
  'moi-truong': '🌱',
  'cuu-tro': '🆘',
  'dong-vat': '🐾',
  'cong-dong': '🤝',
  'sang-tao': '🎨',
  'khac': '💡',
};
