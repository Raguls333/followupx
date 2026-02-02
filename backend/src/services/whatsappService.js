/**
 * WhatsApp Service
 * Generates WhatsApp click-to-chat links
 */

/**
 * Format phone number to E.164 format for Indian numbers
 * @param {string} phone - Phone number in any format
 * @returns {string|null} - Formatted phone number or null if invalid
 */
const formatPhone = (phone) => {
  if (!phone) return null;

  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');

  // If it's 10 digits starting with 6-9, add 91 prefix
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }

  // Validate: Must be 12 digits starting with 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }

  return null;
};

/**
 * Generate WhatsApp click-to-chat link
 * @param {string} phone - Phone number
 * @param {string} message - Optional message to pre-fill
 * @param {string} leadId - Optional lead ID for tracking
 * @returns {Object} - Link and formatted message
 */
const generateLink = (phone, message = '', leadId = null) => {
  const formattedPhone = formatPhone(phone);

  if (!formattedPhone) {
    throw new Error('Invalid phone number format');
  }

  let finalMessage = message;

  // Add tracking reference if leadId provided
  if (leadId && message) {
    finalMessage = `${message}\n\n[Ref: ${leadId}]`;
  }

  // URL encode the message
  const encodedMessage = encodeURIComponent(finalMessage);

  // Build the WhatsApp URL
  const link = finalMessage
    ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    : `https://wa.me/${formattedPhone}`;

  return {
    link,
    phone: formattedPhone,
    message: finalMessage
  };
};

/**
 * Apply template variables to message
 * @param {string} templateText - Template with {{variables}}
 * @param {Object} variables - Object with variable values
 * @returns {string} - Message with variables replaced
 */
const applyTemplate = (templateText, variables) => {
  let message = templateText;

  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    message = message.replace(regex, variables[key] || '');
  });

  // Clean up any remaining unused variables
  message = message.replace(/\{\{[^}]+\}\}/g, '');

  return message.trim();
};

/**
 * Build variables object from lead data
 * @param {Object} lead - Lead document
 * @returns {Object} - Variables object for template
 */
const buildVariables = (lead) => {
  return {
    FirstName: lead.name?.first || '',
    LastName: lead.name?.last || '',
    FullName: `${lead.name?.first || ''} ${lead.name?.last || ''}`.trim(),
    Company: lead.company || '',
    Email: lead.email || '',
    Phone: lead.phone || '',
    PropertyType: lead.propertyInterest?.propertyType || '',
    Budget: lead.propertyInterest?.budget?.max
      ? formatBudget(lead.propertyInterest.budget.max)
      : '',
    Location: lead.propertyInterest?.location || ''
  };
};

/**
 * Format budget amount to readable string
 * @param {number} amount - Budget amount in INR
 * @returns {string} - Formatted budget string
 */
const formatBudget = (amount) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(0)} Lac`;
  } else {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
};

/**
 * Generate WhatsApp link from template and lead
 * @param {Object} lead - Lead document
 * @param {Object} template - Template document
 * @returns {Object} - Generated link data
 */
const generateFromTemplate = (lead, template) => {
  const variables = buildVariables(lead);
  const message = applyTemplate(template.message, variables);
  return generateLink(lead.phone, message, lead._id?.toString());
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether the phone is valid
 */
const isValidPhone = (phone) => {
  return formatPhone(phone) !== null;
};

module.exports = {
  formatPhone,
  generateLink,
  applyTemplate,
  buildVariables,
  formatBudget,
  generateFromTemplate,
  isValidPhone
};
