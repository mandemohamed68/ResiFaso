import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getOwnerResidences, 
  getOwnerBookings, 
  getOwnerWithdrawals, 
  getGlobalSettings,
  getAllResidences,
  getAllUsers,
  getAllBookings,
  getAllReviews,
  getAllAds,
  getAllWithdrawals,
  getAllFaqs,
  getContactSettings,
  getAllContactMessages
} from '../lib/db';
import { apiFetch } from '../lib/api';

export const useOwnerResidences = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['owner-residences', userId],
    queryFn: () => getOwnerResidences(userId!),
    enabled: !!userId,
  });
};

export const useOwnerBookings = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['owner-bookings', userId],
    queryFn: () => getOwnerBookings(userId!),
    enabled: !!userId,
  });
};

export const useOwnerWithdrawals = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['owner-withdrawals', userId],
    queryFn: () => getOwnerWithdrawals(userId!),
    enabled: !!userId,
  });
};

export const useGlobalSettings = () => {
  return useQuery({
    queryKey: ['global-settings'],
    queryFn: getGlobalSettings,
  });
};

export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const response = await apiFetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!userId,
  });
};

export const useResidences = () => {
  return useQuery({
    queryKey: ['residences'],
    queryFn: async () => {
      try {
        const response = await apiFetch('/api/residences');
        if (!response.ok) throw new Error('Failed to fetch residences');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && typeof window !== 'undefined') {
          try {
            localStorage.setItem('resifaso_cache_/api/residences', JSON.stringify(data));
          } catch (e) {}
        }
        return data;
      } catch (err) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('resifaso_cache_/api/residences');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (e) {}
          }
        }
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const usePartners = () => {
  return useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      try {
        const response = await apiFetch('/api/partners');
        if (!response.ok) throw new Error('Failed to fetch partners');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && typeof window !== 'undefined') {
          try {
            localStorage.setItem('resifaso_cache_/api/partners', JSON.stringify(data));
          } catch (e) {}
        }
        return data;
      } catch (err) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('resifaso_cache_/api/partners');
          if (cached) {
            try {
              return JSON.parse(cached);
            } catch (e) {}
          }
        }
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useAdminData = (role: string | undefined) => {
  return useQuery({
    queryKey: ['admin-data'],
    queryFn: async () => {
      const [
        resList,
        userList,
        bookingList,
        reviewList,
        settingsData,
        adList,
        withdrawalList,
        faqList,
        contactSettingsData,
        messageList,
        verifTypeList,
        partnerList
      ] = await Promise.all([
        getAllResidences().catch(() => []),
        getAllUsers().catch(() => []),
        getAllBookings().catch(() => []),
        getAllReviews().catch(() => []),
        getGlobalSettings().catch(() => ({})),
        getAllAds().catch(() => []),
        getAllWithdrawals().catch(() => []),
        getAllFaqs().catch(() => []),
        getContactSettings().catch(() => ({})),
        getAllContactMessages().catch(() => []),
        apiFetch('/api/admin/verification-types').then(r => r.ok ? r.json() : []).catch(() => []),
        apiFetch('/api/partners').then(r => r.ok ? r.json() : []).catch(() => [])
      ]);
      return {
        residences: resList,
        users: userList,
        bookings: bookingList,
        reviews: reviewList,
        settings: settingsData,
        ads: adList,
        withdrawals: withdrawalList,
        faqs: faqList,
        contactSettings: contactSettingsData,
        messages: messageList,
        verificationTypes: verifTypeList,
        partners: partnerList
      };
    },
    enabled: role === 'admin',
    refetchInterval: 60000, // Refresh every minute for admin
  });
};
