
import { useUnifiedData } from './useUnifiedData';

export const useUnifiedUserActions = () => {
  console.log('⚠️ استخدام useUnifiedUserActions محذوف - استخدم useUnifiedData بدلاً منه');
  
  // استخدام الـ unified data hook الجديد
  const {
    linkUserToEmployee,
    unlinkUserFromEmployee,
    updateUnifiedData,
    isLinking,
    isUnlinking,
    isUpdating,
  } = useUnifiedData();

  return {
    linkUserToEmployee,
    unlinkUserFromEmployee,
    updateUnifiedData,
    isLinking,
    isUnlinking,
    isUpdating,
  };
};
