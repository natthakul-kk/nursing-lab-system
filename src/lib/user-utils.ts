export const COMMON_USER_PREFIXES = [
  'นาย',
  'นาง',
  'นางสาว',
  'อ.',
  'อาจารย์',
  'ดร.',
  'ผศ.',
  'ผศ.ดร.',
  'รศ.',
  'รศ.ดร.',
  'ศ.',
  'ศ.ดร.',
  'ว่าที่ ร.ต.',
  'ว่าที่ ร.ต.หญิง',
  'นศ.พย.',
];

/**
 * Format a user's full display name cleanly with prefix without accidental duplication
 */
export function formatUserName(user?: { prefix?: string | null; name?: string | null } | null): string {
  if (!user) return '';
  const prefix = (user.prefix || '').trim();
  const name = (user.name || '').trim();

  if (!prefix) return name;
  if (!name) return prefix;

  // If the name already starts with this prefix, do not duplicate
  if (name.startsWith(prefix)) {
    return name;
  }

  // Thai pronouns without space, academic titles with space
  if (['นาย', 'นาง', 'นางสาว'].includes(prefix)) {
    return `${prefix}${name}`;
  }

  return `${prefix} ${name}`;
}
