/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of edits needed to transform one string into another
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity percentage between two strings
 * Returns a value between 0 and 1 (1 being identical)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLength);
}

/**
 * Check if a search term fuzzy matches a target string
 * @param {string} searchTerm - The search query
 * @param {string} targetString - The string to match against
 * @param {number} threshold - Minimum similarity threshold (0-1), default 0.8 (80%)
 * @returns {boolean} - True if match is above threshold
 */
export function fuzzyMatch(searchTerm, targetString, threshold = 0.8) {
  if (!searchTerm || !targetString) return false;

  const search = searchTerm.toLowerCase().trim();
  const target = targetString.toLowerCase().trim();

  // Exact substring match (highest priority)
  if (target.includes(search)) return true;

  // Check if search words are contained in target
  const searchWords = search.split(/\s+/);
  const targetWords = target.split(/\s+/);

  // If all search words are found in target words, it's a match
  const allWordsFound = searchWords.every(searchWord =>
    targetWords.some(targetWord =>
      targetWord.includes(searchWord) || calculateSimilarity(searchWord, targetWord) >= threshold
    )
  );

  if (allWordsFound) return true;

  // Calculate overall similarity
  const similarity = calculateSimilarity(search, target);
  return similarity >= threshold;
}

/**
 * Build a fuzzy search query for MongoDB
 * @param {string} searchTerm - The search query
 * @param {string[]} fields - Fields to search in
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {object} - MongoDB query object
 */
export function buildFuzzySearchQuery(searchTerm, fields, threshold = 0.8) {
  if (!searchTerm || !fields || fields.length === 0) {
    return {};
  }

  const search = searchTerm.toLowerCase().trim();

  // Create regex pattern that allows for some character variations
  // This creates a pattern that matches even with typos
  const words = search.split(/\s+/);
  const regexPatterns = words.map(word => {
    // Escape special regex characters
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow optional characters between each letter for fuzzy matching
    return escaped.split('').join('.?');
  });

  const orConditions = [];

  fields.forEach(field => {
    // Exact substring match (case-insensitive)
    orConditions.push({
      [field]: { $regex: search, $options: 'i' }
    });

    // Fuzzy match for each word
    words.forEach((word, index) => {
      orConditions.push({
        [field]: { $regex: regexPatterns[index], $options: 'i' }
      });
    });
  });

  return { $or: orConditions };
}

/**
 * Filter array results by fuzzy matching (for post-processing)
 * @param {Array} items - Items to filter
 * @param {string} searchTerm - Search query
 * @param {string[]} fields - Fields to search in
 * @param {number} threshold - Similarity threshold
 * @returns {Array} - Filtered and sorted items
 */
export function fuzzyFilterAndSort(items, searchTerm, fields, threshold = 0.8) {
  if (!searchTerm || !items || items.length === 0) {
    return items;
  }

  const resultsWithScores = items.map(item => {
    let maxScore = 0;

    fields.forEach(field => {
      const fieldValue = item[field];
      if (fieldValue && typeof fieldValue === 'string') {
        const score = calculateSimilarity(searchTerm, fieldValue);
        maxScore = Math.max(maxScore, score);
      }
    });

    return {
      item,
      score: maxScore
    };
  });

  // Filter by threshold and sort by score (descending)
  return resultsWithScores
    .filter(result => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(result => result.item);
}
