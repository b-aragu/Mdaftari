/**
 * Person Deduplication / Merge Storage
 * 
 * Stores mappings where one person name/phone is linked to another (canonical) identity.
 * This enables merging duplicate people in the UI.
 */

const PERSON_MERGES_KEY = 'mdaftari_person_merges';

export interface PersonMerge {
    aliasName: string;      // The duplicate name (e.g. "JOHN DOE")
    aliasPhone?: string;    // The duplicate phone
    canonicalName: string;  // The "real" name to merge into (e.g. "John Doe")
    canonicalPhone?: string;
    createdAt: number;
}

/**
 * Normalize a name for comparison (lowercase, trim, collapse spaces)
 */
export function normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Normalize a phone for comparison (remove spaces, leading zeros, +254 prefix)
 */
export function normalizePhone(phone: string | undefined): string | undefined {
    if (!phone) return undefined;
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    // Convert +254 to 0
    if (normalized.startsWith('+254')) {
        normalized = '0' + normalized.slice(4);
    }
    // Remove leading zeros for comparison (keep last 9 digits)
    if (normalized.length >= 9) {
        normalized = normalized.slice(-9);
    }
    return normalized;
}

/**
 * Get all person merges from localStorage
 */
export function getPersonMerges(): PersonMerge[] {
    try {
        const stored = localStorage.getItem(PERSON_MERGES_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

/**
 * Add a merge (link alias to canonical identity)
 */
export function addPersonMerge(
    aliasName: string,
    aliasPhone: string | undefined,
    canonicalName: string,
    canonicalPhone: string | undefined
): PersonMerge {
    const merges = getPersonMerges();

    const merge: PersonMerge = {
        aliasName,
        aliasPhone,
        canonicalName,
        canonicalPhone,
        createdAt: Date.now()
    };

    // Remove any existing merge for this alias
    const filtered = merges.filter(m =>
        normalizeName(m.aliasName) !== normalizeName(aliasName)
    );

    filtered.push(merge);
    localStorage.setItem(PERSON_MERGES_KEY, JSON.stringify(filtered));

    return merge;
}

/**
 * Remove a merge
 */
export function removePersonMerge(aliasName: string): boolean {
    const merges = getPersonMerges();
    const filtered = merges.filter(m =>
        normalizeName(m.aliasName) !== normalizeName(aliasName)
    );

    if (filtered.length === merges.length) return false;

    localStorage.setItem(PERSON_MERGES_KEY, JSON.stringify(filtered));
    return true;
}

/**
 * Get the canonical name for a given name (resolves merges)
 */
export function getCanonicalName(name: string): string {
    const merges = getPersonMerges();
    const normalized = normalizeName(name);

    const merge = merges.find(m => normalizeName(m.aliasName) === normalized);
    if (merge) return merge.canonicalName;

    return name; // No merge found, return original
}

/**
 * Check if two people should be considered the same
 * (by phone match, name match, or merge mapping)
 */
export function isSamePerson(
    name1: string, phone1: string | undefined,
    name2: string, phone2: string | undefined
): boolean {
    // 1. Phone match (most reliable)
    if (phone1 && phone2) {
        const p1 = normalizePhone(phone1);
        const p2 = normalizePhone(phone2);
        if (p1 && p2 && p1 === p2) return true;
    }

    // 2. Exact name match (case-insensitive)
    if (normalizeName(name1) === normalizeName(name2)) return true;

    // 3. Check merge mappings
    const canonical1 = getCanonicalName(name1);
    const canonical2 = getCanonicalName(name2);
    if (normalizeName(canonical1) === normalizeName(canonical2)) return true;

    return false;
}

/**
 * Find potential duplicates using fuzzy matching
 * Returns pairs of names that might be the same person
 */
export function findPotentialDuplicates(names: { name: string; phone?: string }[]): { name1: string; name2: string; similarity: number; reason: string }[] {
    const duplicates: { name1: string; name2: string; similarity: number; reason: string }[] = [];

    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            const a = names[i]!;
            const b = names[j]!;

            // Skip if already the same (normalized)
            if (normalizeName(a.name) === normalizeName(b.name)) continue;

            // Check phone match
            if (a.phone && b.phone) {
                const p1 = normalizePhone(a.phone);
                const p2 = normalizePhone(b.phone);
                if (p1 && p2 && p1 === p2) {
                    duplicates.push({
                        name1: a.name,
                        name2: b.name,
                        similarity: 1.0,
                        reason: 'Same phone number'
                    });
                    continue;
                }
            }

            // Check for similar names (first name match, etc.)
            const similarity = getNameSimilarity(a.name, b.name);
            if (similarity >= 0.6) {
                duplicates.push({
                    name1: a.name,
                    name2: b.name,
                    similarity,
                    reason: 'Similar name'
                });
            }
        }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Simple name similarity score (0-1)
 */
function getNameSimilarity(name1: string, name2: string): number {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);

    const words1 = n1.split(' ');
    const words2 = n2.split(' ');

    // Check if first names match
    if (words1[0] === words2[0]) return 0.7;

    // Check if any words match
    const common = words1.filter(w => words2.includes(w));
    if (common.length > 0) {
        return 0.5 + (common.length / Math.max(words1.length, words2.length)) * 0.3;
    }

    // Check for substring (one name is part of another)
    if (n1.includes(n2) || n2.includes(n1)) return 0.6;

    return 0;
}
