// src/types/auth.ts
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  password: string;
  profile_picture: string | null;
  company_name: string | null;
  role: UserRole;
  managed_branch_id: number | null;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  profile_picture?: string;
  company_name?: string;
  role?: UserRole;
  managed_branch_id?: number | null;
  is_admin?: boolean;
}

export interface CustomerAttributes extends CustomerInput {
  id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  customer: Omit<Customer, 'password'>;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  profile_picture?: string;
  company_name?: string;
  role?: UserRole;
  managed_branch_id?: number | null;
  is_admin?: boolean;
}

export interface RegisterResponse {
  message: string;
  customer: Omit<Customer, 'password'>;
  token: string;
}