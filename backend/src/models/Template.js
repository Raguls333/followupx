const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isSystem;
    }
  },
  // Template info
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  category: {
    type: String,
    enum: ['initial_contact', 'follow_up', 'appointment', 'closing', 're_engagement', 'thank_you', 'custom'],
    default: 'custom'
  },
  // Message content with variables
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  // Available variables for this template
  variables: [{
    type: String,
    enum: ['FirstName', 'LastName', 'FullName', 'Company', 'Email', 'Phone', 'PropertyType', 'Budget', 'Location']
  }],
  // Analytics
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },
  // System vs user templates
  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For organizing templates
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  // Language support
  language: {
    type: String,
    enum: ['en', 'hi', 'hinglish'],
    default: 'en'
  }
}, {
  timestamps: true
});

// Indexes
templateSchema.index({ userId: 1, category: 1 });
templateSchema.index({ isSystem: 1, category: 1 });
templateSchema.index({ userId: 1, usageCount: -1 });

// Extract variables from message
templateSchema.methods.extractVariables = function() {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = [];
  let match;
  while ((match = regex.exec(this.message)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
};

// Apply variables to message
templateSchema.methods.applyVariables = function(leadData) {
  let message = this.message;

  const variableMap = {
    FirstName: leadData.name?.first || '',
    LastName: leadData.name?.last || '',
    FullName: `${leadData.name?.first || ''} ${leadData.name?.last || ''}`.trim(),
    Company: leadData.company || '',
    Email: leadData.email || '',
    Phone: leadData.phone || '',
    PropertyType: leadData.propertyInterest?.propertyType || '',
    Budget: leadData.propertyInterest?.budget?.max
      ? `₹${(leadData.propertyInterest.budget.max / 100000).toFixed(0)} Lac`
      : '',
    Location: leadData.propertyInterest?.location || ''
  };

  Object.keys(variableMap).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    message = message.replace(regex, variableMap[key]);
  });

  // Clean up any remaining unused variables
  message = message.replace(/\{\{[^}]+\}\}/g, '');

  return message.trim();
};

// Increment usage
templateSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  await this.save();
};

// Static method to get templates for user (including system templates)
templateSchema.statics.getForUser = async function(userId, category = null) {
  const query = {
    $or: [
      { userId },
      { isSystem: true }
    ],
    isActive: true
  };

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .sort({ isSystem: 1, usageCount: -1 })
    .lean();
};

// Static method to seed system templates
templateSchema.statics.seedSystemTemplates = async function() {
  const systemTemplates = [
    {
      name: 'Initial Introduction',
      category: 'initial_contact',
      message: 'Hello {{FirstName}},\n\nThis is from FollowUpX. Thank you for your interest in our properties. I would love to understand your requirements better.\n\nWould you be available for a quick call?',
      variables: ['FirstName'],
      isSystem: true,
      language: 'en'
    },
    {
      name: 'Follow Up - No Response',
      category: 'follow_up',
      message: 'Hi {{FirstName}},\n\nI wanted to follow up on our previous conversation. Have you had a chance to consider the options we discussed?\n\nI am here to help if you have any questions.',
      variables: ['FirstName'],
      isSystem: true,
      language: 'en'
    },
    {
      name: 'Appointment Confirmation',
      category: 'appointment',
      message: 'Hi {{FirstName}},\n\nJust confirming our appointment. Looking forward to meeting you.\n\nPlease let me know if you need to reschedule.',
      variables: ['FirstName'],
      isSystem: true,
      language: 'en'
    },
    {
      name: 'Site Visit Invitation',
      category: 'appointment',
      message: 'Hello {{FirstName}},\n\nI have some exciting properties in {{Location}} that match your requirements.\n\nWould you like to schedule a site visit this weekend?',
      variables: ['FirstName', 'Location'],
      isSystem: true,
      language: 'en'
    },
    {
      name: 'Re-engagement',
      category: 're_engagement',
      message: 'Hi {{FirstName}},\n\nIt has been a while since we last spoke. I wanted to check if you are still looking for properties.\n\nWe have some new listings that might interest you.',
      variables: ['FirstName'],
      isSystem: true,
      language: 'en'
    },
    {
      name: 'Thank You - After Meeting',
      category: 'thank_you',
      message: 'Hi {{FirstName}},\n\nThank you for taking the time to meet with me today. It was great discussing your requirements.\n\nI will share the details we discussed shortly.',
      variables: ['FirstName'],
      isSystem: true,
      language: 'en'
    },
    {
      name: 'Deal Closing',
      category: 'closing',
      message: 'Hi {{FirstName}},\n\nI am excited to help you move forward with your property purchase. Let us finalize the details.\n\nWhen would be a good time to discuss the next steps?',
      variables: ['FirstName'],
      isSystem: true,
      language: 'en'
    },
    {
      name: 'Hindi - Initial Contact',
      category: 'initial_contact',
      message: 'नमस्ते {{FirstName}},\n\nमैं FollowUpX से हूं। आपकी रुचि के लिए धन्यवाद।\n\nक्या मैं आपकी आवश्यकताओं को बेहतर समझने के लिए एक कॉल कर सकता हूं?',
      variables: ['FirstName'],
      isSystem: true,
      language: 'hi'
    },
    {
      name: 'Hinglish - Casual Follow Up',
      category: 'follow_up',
      message: 'Hi {{FirstName}},\n\nKaise hain aap? Maine pichli baar jo properties discuss ki thi, un par aapka kya decision hua?\n\nKoi bhi question ho toh zaroor batayein.',
      variables: ['FirstName'],
      isSystem: true,
      language: 'hinglish'
    }
  ];

  for (const template of systemTemplates) {
    await this.findOneAndUpdate(
      { name: template.name, isSystem: true },
      template,
      { upsert: true, new: true }
    );
  }

  console.log('System templates seeded');
};

module.exports = mongoose.model('Template', templateSchema);
