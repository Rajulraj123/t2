// Properly configured Next.js API route directives
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import AdminModel, { AdminRole } from '@/models/admin';
import { comparePasswords } from '@/utils/password';
import { ApiResponse } from '@/types/common';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; /**
 * Admin login endpoint
 * @param req Request object
 * @returns Response with JWT token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[Admin Login] Processing login request from:', request.headers.get('user-agent'));
  console.log('[Admin Login] Request origin:', request.headers.get('origin'));
  
  try {    
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }
    
    let body;
    try {
      body = await request.json();
      console.log(`[Admin Login] Request body parsed successfully`);
    } catch (parseError) {
      console.error('[Admin Login] Failed to parse request body:', parseError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid request format', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { username, password } = body;
    
    if (!username) {
      console.log('[Admin Login] Missing username');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Username is required', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!password) {
      console.log('[Admin Login] Missing password');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Password is required', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`[Admin Login] Attempt for username: ${username}`);

    let admin;
    try {
      admin = await AdminModel.findOne({
        where: {
          [username.includes('@') ? 'email' : 'username']: username,
          is_active: true
        }
      });
    } catch (dbError) {
      console.error('[Admin Login] Database error when finding admin:', dbError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Database error, please try again later', data: null },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!admin) {
      console.log(`[Admin Login] Admin not found for: ${username}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid credentials', data: null },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log(`[Admin Login] Admin found: ${admin.id}, role: ${admin.role}`);
    
    let isPasswordValid = false;
    try {
      isPasswordValid = await admin.validatePassword(password);
    } catch (passwordError) {
      console.error('[Admin Login] Password validation error:', passwordError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Authentication error', data: null },
        { status: 500, headers: corsHeaders }
      );
    }
    
    if (!isPasswordValid) {
      console.log(`[Admin Login] Invalid password for admin: ${admin.id}`);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid credentials', data: null },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log(`[Admin Login] Password valid for admin: ${admin.id}`);

    try {
      await admin.update({ last_login: new Date() });
    } catch (updateError) {
      console.error('[Admin Login] Failed to update last login time:', updateError);
      }

    if (!admin.permissions) {
      try {
        admin.permissions = AdminModel.getDefaultPermissions(admin.role);
        await admin.save();
      } catch (permissionError) {
        console.error('[Admin Login] Failed to set default permissions:', permissionError);
        }
    }

    let token;
    try {
      token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          name: admin.name,
          role: admin.role,
          branch_id: admin.branch_id,
          permissions: admin.permissions,
          is_admin: true
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
    } catch (tokenError) {
      console.error('[Admin Login] Token generation error:', tokenError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Failed to generate authentication token', data: null },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[Admin Login] Login successful for admin: ${admin.id}`);

    const adminData = admin.toJSON();
    const { password: _, ...adminDataWithoutPassword } = adminData;

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminDataWithoutPassword,
        token
      }
    }, { 
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, message: 'Something went wrong, please try again later', data: null },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
