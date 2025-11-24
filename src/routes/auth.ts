import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = new User({ name, email, password, phone, role: role || 'user' });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Google Login
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const { email, name, sub: googleId, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email not found in Google token' });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name: name || 'Google User',
        email,
        password: Math.random().toString(36).slice(-8), // Random password for google users
        role: 'user',
        googleId,
        avatar: picture
      });
      await user.save();
    } else if (!user.googleId) {
      // Link google ID if user exists but hasn't logged in with google before
      user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    // Generate token
    const jwtToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      token: jwtToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
    });
  } catch (error: any) {
    console.error('Google login error:', error);
    res.status(400).json({ error: 'Google login failed' });
  }
});

// Forgot Password - Demo endpoint (simulates email sending)
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });

    // For security, always return success even if user doesn't exist
    // In production, you would:
    // 1. Generate a reset token: const resetToken = crypto.randomBytes(32).toString('hex');
    // 2. Hash and store it: user.resetToken = hash(resetToken); user.resetTokenExpiry = Date.now() + 3600000;
    // 3. Send email with link: sendEmail(email, `Reset link: ${FRONTEND_URL}/reset-password/${resetToken}`);

    // For demo, we'll just log and return success
    console.log(`Password reset requested for: ${email}`);
    if (user) {
      console.log(`User found: ${user.name}`);
    }

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
      success: true
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Admin Login (requires admin role)
router.post('/admin-login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin' && user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Check password
    if (!user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate admin token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: '7d', // Admin sessions last 7 days
      }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('[Admin login error]', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// --- OTP AUTH START ---
const otpStore: Record<string, { otp: string; expires: number }> = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Request OTP
router.post('/otp/request', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[phone] = { otp, expires: Date.now() + OTP_EXPIRY_MS };
  // In production, send SMS here. For demo, return OTP in response.
  res.status(200).json({ message: 'OTP sent', phone, otp });
});

// Verify OTP and login/signup
router.post('/otp/verify', async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
  const record = otpStore[phone];
  if (!record || record.expires < Date.now()) return res.status(400).json({ error: 'OTP expired or invalid' });
  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  // OTP verified, find or create user
  let user = await User.findOne({ phone });
  if (!user) {
    user = new User({ name: 'New User', phone, email: `u${phone}@example.com`, password: phone });
    await user.save();
  }
  // Issue JWT
  const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  // Clean OTP
  delete otpStore[phone];
  res.status(200).json({
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      addresses: user.addresses || [],
    },
  });
});
// --- OTP AUTH END ---

// Helper function to verify Clerk JWT token
async function verifyClerkToken(token: string): Promise<any> {
  // In production, you would verify the Clerk JWT here
  // For now, this is a stub that throws, triggering the bypass logic
  throw new Error('Clerk verification not implemented');
}

// POST /api/auth/clerk-verify
router.post('/clerk-verify', async (req, res) => {
  const { token } = req.body;
  try {
    // 1. Verify Clerk JWT from frontend (or bypass in non-production for simplicity)
    let payload: any = null;
    try {
      payload = await verifyClerkToken(token);
    } catch (e) {
      const allowBypass = (process.env.ALLOW_AUTH_BYPASS ?? (process.env.NODE_ENV !== 'production' ? 'true' : 'false')) as string;
      if (allowBypass.toLowerCase() === 'true') {
        // Minimal payload fallback for dev
        payload = {
          sub: 'dev-clerk-id',
          first_name: 'Dev',
          last_name: 'User',
          email_address: 'dev@example.com',
          email_addresses: [{ email_address: 'dev@example.com' }],
        };
      } else {
        throw e;
      }
    }
    // 2. Find or create local user by Clerk ID
    let user = await User.findOne({ clerkId: payload.sub });
    if (!user) {
      user = new User({
        clerkId: payload.sub,
        name: ((payload.first_name || '') + (payload.last_name ? ` ${payload.last_name}` : '')).trim() || 'User',
        email: Array.isArray(payload.email_addresses)
          ? (payload.email_addresses[0]?.email_address || '')
          : payload.email_address || '',
      });
      await user.save();
    }
    // Promote to admin based on env-configured emails or dev flag
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const allowAllAdminDev = ((process.env.ALLOW_ALL_AS_ADMIN_IN_DEV ?? (process.env.NODE_ENV !== 'production' ? 'true' : 'false')) as string).toLowerCase() === 'true';
    if ((adminEmails.includes((user.email || '').toLowerCase()) || allowAllAdminDev) && user.role !== 'admin' && user.role !== 'super-admin') {
      user.role = 'admin';
      await user.save();
    }
    // 3. Issue backend JWT
    const yourJwt = jwt.sign(
      { userId: user._id, email: user.email, clerkId: user.clerkId, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    res.json({ token: yourJwt, user });
  } catch (err) {
    console.error('[Clerk verify error]', err);
    res.status(401).json({ error: 'Invalid Clerk JWT' });
  }
});

export default router;

