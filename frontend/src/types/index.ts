// Types for FundVN Crowdfunding Platform

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "fundraiser" | "user" | "ADMIN" | "FUNDRAISER" | "USER";
  isVerified: boolean;
  bio?: string;
  joinedAt: string;
  totalDonated?: number;
  totalRaised?: number;
  phoneNumber?: string;
}

export interface Campaign {
  id: string;
  slug?: string;
  title: string;
  description: string;
  shortDesc: string;
  category: CampaignCategory | string;
  /** Tên danh mục lấy từ API, ưu tiên hơn nhãn cứng theo slug. */
  categoryName?: string;
  targetAmount: number;
  raisedAmount: number;
  donorCount: number;
  deadline: string;
  status:
    | "draft"
    | "pending"
    | "active"
    | "completed"
    | "rejected"
    | "suspended"
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "ACTIVE"
    | "COMPLETED"
    | "REJECTED"
    | "SUSPENDED";
  creator: User;
  thumbnail: string;
  coverImageUrl?: string;
  images?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  updates?: CampaignUpdate[];
  disbursements?: DisbursementRecord[];
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  beneficiaryInfo?: string;
  rejectionReason?: string;
}

export interface DisbursementRecord {
  id: string;
  date: string;
  purpose: string;
  recipient: string;
  amount: number;
  proofUrl: string;
  status: string;
  note?: string;
}

export type CampaignCategory =
  | "y-te"
  | "giao-duc"
  | "moi-truong"
  | "cuu-tro"
  | "dong-vat"
  | "cong-dong"
  | "sang-tao"
  | "khac";

export interface Donation {
  id: string;
  campaign: Campaign;
  donor: User | null;
  donorName?: string;
  donorEmail?: string;
  isAnonymous: boolean;
  amount: number;
  message?: string;
  status: "pending" | "success" | "failed" | "PENDING" | "SUCCESS" | "FAILED";
  paymentMethod?: string;
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
  type: "donation" | "campaign" | "verification" | "social" | "system";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface PostComment {
  id: string;
  author: User;
  content: string;
  createdAt: string;
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
  category?: string;
  commentList?: PostComment[];
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
  idCardNumber: string;
  cardIssuedDate?: string;
  cardIssuedPlace?: string;
  frontCardImage: string;
  backCardImage: string;
  portraitImage: string;
  supportingDocuments?: string[];
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "need-info"
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  documents?: string[];
  submittedAt: string;
  createdAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
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
  "y-te": "Y tế & Sức khỏe",
  "giao-duc": "Giáo dục",
  "moi-truong": "Môi trường",
  "cuu-tro": "Cứu trợ thiên tai",
  "dong-vat": "Động vật",
  "cong-dong": "Cộng đồng",
  "sang-tao": "Sáng tạo",
  khac: "Khác",
};
