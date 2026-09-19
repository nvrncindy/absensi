import bcrypt from "bcryptjs";

// Employee PINs are 4-6 digit codes, but they still gate a real check-in
// record, so they're hashed like a password rather than stored as plaintext.
const SALT_ROUNDS = 10;

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
