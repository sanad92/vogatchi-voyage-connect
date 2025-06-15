
import { useUnifiedData } from './useUnifiedData';

export const useUnifiedUserData = () => {
  console.log('⚠️ استخدام useUnifiedUserData محذوف - استخدم useUnifiedData بدلاً منه');
  
  // استخدام الـ unified data hook الجديد
  const { unifiedUsers, isLoading, refreshAllData } = useUnifiedData();
  
  return {
    unifiedUsers,
    isLoading,
    refetch: refreshAllData,
  };
};
