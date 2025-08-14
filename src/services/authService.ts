import { api, ApiResponse } from './api';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login.php', credentials);
    return response as LoginResponse;
  }

  async logout(): Promise<ApiResponse> {
    return api.post('/auth/logout.php');
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await api.get<User>('/auth/me.php');
      return response;
    } catch (error) {
      throw error;
    }
  }

  async checkAuthStatus(): Promise<User | null> {
    try {
      const response = await this.getCurrentUser();
      return response.user || null;
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService();