import { NextRequest, NextResponse } from 'next/server';
import models from '../../../../models';
import { verifyToken } from '@/utils/jwt';
import { AvailabilityStatusEnum } from '../../../../types/seating';

// Helper function to find seat by ID or code
async function findSeat(idOrCode: string) {
  // Check if the parameter is a numeric ID or a seat code
  const isNumeric = /^\d+$/.test(idOrCode);
  
  let whereClause = {};
  if (isNumeric) {
    whereClause = { id: parseInt(idOrCode) };
  } else {
    whereClause = { seat_code: idOrCode };
  }
  
  // Try to find the seat
  const seat = await models.Seat.findOne({
    where: whereClause,
    include: [
      {
        model: models.Branch,
        as: 'Branch',
        attributes: ['id', 'name', 'address', 'location', 'opening_time', 'closing_time', 'short_code']
      },
      {
        model: models.SeatingType,
        as: 'SeatingType',
        attributes: ['id', 'name', 'short_code', 'description', 'hourly_rate', 'is_hourly', 'min_booking_duration', 'min_seats']
      }
    ]
  });
  
  return seat;
}

// GET a single seat by ID or code
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    // Find the seat using the helper function
    const seat = await findSeat(id);
    
    if (!seat) {
      return NextResponse.json(
        { success: false, message: 'Seat not found' },
        { status: 404 }
      );
    }
    
    // Get booking history for this seat
    const bookings = await models.SeatBooking.findAll({
      where: { seat_id: seat.id },
      order: [['start_time', 'DESC']],
      limit: 5
    });
    
    return NextResponse.json({
      success: true,
      data: {
        seat,
        bookings
      }
    });
  } catch (error) {
    console.error('Error fetching seat:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch seat', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT update a seat by ID or code
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { price, availability_status } = body;
    
    // Find the seat using the helper function
    const seat = await findSeat(id);
    
    if (!seat) {
      return NextResponse.json(
        { success: false, message: 'Seat not found' },
        { status: 404 }
      );
    }
    
    // Update seat data
    const updates: any = {};
    
    if (price !== undefined) {
      updates.price = price;
    }
    
    if (availability_status && Object.values(AvailabilityStatusEnum).includes(availability_status as AvailabilityStatusEnum)) {
      updates.availability_status = availability_status;
    }
    
    await seat.update(updates);
    
    return NextResponse.json({
      success: true,
      message: 'Seat updated successfully',
      data: seat
    });
  } catch (error) {
    console.error('Error updating seat:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update seat', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE a seat by ID or code
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find the seat using the helper function
    const seat = await findSeat(id);
    
    if (!seat) {
      return NextResponse.json(
        { success: false, message: 'Seat not found' },
        { status: 404 }
      );
    }
    
    // Check if seat has bookings
    const bookingCount = await models.SeatBooking.count({
      where: { seat_id: seat.id }
    });
    
    if (bookingCount > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete seat with associated bookings' },
        { status: 400 }
      );
    }
    
    // Delete time slots for this seat
    await models.TimeSlot.destroy({
      where: { seat_id: seat.id }
    });
    
    // Delete the seat
    await seat.destroy();
    
    return NextResponse.json({
      success: true,
      message: 'Seat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting seat:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete seat', error: (error as Error).message },
      { status: 500 }
    );
  }
}