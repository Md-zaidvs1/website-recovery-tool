import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Users } from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'website_recovery_super_secret_key_13579';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required' });
    return;
  }

  try {
    const inputStr = email.trim();
    const user = Users.findOne((u) => u.email.toLowerCase() === inputStr.toLowerCase() || u.name.toLowerCase() === inputStr.toLowerCase());
    
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ success: false, error: 'User account is inactive' });
      return;
    }

    // Verify password (supporting both hashed and plain text fallback for easy testing)
    const isMatch = user.password ? bcrypt.compareSync(password, user.password) : false;
    
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE as any }
    );

    // Update lastLogin
    Users.findByIdAndUpdate(user.id, { lastLogin: new Date().toISOString() });

    // Return profile without password
    const { password: _, ...userProfile } = user;

    res.json({
      success: true,
      token,
      user: userProfile,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
}

export function getProfile(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const user = Users.findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { password: _, ...userProfile } = user;
    res.json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error fetching profile' });
  }
}
