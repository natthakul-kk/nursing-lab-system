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
  'รศ. พลตรีหญิง',
  'พลตรีหญิง',
  'ว่าที่ ร.ต.',
  'ว่าที่ ร.ต.หญิง',
  'นศ.พย.',
];

export const ACADEMIC_PREFIXES = [
  'รศ. พลตรีหญิง',
  'พลตรีหญิง',
  'ศ.ดร.',
  'ศ.',
  'รศ.ดร.',
  'รศ.',
  'ผศ.ดร.',
  'ผศ.',
  'ดร.',
  'อาจารย์',
  'อ.',
  'ว่าที่ ร.ต.หญิง',
  'ว่าที่ ร.ต.',
  'นพ.',
  'พญ.',
  'นายแพทย์',
  'แพทย์หญิง',
];

export const PERSONAL_PREFIXES = ['นางสาว', 'นาง', 'นาย'];

/**
 * Strips all personal and academic prefixes from a name string to extract the raw name
 */
export function stripAllPrefixes(name?: string | null): string {
  if (!name) return '';
  let str = name.trim();
  let changed = true;

  while (changed) {
    changed = false;

    // 1. Remove stacked prefixes like "อาจารย์ นางสาว", "อาจารย์ นาย", "อาจารย์ ผศ."
    const stacked = /^(อาจารย์|อ\.)\s*(นางสาว|นาง|นาย|ผศ\.ดร\.|ผศ\.|รศ\.ดร\.|รศ\.|ศ\.ดร\.|ศ\.|ดร\.)\s*/;
    if (stacked.test(str)) {
      str = str.replace(stacked, '$2 ');
      changed = true;
    }

    // 2. Remove personal pronouns
    for (const p of PERSONAL_PREFIXES) {
      if (str.startsWith(p)) {
        str = str.slice(p.length).trim();
        changed = true;
        break;
      }
    }

    // 3. Remove academic ranks
    for (const r of ACADEMIC_PREFIXES) {
      if (str.startsWith(r)) {
        str = str.slice(r.length).trim();
        changed = true;
        break;
      }
    }
  }

  return str.trim();
}

/**
 * Format a user's full display name cleanly with prefix without accidental duplication.
 * Works for both User objects { prefix, name } and plain name strings.
 */
export function formatUserName(
  user?: { prefix?: string | null; name?: string | null } | string | null
): string {
  if (!user) return '';

  if (typeof user === 'string') {
    let str = user.trim();
    // Clean stacked prefixes like 'อาจารย์ นางสาว' or 'อาจารย์ นาย'
    str = str.replace(/^(อาจารย์|อ\.)\s*(นางสาว|นาง|นาย)\s*/, 'อาจารย์');
    return str;
  }

  const prefix = (user.prefix || '').trim();
  let name = (user.name || '').trim();

  if (!prefix) return name;
  if (!name) return prefix;

  // If name already starts with prefix, do not duplicate
  if (name.startsWith(prefix)) {
    return name;
  }

  // If prefix is a personal pronoun, ensure name doesn't already start with personal pronoun
  for (const p of PERSONAL_PREFIXES) {
    if (name.startsWith(p)) {
      name = name.slice(p.length).trim();
      break;
    }
  }

  // Thai pronouns without space, academic titles with space
  if (PERSONAL_PREFIXES.includes(prefix)) {
    return `${prefix}${name}`;
  }

  return `${prefix} ${name}`.trim();
}

/**
 * Format an instructor / teacher / advisor display name cleanly according to Thai academic protocol:
 * - If teacher has an academic rank (ผศ., ผศ.ดร., รศ., ศ., ดร.), use that rank alone (NEVER prepend "อาจารย์").
 * - If teacher has a personal pronoun (นาย, นาง, นางสาว) or no rank, address them as "อาจารย์" (NEVER "อาจารย์ นางสาว").
 * - Automatically cleans any stacked "อาจารย์ นางสาว" or "อาจารย์ ผศ.".
 */
export function formatTeacherName(
  teacher?: { prefix?: string | null; name?: string | null } | string | null
): string {
  if (!teacher) return '';

  let rawPrefix = '';
  let rawName = '';

  if (typeof teacher === 'object' && teacher !== null) {
    rawPrefix = (teacher.prefix || '').trim();
    rawName = (teacher.name || '').trim();
  } else if (typeof teacher === 'string') {
    rawName = teacher.trim();
  }

  if (!rawPrefix && !rawName) return '';

  // 1. Clean stacked "อาจารย์ นางสาว", "อาจารย์ นาย", "อาจารย์ ผศ."
  rawName = rawName.replace(/^(อาจารย์|อ\.)\s*(นางสาว|นาง|นาย)\s*/, '');
  rawName = rawName.replace(/^(อาจารย์|อ\.)\s*(ผศ\.ดร\.|ผศ\.|รศ\.ดร\.|รศ\.|ศ\.ดร\.|ศ\.|ดร\.)\s*/, '$2 ');

  // 2. Check academic ranks in prefix
  const isAcademicPrefix = ACADEMIC_PREFIXES.some(
    (r) => r !== 'อาจารย์' && r !== 'อ.' && (rawPrefix.startsWith(r) || rawPrefix === r)
  );

  if (isAcademicPrefix) {
    const cleanName = stripAllPrefixes(rawName);
    // Special case for military/honorific + doctoral degree (e.g. 'รศ. พลตรีหญิง' + 'ดร.สายสมร')
    if (rawName.startsWith('ดร.') && !rawPrefix.includes('ดร.')) {
      return `${rawPrefix} ${rawName}`.trim();
    }
    return `${rawPrefix} ${cleanName}`.trim();
  }

  // 3. Check if rawName itself starts with an academic rank (e.g. ผศ.ดร. ชญาภรณ์ or ดร.สายสมร)
  for (const rank of ACADEMIC_PREFIXES) {
    if (rank !== 'อาจารย์' && rank !== 'อ.' && rawName.startsWith(rank)) {
      return rawName;
    }
  }

  // 4. If prefix is already อาจารย์ or อ.
  if (rawPrefix === 'อาจารย์' || rawPrefix === 'อ.') {
    const cleanName = stripAllPrefixes(rawName);
    return `อาจารย์${cleanName}`;
  }

  // 5. Otherwise (personal pronoun or no prefix): address as อาจารย์ + name
  const cleanName = stripAllPrefixes(rawName);
  return `อาจารย์${cleanName}`;
}
