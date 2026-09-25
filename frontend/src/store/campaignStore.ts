import { create } from 'zustand';
import type { Campaign, CampaignCategory } from '../types';

interface CampaignFilters {
  search: string;
  category: CampaignCategory | 'all';
  sortBy: 'newest' | 'most-funded' | 'deadline' | 'trending';
  page: number;
}

interface CampaignState {
  campaigns: Campaign[];
  featuredCampaigns: Campaign[];
  selectedCampaign: Campaign | null;
  filters: CampaignFilters;
  totalPages: number;
  isLoading: boolean;

  setFilters: (filters: Partial<CampaignFilters>) => void;
  resetFilters: () => void;
  setSelectedCampaign: (campaign: Campaign | null) => void;
  setLoading: (loading: boolean) => void;
}

const defaultFilters: CampaignFilters = {
  search: '',
  category: 'all',
  sortBy: 'newest',
  page: 1,
};

export const useCampaignStore = create<CampaignState>()((set) => ({
  campaigns: [],
  featuredCampaigns: [],
  selectedCampaign: null,
  filters: defaultFilters,
  totalPages: 1,
  isLoading: false,

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters, page: filters.page ?? 1 },
    })),

  resetFilters: () => set({ filters: defaultFilters }),

  setSelectedCampaign: (campaign) => set({ selectedCampaign: campaign }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
