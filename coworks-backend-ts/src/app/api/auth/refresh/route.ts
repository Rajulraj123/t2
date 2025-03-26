// Set explicit runtime for token operations
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signToken, generateRefreshToken } from '@/utils/jwt';
import { cookies } from 'next/headers';

/**
 * POST handler for token refresh
 * 
 * This endpoint allows clients to refresh their access token using a valid refresh token.
 * It improves security by requiring the refresh token to be sent in a secure HTTP-only cookie,
 * rather than as a bearer token in the Authorization header.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get refresh token from HTTP-only cookie
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is missing' },
        { status: 401 }
      );
    }

    // Verify the refresh token
    const { valid, decoded } = await verifyToken(refreshToken);

    if (!valid || !decoded) {
      // Clear invalid cookie
      cookieStore.delete('refresh_token');
      
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Check if this is actually a refresh token
    if (decoded.tokenType !== 'refresh') {
      return NextResponse.json(
        { success: false, message: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Generate a new access token
    const newAccessToken = await signToken({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    });

    // Generate a new refresh token (token rotation for security)
    const newRefreshToken = await generateRefreshToken({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    });

    // Set the new refresh token in an HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newAccessToken, // Send only the access token in the response body
        }
      },
      { status: 200 }
    );

    // Set secure, http-only cookie with the refresh token
    response.cookies.set({
      name: 'refresh_token',
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days, matching refresh token expiry
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Error refreshing token' },
      { status: 500 }
    );
  }
} 