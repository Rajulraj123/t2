import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './src/config/jwt';

// Paths that don't require authentication
const PUBLIC_PATHS: string[] = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/',
  '/api/test',
  '/api/health'
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Check if the path is public
  if (PUBLIC_PATHS.includes(path)) {
    return NextResponse.next();
  }
  
  // Check if path starts with /api
  if (path.startsWith('/api')) {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ message: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token - now async
    const { valid, expired, blacklisted } = await verifyToken(token);
    
    if (!valid) {
      let message = 'Invalid token';
      if (expired) message = 'Token expired';
      if (blacklisted) message = 'Token revoked';
      
      return new NextResponse(
        JSON.stringify({ message }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    // Continue with the request
    return NextResponse.next();
  }
  
  // For non-API routes, allow the request to proceed
  return NextResponse.next();
}

// Configure the middleware to run on all /api routes
export const config = {
  matcher: '/api/:path*',
};