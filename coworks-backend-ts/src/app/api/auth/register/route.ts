// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { RegisterRequest, RegisterResponse } from '@/types/auth';
import { generateToken } from '@/config/jwt';
import validation from '@/utils/validation';
import mailService from '@/utils/mailService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as RegisterRequest;
    const { 
      name, 
      email, 
      phone, 
      password, 
      profile_picture, 
      company_name,
      proof_of_identity,
      proof_of_address,
      address
    } = body;
    
    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Company name validation - it cannot be null or empty
    if (!company_name) {
      return NextResponse.json(
        { message: 'Company name is required' },
        { status: 400 }
      );
    }
    
    // Company name format validation
    if (!validation.isValidName(company_name)) {
      return NextResponse.json(
        { message: 'Company name cannot be empty or contain only whitespace' },
        { status: 400 }
      );
    }
    
    // Name validation
    if (!validation.isValidName(name)) {
      return NextResponse.json(
        { message: 'Name cannot be empty or contain only whitespace' },
        { status: 400 }
      );
    }
    
    // Email validation
    if (!validation.isValidEmail(email)) {
      return NextResponse.json(
        { 
          message: 'Please provide a valid email address',
          details: 'Email must be in a valid format (e.g., user@example.com)'
        },
        { status: 400 }
      );
    }
    
    // Phone validation (if provided)
    if (phone && !validation.isValidPhone(phone)) {
      return NextResponse.json(
        { message: 'Phone number must be 10 digits' },
        { status: 400 }
      );
    }
    
    // Password validation
    if (!validation.isValidPassword(password)) {
      return NextResponse.json(
        { 
          message: 'Password does not meet security requirements',
          details: validation.getPasswordRequirements()
        },
        { status: 400 }
      );
    }
    
    // Validate address if provided
    if (address && !validation.isValidAddress(address)) {
      return NextResponse.json(
        { message: 'Address cannot be empty or contain only whitespace' },
        { status: 400 }
      );
    }
    
    // Validate proof document paths if provided
    if (proof_of_identity && !validation.isValidDocumentPath(proof_of_identity)) {
      return NextResponse.json(
        { message: 'Proof of identity must be a PDF, JPG, JPEG, or PNG file' },
        { status: 400 }
      );
    }
    
    if (proof_of_address && !validation.isValidDocumentPath(proof_of_address)) {
      return NextResponse.json(
        { message: 'Proof of address must be a PDF, JPG, JPEG, or PNG file' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingUser = await models.Customer.findOne({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new customer
    const customer = await models.Customer.create({
      name,
      email,
      phone,
      password: hashedPassword,
      profile_picture: profile_picture || undefined,
      company_name: company_name || undefined,
      proof_of_identity: proof_of_identity || undefined,
      proof_of_address: proof_of_address || undefined,
      address: address || undefined
    });
    
    console.log('Customer created successfully with ID:', customer.id);
    
    // Return response without password
    const customerData = customer.get({ plain: true });
    const { password: _, ...customerWithoutPassword } = customerData;
    
    // Generate token for immediate use
    const token = generateToken(customer);
    
    // Send welcome email
    await mailService.sendWelcomeEmail(email, name);
    
    const response: RegisterResponse = {
      message: 'Registration successful',
      customer: customerWithoutPassword as any,
      token // Add token to the response
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Registration failed', error: (error as Error).message },
      { status: 500 }
    );
  }
}