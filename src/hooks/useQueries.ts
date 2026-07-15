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
      const response = await apiFetch('/api/residences');
      if (!response.ok) throw new Error('Failed to fetch residences');
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
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
        verifTypeList
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
        apiFetch('/api/admin/verification-types').then(r => r.ok ? r.json() : []).catch(() => [])
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
        verificationTypes: verifTypeList
      };
    },
    enabled: role === 'admin',
    refetchInterval: 60000, // Refresh every minute for admin
  });
};
