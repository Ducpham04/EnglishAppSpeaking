const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeJoinCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function generateJoinCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}
