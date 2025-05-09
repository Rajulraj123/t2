'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

<<<<<<< Updated upstream
export default function AdminLogin() {
=======
export const dynamic = 'force-dynamic'

export const dynamic = 'force-dynamic'

export const dynamic = 'force-dynamic'

function LoginForm() {
  const { login, error, loading, clearError } = useAuth();
>>>>>>> Stashed changes
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState('/api/admin/auth/login');
  const [loginRole, setLoginRole] = useState('branch_admin');
  const [showDefaultCreds, setShowDefaultCreds] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if already logged in on mount and handle role parameter
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const role = localStorage.getItem('admin_role');
    
    // Set role from URL query parameter
    const roleParam = searchParams.get('role');
    if (roleParam && (roleParam === 'super_admin' || roleParam === 'branch_admin')) {
      setLoginRole(roleParam);
      
      // Prefill username for super admin
      if (roleParam === 'super_admin') {
        setUsername('superadmin');
      }
    }
    
    if (token) {
      console.log('User already has a token, redirecting to dashboard');
      if (role === 'super_admin') {
        router.push('/admin/super');
      } else {
        router.push('/admin/dashboard');
      }
    }
    
    // Initialize API URL based on hostname
    const isLocalhost = 
      typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    // Use absolute URL in production to avoid CORS issues
    if (!isLocalhost) {
      const baseUrl = window.location.origin;
      setApiUrl(`${baseUrl}/api/admin/auth/login`);
      console.log(`Using absolute API URL: ${baseUrl}/api/admin/auth/login`);
    }
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log(`Attempting login with username: ${username}, role: ${loginRole}`);
    console.log(`Using API URL: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        cache: 'no-store',
        mode: 'cors',
        credentials: 'include',
      });

      console.log('Login response status:', response.status);
      
      // Log response headers for debugging
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('Response headers:', responseHeaders);
      
      let data;
      try {
        data = await response.json();
        console.log('Login response data structure:', Object.keys(data));
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        throw new Error('Server returned an invalid response format');
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      console.log('Login successful, processing response data');
      
      // Store token and admin data
      if (data.data && data.data.token) {
        localStorage.setItem('admin_token', data.data.token);
        
        if (data.data.admin && data.data.admin.role) {
          localStorage.setItem('admin_role', data.data.admin.role);
          localStorage.setItem('admin_name', data.data.admin.name || 'Admin User');
          localStorage.setItem('admin_id', data.data.admin.id.toString());
          
          console.log(`Logged in as ${data.data.admin.role}, redirecting...`);
          
          // Redirect based on role
          if (data.data.admin.role === 'super_admin') {
            router.push('/admin/super');
          } else {
            router.push('/admin/dashboard');
          }
        } else {
          // Default redirect if role isn't found
          console.log('Role not found in response, using default redirect');
          router.push('/admin/dashboard');
        }
      } else {
        throw new Error('Invalid response format - token missing');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = () => {
    const newRole = loginRole === 'super_admin' ? 'branch_admin' : 'super_admin';
    setLoginRole(newRole);
    setUsername(newRole === 'super_admin' ? 'superadmin' : '');
    setPassword('');
    setError('');
  };

  const getLoginText = () => {
    if (loading) return 'Logging in...';
    return loginRole === 'super_admin' ? 'Login as Super Admin' : 'Login as Branch Admin';
  };

  const getPageTitle = () => {
    return loginRole === 'super_admin' ? 'Super Admin Login' : 'Branch Admin Login';
  };

  const getButtonColor = () => {
    return loginRole === 'super_admin' 
      ? { backgroundColor: '#8b5cf6', hoverOpacity: '0.9' } // Purple for super admin
      : { backgroundColor: '#3b82f6', hoverOpacity: '0.9' }; // Blue for branch admin
  };

  const buttonStyle = getButtonColor();

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#1f2937'
        }}>
          {getPageTitle()}
        </h1>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label 
              htmlFor="username" 
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '1rem'
              }}
              placeholder="Enter your username"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label 
              htmlFor="password" 
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '1rem'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: buttonStyle.backgroundColor,
              color: 'white',
              padding: '0.625rem',
              borderRadius: '0.375rem',
              fontWeight: '500',
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? '0.7' : '1',
              border: 'none',
              marginBottom: '1rem'
            }}
          >
            {getLoginText()}
          </button>
        </form>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}>
          <button
            onClick={toggleRole}
            style={{
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            {loginRole === 'super_admin' 
              ? 'Switch to Branch Admin Login' 
              : 'Switch to Super Admin Login'}
          </button>
        </div>
        
        {loginRole === 'super_admin' && (
          <div style={{marginTop: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280'}}>
            <button 
              onClick={() => setShowDefaultCreds(!showDefaultCreds)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#3b82f6',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {showDefaultCreds ? 'Hide default credentials' : 'Show default credentials'}
            </button>
            {showDefaultCreds && (
              <div style={{marginTop: '0.5rem'}}>
                Default: superadmin / CoWorks@SuperAdmin2023
              </div>
            )}
          </div>
        )}
        
        <div style={{marginTop: '0.5rem', textAlign: 'center', fontSize: '0.75rem'}}>
          <a 
            href="/api/database-status" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{color: '#3b82f6'}}
          >
            Check Database Status
          </a>
        </div>
        
        <div style={{marginTop: '1rem', textAlign: 'center'}}>
          <a 
            href="/"
            style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textDecoration: 'none'
            }}
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
} 