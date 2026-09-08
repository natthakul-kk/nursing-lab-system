import bcrypt from 'bcryptjs';

/**
 * Hash password with bcrypt (cost factor 10)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password against stored password
 * Supports both bcrypt hashes and legacy plaintext (with migration flag)
 */
export async function verifyPassword(
  passwordAttempt: string,
  storedPassword: string
): Promise<{ isValid: boolean; needsMigration: boolean }> {
  if (!storedPassword) {
    return { isValid: false, needsMigration: false };
  }

  // Check if stored password is a bcrypt hash
  const isBcrypt = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$');

  if (isBcrypt) {
    const isValid = await bcrypt.compare(passwordAttempt, storedPassword);
    return { isValid, needsMigration: false };
  }

  // Plaintext comparison for legacy accounts
  const isPlaintextMatch = passwordAttempt === storedPassword;
  return {
    isValid: isPlaintextMatch,
    needsMigration: isPlaintextMatch,
  };
}

/**
 * Validate password complexity/length
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return { valid: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' };
  }
  return { valid: true };
}

/**
 * Generate 6-digit numeric OTP code for password reset
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
