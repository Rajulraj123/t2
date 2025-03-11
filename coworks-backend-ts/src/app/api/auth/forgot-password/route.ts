import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import mailService from '@/utils/mailService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email } = body;
    
    // Basic validation
    if (!email) {
      const response: ApiResponse = {
        success: false,
        message: 'Email is required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find customer by email
    const customer = await models.Customer.findOne({ where: { email } });
    
    // Even if customer is not found, return success for security
    if (!customer) {
      const response: ApiResponse = {
        success: true,
        message: 'If your email is registered with us, you will receive password reset instructions'
      };
      
      return NextResponse.json(response);
    }
    
    // Invalidate any existing reset tokens for this customer
    await models.PasswordReset.update(
      { used: true },
      { where: { customer_id: customer.id, used: false } }
    );
    
    // Create a new password reset token
    const token = models.PasswordReset.generateToken();
    const expires_at = models.PasswordReset.getExpiryDate();
    
    await models.PasswordReset.create({
      customer_id: customer.id,
      token,
      expires_at
    });
    
    // Send password reset email
    const emailSent = await mailService.sendPasswordResetEmail(
      customer.email,
      customer.name,
      token
    );
    
    if (!emailSent) {
      console.error('Failed to send password reset email');
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'If your email is registered with us, you will receive password reset instructions'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to process forgot password request',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}