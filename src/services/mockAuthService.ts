// نظام مصادقة مؤقت يعمل مع localStorage
export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface MockLoginCredentials {
  email: string;
  password: string;
}

export interface MockLoginResponse {
  success: boolean;
  user: MockUser;
}

// المستخدمين الافتراضيين للاختبار
const defaultUsers: MockUser[] = [
  {
    id: 'super-admin-1',
    email: 'admin@vogatchi.com',
    full_name: 'المدير العام',
    role: 'super_admin',
    phone: '+966501234567',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'manager-1',
    email: 'manager@vogatchi.com',
    full_name: 'مدير الفرع',
    role: 'manager',
    phone: '+966507654321',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sales-1',
    email: 'sales@vogatchi.com',
    full_name: 'مندوب مبيعات',
    role: 'sales_agent',
    phone: '+966509876543',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'booking-1',
    email: 'booking@vogatchi.com',
    full_name: 'موظف حجوزات',
    role: 'booking_agent',
    phone: '+966502345678',
    is_active: true,
    created_at: new Date().toISOString(),
  }
];

// كلمات المرور الافتراضية (جميعها: 123456)
const defaultPasswords: Record<string, string> = {
  'admin@vogatchi.com': '123456',
  'manager@vogatchi.com': '123456',
  'sales@vogatchi.com': '123456',
  'booking@vogatchi.com': '123456',
};

class MockAuthService {
  private readonly STORAGE_KEY = 'vogatchi_current_user';

  async login(credentials: MockLoginCredentials): Promise<MockLoginResponse> {
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { email, password } = credentials;
    
    // البحث عن المستخدم
    const user = defaultUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error('البريد الإلكتروني غير مسجل');
    }
    
    if (!user.is_active) {
      throw new Error('الحساب معطل، يرجى مراجعة الإدارة');
    }
    
    // التحقق من كلمة المرور
    const expectedPassword = defaultPasswords[email.toLowerCase()];
    if (password !== expectedPassword) {
      throw new Error('كلمة المرور غير صحيحة');
    }
    
    // حفظ المستخدم في localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    
    return {
      success: true,
      user
    };
  }

  async logout(): Promise<{ success: boolean }> {
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 200));
    
    localStorage.removeItem(this.STORAGE_KEY);
    return { success: true };
  }

  async getCurrentUser(): Promise<{ user: MockUser | null }> {
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userJson = localStorage.getItem(this.STORAGE_KEY);
    if (!userJson) {
      return { user: null };
    }
    
    try {
      const user = JSON.parse(userJson) as MockUser;
      return { user };
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      return { user: null };
    }
  }

  async checkAuthStatus(): Promise<MockUser | null> {
    try {
      const response = await this.getCurrentUser();
      return response.user;
    } catch {
      return null;
    }
  }
}

export const mockAuthService = new MockAuthService();