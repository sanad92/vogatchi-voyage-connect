import { api, ApiResponse } from './api';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  segment_id?: string;
  total_spent: number;
  last_booking_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  segment_id?: string;
}

export interface CustomerListResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

class CustomerService {
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<CustomerListResponse> {
    const response = await api.get<Customer[]>('/customers/list.php', params);
    return {
      data: response.data || [],
      pagination: response.pagination || { page: 1, limit: 20, total: 0 }
    };
  }

  async createCustomer(customerData: CustomerData): Promise<ApiResponse<{ id: string }>> {
    return api.post('/customers/create.php', customerData);
  }

  async updateCustomer(id: string, customerData: Partial<CustomerData>): Promise<ApiResponse> {
    return api.post('/customers/update.php', { id, ...customerData });
  }

  async deleteCustomer(id: string): Promise<ApiResponse> {
    return api.delete(`/customers/delete.php?id=${id}`);
  }
}

export const customerService = new CustomerService();