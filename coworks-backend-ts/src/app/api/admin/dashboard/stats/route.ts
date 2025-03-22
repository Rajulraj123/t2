// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";



export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { verifyAdmin } from '@/utils/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';
import { ApiResponse } from '@/types/common';
import { SeatingTypeEnum } from '@/types/seating';

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(req);
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }

    // Get admin role and branch_id (if applicable)
    const { role, branch_id } = adminAuth;
    
    // Extract customization options from query params
    const url = new URL(req.url);
    const showQuantityStats = url.searchParams.get('quantity_stats') === 'true';
    const showCostSavings = url.searchParams.get('cost_savings') === 'true';
    const detailedSeatingStats = url.searchParams.get('detailed_seating') === 'true';
    const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from') as string) : null;
    const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to') as string) : null;
    
    // Fetch different stats based on admin role
    if (role === 'branch_admin' && branch_id) {
      // Branch admin - fetch stats for their branch only
      const branchStats = await getBranchStats(
        branch_id, 
        showQuantityStats, 
        showCostSavings, 
        detailedSeatingStats, 
        from, 
        to
      );
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: 'Branch statistics retrieved successfully',
        data: branchStats
      });
    } else {
      // Super admin or general admin - fetch global stats
      const globalStats = await getGlobalStats(
        showQuantityStats, 
        showCostSavings, 
        detailedSeatingStats, 
        from, 
        to
      );
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: 'Global statistics retrieved successfully',
        data: globalStats
      });
    }
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        message: 'Failed to fetch dashboard statistics', 
        data: null,
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// Function to get stats for a specific branch
async function getBranchStats(
  branchId: string | number, 
  showQuantityStats = false,
  showCostSavings = false,
  detailedSeatingStats = false,
  from: Date | null = null,
  to: Date | null = null
) {
  // Build date filter if provided
  const dateFilter = {};
  if (from && to) {
    dateFilter['created_at'] = {
      [Op.between]: [from, to]
    };
  } else if (from) {
    dateFilter['created_at'] = {
      [Op.gte]: from
    };
  } else if (to) {
    dateFilter['created_at'] = {
      [Op.lte]: to
    };
  }
  
  // First get seats for this branch
  const branchSeats = await db.Seat.findAll({
    where: { branch_id: branchId },
    attributes: ['id']
  });
  
  const seatIds = branchSeats.map((seat: any) => seat.id);
  
  // Get total bookings for this branch's seats
  const totalBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds },
      ...dateFilter
    }
  }) : 0;

  // Get active bookings
  const activeBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds },
      status: 'CONFIRMED',
      start_time: { [Op.lte]: new Date() },
      end_time: { [Op.gt]: new Date() },
      ...dateFilter
    }
  }) : 0;

  // Get pending bookings
  const pendingBookings = seatIds.length > 0 ? await db.SeatBooking.count({
    where: { 
      seat_id: { [Op.in]: seatIds },
      status: 'PENDING',
      ...dateFilter
    }
  }) : 0;

  // Get open support tickets
  const openTickets = await db.SupportTicket.count({
    where: { 
      branch_id: branchId,
      status: { [Op.in]: ['OPEN', 'IN_PROGRESS', 'ASSIGNED'] },
      ...dateFilter
    }
  });

  // Get total seats and available seats
  const totalSeats = await db.Seat.count({
    where: { branch_id: branchId }
  });
  
  const availableSeats = await db.Seat.count({
    where: { 
      branch_id: branchId,
      availability_status: 'AVAILABLE'
    }
  });

  // Get total revenue
  const payments = await db.Payment.findAll({
    where: {
      booking_id: { 
        [Op.in]: db.sequelize.literal(`
          SELECT id FROM seat_bookings 
          WHERE seat_id IN (
            SELECT id FROM seats WHERE branch_id = ${branchId}
          )
          ${from ? `AND created_at >= '${from.toISOString()}'` : ''}
          ${to ? `AND created_at <= '${to.toISOString()}'` : ''}
        `)
      },
      payment_status: 'COMPLETED'
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as unknown as { total: string }[];
  
  const totalRevenue = parseFloat(payments[0]?.total || '0');
  
  // Build response object
  const response: any = {
    totalBookings,
    activeBookings,
    pendingBookings,
    openTickets,
    totalRevenue,
    totalSeats,
    availability: availableSeats,
  };
  
  // Get detailed seating stats if requested
  if (detailedSeatingStats) {
    // Get seating types and counts
    const seatingTypes = await db.SeatingType.findAll({
      include: [{
        model: db.Seat,
        as: 'Seats',
        where: { branch_id: branchId },
        required: false
      }],
      attributes: [
        'id',
        'name',
        'capacity_options',
        'quantity_options',
        'cost_multiplier',
        [db.sequelize.fn('COUNT', db.sequelize.col('Seats.id')), 'count'],
        [
          db.sequelize.fn(
            'SUM', 
            db.sequelize.literal(`CASE WHEN "Seats"."availability_status" = 'AVAILABLE' THEN 1 ELSE 0 END`)
          ), 
          'available'
        ]
      ],
      group: ['SeatingType.id'],
      raw: true,
      nest: true
    });

    response.seatsByType = seatingTypes.map((type: any) => ({
      typeId: type.id,
      typeName: type.name,
      count: parseInt(type.count || '0'),
      available: parseInt(type.available || '0'),
      capacity_options: type.capacity_options,
      quantity_options: type.quantity_options,
      cost_multiplier: type.cost_multiplier
    }));
  }
  
  // Add quantity stats if requested
  if (showQuantityStats) {
    // Get bookings with quantity > 1 for hot desk and dedicated desk
    const hotDeskId = await getSeatingTypeId(SeatingTypeEnum.HOT_DESK);
    const dedicatedDeskId = await getSeatingTypeId(SeatingTypeEnum.DEDICATED_DESK);
    
    if (hotDeskId && dedicatedDeskId) {
      // Get seats of these types in the branch
      const configurableSeats = await db.Seat.findAll({
        where: {
          branch_id: branchId,
          seating_type_id: {
            [Op.in]: [hotDeskId, dedicatedDeskId]
          }
        },
        attributes: ['id', 'seating_type_id']
      });
      
      const hotDeskSeatIds = configurableSeats
        .filter((s: any) => s.seating_type_id === hotDeskId)
        .map((s: any) => s.id);
        
      const dedicatedDeskSeatIds = configurableSeats
        .filter((s: any) => s.seating_type_id === dedicatedDeskId)
        .map((s: any) => s.id);
      
      // Get hot desk bookings by quantity
      const hotDeskBookingsByQuantity = await getBookingsByQuantity(hotDeskSeatIds, dateFilter);
      
      // Get dedicated desk bookings by quantity
      const dedicatedDeskBookingsByQuantity = await getBookingsByQuantity(dedicatedDeskSeatIds, dateFilter);
      
      response.quantityStats = {
        hotDesk: hotDeskBookingsByQuantity,
        dedicatedDesk: dedicatedDeskBookingsByQuantity
      };
    }
  }
  
  // Add cost savings if requested
  if (showCostSavings && seatIds.length > 0) {
    const savingsData = await db.SeatBooking.findAll({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('total_price')), 'adjusted_price'],
        [
          db.sequelize.literal(`
            SUM(CASE 
              WHEN original_price IS NOT NULL THEN original_price 
              ELSE total_price 
            END)
          `),
          'original_price'
        ]
      ],
      where: {
        seat_id: { [Op.in]: seatIds },
        ...dateFilter
      },
      raw: true
    });
    
    if (savingsData && savingsData.length > 0) {
      const adjustedPrice = parseFloat(savingsData[0].adjusted_price || '0');
      const originalPrice = parseFloat(savingsData[0].original_price || '0');
      const savings = originalPrice - adjustedPrice;
      
      response.costSavings = {
        originalPrice,
        adjustedPrice,
        savings,
        savingsPercentage: originalPrice > 0 ? (savings / originalPrice) * 100 : 0
      };
    }
  }

  return response;
}

