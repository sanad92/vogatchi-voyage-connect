
import React from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/types/userManagement";

interface TestButtonsProps {
  user: User;
  showTestMode: boolean;
  onToggleTestMode: () => void;
  onTestButton: () => void;
  onTestLogin: () => void;
  onShowPassword: () => void;
  onShowEdit: () => void;
  onToggleActive: () => void;
}

const TestButtons = ({ 
  user, 
  showTestMode, 
  onToggleTestMode, 
  onTestButton, 
  onTestLogin, 
  onShowPassword, 
  onShowEdit, 
  onToggleActive 
}: TestButtonsProps) => {
  // تم إزالة أدوات الاختبار - النظام يعمل بالبيانات الحقيقية فقط
  return null;
};

export default TestButtons;
