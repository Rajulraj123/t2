import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';

// GET slots by seating type
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const branch_id = url.searchParams.get('branch_id');
    const seating_type_code = url.searchParams.get('code');
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Validate required filters
    if (!branch_id) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch ID is required',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Validate branch_id is a valid number
    const branchIdNum = parseInt(branch_id);
    if (isNaN(branchIdNum)) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch ID must be a valid number',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    if (!seating_type_code) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Seating type code is required',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find the branch first
    const branch = await models.Branch.findByPk(branchIdNum);
    if (!branch) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Branch not found',
        data: null
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Find the seating type by short code
    const seatingType = await models.SeatingType.findOne({
      where: { short_code: seating_type_code }
    });
    
    if (!seatingType) {
      const response: ApiResponse<null> = {
        success: false,
        message: `Seating type with code ${seating_type_code} not found`,
        data: null
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Prepare filter conditions for time slots
    const whereConditions: any = {
      branch_id: branchIdNum,
      date
    };
    
    // Find all time slots for this branch and date, and include seats of the specified seating type
    const timeSlots = await models.TimeSlot.findAll({
      where: whereConditions,
      order: [['start_time', 'ASC']],
      include: [
        {
          model: models.Branch,
          as: 'Branch',
          attributes: ['id', 'name', 'address', 'short_code']
        },
        {
          model: models.Seat,
          as: 'Seat',
          required: true, // Only include time slots with matching seats
          where: { seating_type_id: seatingType.id },
          attributes: ['id', 'seat_number', 'price', 'availability_status'],
          include: [
            {
              model: models.SeatingType,
              as: 'SeatingType',
              attributes: ['id', 'name', 'short_code', 'hourly_rate', 'is_hourly']
            }
          ]
        },
        {
          model: models.SeatBooking,
          as: 'Booking',
          required: false
        }
      ]
    }) as any[];
    
    // Categorize slots by status
    const availableSlots = [];
    const bookedSlots = [];
    const maintenanceSlots = [];
    
    for (const slot of timeSlots) {
      if (slot.is_available && slot.Seat?.availability_status === 'AVAILABLE') {
        availableSlots.push(slot);
      } else if (!slot.is_available && slot.booking_id && slot.Booking) {
        bookedSlots.push(slot);
      } else if (slot.Seat?.availability_status === 'MAINTENANCE') {
        maintenanceSlots.push(slot);
      }
    }
    
    const slotsData = {
      seating_type: {
        id: seatingType.id,
        name: seatingType.name,
        short_code: seatingType.short_code
      },
      date,
      branch_id: branchIdNum,
      total_slots: timeSlots.length,
      available: {
        count: availableSlots.length,
        slots: availableSlots
      },
      booked: {
        count: bookedSlots.length,
        slots: bookedSlots
      },
      maintenance: {
        count: maintenanceSlots.length,
        slots: maintenanceSlots
      }
    };
    
    const response: ApiResponse<any> = {
      success: true,
      message: 'Slots retrieved successfully',
      data: slotsData
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching time slots by seating type:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to fetch slots',
      error: (error as Error).message,
      data: null
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 