// Helper function to get seating type ID by enum
async function getSeatingTypeId(seatingTypeEnum: SeatingTypeEnum): Promise<number | null> {
  const seatingType = await db.SeatingType.findOne({
    where: { name: seatingTypeEnum },
    attributes: ['id']
  });
  
  return seatingType ? seatingType.id : null;
}

// Helper function to get bookings by quantity
async function getBookingsByQuantity(seatIds: number[], dateFilter: any) {
  if (!seatIds.length) return [];
  
  // Get bookings with quantity data
  const bookingsByQuantity = await db.sequelize.query(`
    SELECT 
      quantity, 
      COUNT(*) as count,
      SUM(total_price) as revenue,
      SUM(CASE WHEN original_price IS NOT NULL THEN original_price - total_price ELSE 0 END) as savings
    FROM seat_bookings
    WHERE seat_id IN (${seatIds.join(',')})
    ${dateFilter.created_at ? 
      `AND created_at ${
        dateFilter.created_at[Op.between] ? 
          `BETWEEN '${dateFilter.created_at[Op.between][0].toISOString()}' AND '${dateFilter.created_at[Op.between][1].toISOString()}'` :
        dateFilter.created_at[Op.gte] ?
          `>= '${dateFilter.created_at[Op.gte].toISOString()}'` :
        dateFilter.created_at[Op.lte] ?
          `<= '${dateFilter.created_at[Op.lte].toISOString()}'` :
        ''
      }` 
    : ''}
    GROUP BY quantity
    ORDER BY quantity ASC
  `, { type: db.sequelize.QueryTypes.SELECT });
  
  return bookingsByQuantity;
}

