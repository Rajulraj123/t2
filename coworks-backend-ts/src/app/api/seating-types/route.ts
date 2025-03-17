import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { SeatingTypeInput } from '@/types/seating';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';

// GET all seating types
export async function GET(): Promise<NextResponse> {
  try {
    const seatingTypes = await models.SeatingType.findAll();
    
    // No need to add short codes manually as they are now in the database
    const response: ApiResponse = {
      success: true,
      data: seatingTypes
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching seating types:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch seating types',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST create a new seating type
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      const response: ApiResponse = {
        success: false,
        message: 'Unauthorized'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json() as SeatingTypeInput;
    const { name, description, hourly_rate, is_hourly, min_booking_duration, min_seats, short_code } = body;
    
    // Validate input
    if (!name) {
      const response: ApiResponse = {
        success: false,
        message: 'Name is required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Name validation - check for blank or whitespace-only names
    if (!validation.isValidName(name.toString())) {
      const response: ApiResponse = {
        success: false,
        message: 'Name cannot be empty or contain only whitespace'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Check if seating type already exists
    const existingType = await models.SeatingType.findOne({ where: { name } });
    if (existingType) {
      const response: ApiResponse = {
        success: false,
        message: 'Seating type already exists'
      };
      
      return NextResponse.json(response, { status: 409 });
    }
    
    // Create a new seating type
    const seatingType = await models.SeatingType.create({
      name,
      description,
      hourly_rate: hourly_rate || 0.00,
      is_hourly: is_hourly !== undefined ? is_hourly : true,
      min_booking_duration: min_booking_duration || 2,
      min_seats: min_seats || 1,
      short_code: short_code || undefined
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Seating type created successfully',
      data: seatingType
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating seating type:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to create seating type',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}