/**
 * Escape special regex characters in a string to prevent regex syntax errors
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string safe for use in regex
 */
export const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Create a case-insensitive regex search query for MongoDB
 * @param {string} searchTerm - The search term
 * @param {string[]} fields - Array of field names to search
 * @returns {Object} - MongoDB $or query object
 */
export const createSearchQuery = (searchTerm, fields) => {
  if (!searchTerm || !fields || fields.length === 0) return {};

  const escapedSearch = escapeRegex(searchTerm);
  return {
    $or: fields.map(field => ({
      [field]: { $regex: escapedSearch, $options: 'i' }
    }))
  };
};
