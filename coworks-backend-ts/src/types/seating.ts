// src/types/seating.ts
export enum SeatingTypeEnum {
  HOT_DESK = 'HOT_DESK',
  DEDICATED_DESK = 'DEDICATED_DESK',
  CUBICLE = 'CUBICLE',
  MEETING_ROOM = 'MEETING_ROOM',
  DAILY_PASS = 'DAILY_PASS'
}

export enum AvailabilityStatusEnum {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  MAINTENANCE = 'MAINTENANCE'
}

export interface SeatingType {
  id: number;
  name: SeatingTypeEnum;
  description: string | null;
  hourly_rate: number;
  is_hourly: boolean;
  min_booking_duration: number;
  min_seats: number; // Added field for minimum seats requirement
  short_code: string; // Short code for API calls
  created_at: Date;
  updated_at: Date;
}

export interface SeatingTypeInput {
  name: SeatingTypeEnum;
  description?: string;
  hourly_rate?: number;
  is_hourly?: boolean;
  min_booking_duration?: number;
  min_seats?: number; // Added field
  short_code?: string; // Short code for API calls
}

export interface SeatingTypeAttributes extends SeatingTypeInput {
  id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Seat {
  id: number;
  branch_id: number;
  seating_type_id: number;
  seat_number: string;
  seat_code: string; // Unique seat code (e.g., HD101)
  price: number;
  availability_status: AvailabilityStatusEnum;
  created_at: Date;
  updated_at: Date;
}

export interface SeatInput {
  branch_id: number;
  seating_type_id: number;
  seat_number: string;
  seat_code?: string; // Optional, will be auto-generated if not provided
  price: number;
  availability_status?: AvailabilityStatusEnum;
}

export interface SeatAttributes extends SeatInput {
  id?: number;
  created_at?: Date;
  updated_at?: Date;
}