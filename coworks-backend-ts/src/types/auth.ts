export interface Customer {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    password: string;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface CustomerInput {
    name: string;
    email: string;
    phone?: string;
    password: string;
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
  }
  
  export interface RegisterResponse {
    message: string;
    customer: Omit<Customer, 'password'>;
  }