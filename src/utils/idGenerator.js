import IdSequence from '../models/IdSequence.js';
import mongoose from 'mongoose';

/**
 * ID Generator Utility
 * Generates unique IDs with custom prefixes using sequence tracking
 * Matches Supabase ID generation system
 */

/**
 * Generate date string in format YYMMDD
 */
const getDateString = (date = new Date()) => {
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Generate global date string for global sequences
 */
const getGlobalDateString = () => {
  return 'global';
};

/**
 * Get next sequence number for a prefix and date
 */
const getNextSequence = async (prefix, dateStr = null) => {
  try {
    const actualDateStr = dateStr || getDateString();
    
    // Try to find existing sequence
    let sequence = await IdSequence.findOne({ 
      prefix: prefix.toUpperCase(), 
      date_str: actualDateStr 
    });

    if (sequence) {
      // Increment existing sequence
      sequence.last_sequence += 1;
      await sequence.save();
      return sequence.last_sequence;
    } else {
      // Create new sequence
      const newSequence = new IdSequence({
        id: await getNextIdSequenceId(),
        prefix: prefix.toUpperCase(),
        date_str: actualDateStr,
        last_sequence: 1
      });
      await newSequence.save();
      return 1;
    }
  } catch (error) {
    console.error('Error getting next sequence:', error);
    throw error;
  }
};

/**
 * Get next ID sequence ID (for the sequence table itself)
 */
const getNextIdSequenceId = async () => {
  try {
    const lastSequence = await IdSequence.findOne({}, {}, { sort: { id: -1 } });
    return lastSequence ? lastSequence.id + 1 : 1;
  } catch (error) {
    console.error('Error getting next ID sequence ID:', error);
    return 1;
  }
};

/**
 * Generate ID with prefix and sequence
 * Format: PREFIX-DATE-XXX (e.g., PRO-251013-001)
 */
export const generateId = async (prefix = 'ID', useGlobal = false) => {
  try {
    const dateStr = useGlobal ? getGlobalDateString() : getDateString();
    const sequence = await getNextSequence(prefix, useGlobal ? 'global' : null);
    const paddedSequence = String(sequence).padStart(3, '0');
    return `${prefix.toUpperCase()}-${dateStr}-${paddedSequence}`;
  } catch (error) {
    console.error('Error generating ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `${prefix.toUpperCase()}_${timestamp}_${randomStr}`;
  }
};

/**
 * Generate QR code ID
 * Format: QR-DATE-XXX
 */
export const generateQRCode = async () => {
  return await generateId('QR');
};

/**
 * Generate Product ID
 * Format: PRO-DATE-XXX
 */
export const generateProductId = async () => {
  return await generateId('PRO');
};

/**
 * Generate Individual Product ID
 * Format: IPD-DATE-XXX
 */
export const generateIndividualProductId = async () => {
  return await generateId('IPD');
};

/**
 * Generate Customer ID
 * Format: CUST-DATE-XXX (or CUST-global-XXX for global sequence)
 */
export const generateCustomerId = async (useGlobal = true) => {
  return await generateId('CUST', useGlobal);
};

/**
 * Generate Order ID
 * Format: ORD-DATE-XXX
 */
export const generateOrderId = async () => {
  return await generateId('ORD');
};

/**
 * Generate Order Item ID
 * Format: ORDITEM-DATE-XXX
 */
export const generateOrderItemId = async () => {
  return await generateId('ORDITEM');
};

/**
 * Generate Raw Material ID
 * Format: MAT-DATE-XXX
 */
export const generateRawMaterialId = async () => {
  return await generateId('MAT');
};

/**
 * Generate Supplier ID
 * Format: SUP-DATE-XXX
 */
export const generateSupplierId = async () => {
  return await generateId('SUP');
};

/**
 * Generate Purchase Order ID
 * Format: PO-DATE-XXX
 */
export const generatePurchaseOrderId = async () => {
  return await generateId('PO');
};

/**
 * Generate Recipe ID
 * Format: RECIPE-DATE-XXX
 */
export const generateRecipeId = async () => {
  return await generateId('RECIPE');
};

/**
 * Generate Recipe Material ID
 * Format: RECMAT-DATE-XXX
 */
export const generateRecipeMaterialId = async () => {
  return await generateId('RECMAT');
};

/**
 * Generate Audit ID
 * Format: AUDIT-DATE-XXX
 */
export const generateAuditId = async () => {
  return await generateId('AUDIT');
};

/**
 * Generate order number in format: ON-DATE-XXX
 */
export const generateOrderNumber = async () => {
  const dateStr = getDateString();
  const sequence = await getNextSequence('ON', dateStr);
  const paddedSequence = String(sequence).padStart(3, '0');
  return `ON-${dateStr}-${paddedSequence}`;
};

/**
 * Generate batch number
 */
export const generateBatchNumber = (materialCode = 'MAT') => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BATCH-${materialCode}-${year}${month}-${random}`;
};

/**
 * Get current sequence info for a prefix
 */
export const getSequenceInfo = async (prefix, dateStr = null) => {
  try {
    const actualDateStr = dateStr || getDateString();
    const sequence = await IdSequence.findOne({ 
      prefix: prefix.toUpperCase(), 
      date_str: actualDateStr 
    });
    
    return sequence ? {
      prefix: sequence.prefix,
      date_str: sequence.date_str,
      last_sequence: sequence.last_sequence,
      created_at: sequence.created_at,
      updated_at: sequence.updated_at
    } : null;
  } catch (error) {
    console.error('Error getting sequence info:', error);
    return null;
  }
};

/**
 * Get all sequences for a prefix
 */
export const getAllSequencesForPrefix = async (prefix) => {
  try {
    return await IdSequence.find({ prefix: prefix.toUpperCase() })
      .sort({ date_str: -1 });
  } catch (error) {
    console.error('Error getting sequences for prefix:', error);
    return [];
  }
};

export default {
  generateId,
  generateQRCode,
  generateProductId,
  generateIndividualProductId,
  generateCustomerId,
  generateOrderId,
  generateOrderItemId,
  generateRawMaterialId,
  generateSupplierId,
  generatePurchaseOrderId,
  generateRecipeId,
  generateRecipeMaterialId,
  generateAuditId,
  generateOrderNumber,
  generateBatchNumber,
  getSequenceInfo,
  getAllSequencesForPrefix
};