// Function to get global stats for super admin
async function getGlobalStats(
  showQuantityStats = false,
  showCostSavings = false,
  detailedSeatingStats = false,
  from: Date | null = null,
  to: Date | null = null
) {
  // Build date filter if provided
  const dateFilter = {};
  if (from && to) {
    dateFilter['created_at'] = {
      [Op.between]: [from, to]
    };
  } else if (from) {
    dateFilter['created_at'] = {
      [Op.gte]: from
    };
  } else if (to) {
    dateFilter['created_at'] = {
      [Op.lte]: to
    };
  }
  
  // Get total bookings across all branches
  const totalBookings = await db.SeatBooking.count({
    where: dateFilter
  });

  // Get active bookings across all branches
  const activeBookings = await db.SeatBooking.count({
    where: { 
      status: 'CONFIRMED',
      start_time: { [Op.lte]: new Date() },
      end_time: { [Op.gt]: new Date() },
      ...dateFilter
    }
  });

  // Get pending bookings across all branches
  const pendingBookings = await db.SeatBooking.count({
    where: { 
      status: 'PENDING',
      ...dateFilter
    }
  });

  // Get open support tickets across all branches
  const openTickets = await db.SupportTicket.count({
    where: { 
      status: { [Op.in]: ['OPEN', 'IN_PROGRESS', 'ASSIGNED'] },
      ...dateFilter
    }
  });

  // Get total revenue across all branches
  const payments = await db.Payment.findAll({
    where: {
      payment_status: 'COMPLETED',
      ...dateFilter
    },
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
    ],
    raw: true
  }) as unknown as { total: string }[];
  
  const totalRevenue = parseFloat(payments[0]?.total || '0');

  // Get total branches
  const branches = await db.Branch.count();

  // Get total seats
  const seats = await db.Seat.count();
  
  // Get available seats
  const availableSeats = await db.Seat.count({
    where: { availability_status: 'AVAILABLE' }
  });
  
  // Build response object
  const response: any = {
    totalBookings,
    activeBookings,
    pendingBookings,
    openTickets,
    totalRevenue,
    branches,
    seats,
    availableSeats
  };
  
  // Get detailed seating stats if requested
  if (detailedSeatingStats) {
    // Get seating types and counts
    const seatingTypes = await db.SeatingType.findAll({
      include: [{
        model: db.Seat,
        as: 'Seats',
        required: false
      }],
      attributes: [
        'id',
        'name',
        'capacity_options',
        'quantity_options',
        'cost_multiplier',
        [db.sequelize.fn('COUNT', db.sequelize.col('Seats.id')), 'count'],
        [
          db.sequelize.fn(
            'SUM', 
            db.sequelize.literal(`CASE WHEN "Seats"."availability_status" = 'AVAILABLE' THEN 1 ELSE 0 END`)
          ), 
          'available'
        ]
      ],
      group: ['SeatingType.id'],
      raw: true,
      nest: true
    });

    response.seatsByType = seatingTypes.map((type: any) => ({
      typeId: type.id,
      typeName: type.name,
      count: parseInt(type.count || '0'),
      available: parseInt(type.available || '0'),
      capacity_options: type.capacity_options,
      quantity_options: type.quantity_options,
      cost_multiplier: type.cost_multiplier
    }));
  }
  
  // Add quantity stats if requested
  if (showQuantityStats) {
    // Get bookings with quantity > 1 for hot desk and dedicated desk
    const hotDeskId = await getSeatingTypeId(SeatingTypeEnum.HOT_DESK);
    const dedicatedDeskId = await getSeatingTypeId(SeatingTypeEnum.DEDICATED_DESK);
    
    if (hotDeskId && dedicatedDeskId) {
      // Get seats of these types
      const hotDeskSeatIds = (await db.Seat.findAll({
        where: {
          seating_type_id: hotDeskId
        },
        attributes: ['id']
      })).map((s: any) => s.id);
      
      const dedicatedDeskSeatIds = (await db.Seat.findAll({
        where: {
          seating_type_id: dedicatedDeskId
        },
        attributes: ['id']
      })).map((s: any) => s.id);
      
      // Get hot desk bookings by quantity
      const hotDeskBookingsByQuantity = await getBookingsByQuantity(hotDeskSeatIds, dateFilter);
      
      // Get dedicated desk bookings by quantity
      const dedicatedDeskBookingsByQuantity = await getBookingsByQuantity(dedicatedDeskSeatIds, dateFilter);
      
      response.quantityStats = {
        hotDesk: hotDeskBookingsByQuantity,
        dedicatedDesk: dedicatedDeskBookingsByQuantity
      };
    }
  }
  
  // Add cost savings if requested
  if (showCostSavings) {
    const savingsData = await db.SeatBooking.findAll({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('total_price')), 'adjusted_price'],
        [
          db.sequelize.literal(`
            SUM(CASE 
              WHEN original_price IS NOT NULL THEN original_price 
              ELSE total_price 
            END)
          `),
          'original_price'
        ]
      ],
      where: dateFilter,
      raw: true
    });
    
    if (savingsData && savingsData.length > 0) {
      const adjustedPrice = parseFloat(savingsData[0].adjusted_price || '0');
      const originalPrice = parseFloat(savingsData[0].original_price || '0');
      const savings = originalPrice - adjustedPrice;
      
      response.costSavings = {
        originalPrice,
        adjustedPrice,
        savings,
        savingsPercentage: originalPrice > 0 ? (savings / originalPrice) * 100 : 0
      };
    }
  }

  return response;
}
