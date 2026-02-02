const Lead = require('../models/Lead');
const Template = require('../models/Template');
const Activity = require('../models/Activity');
const whatsappService = require('../services/whatsappService');

// @desc    Generate WhatsApp link
// @route   POST /api/whatsapp/generate-link
// @access  Private
const generateLink = async (req, res, next) => {
  try {
    const { leadId, templateId, customMessage } = req.body;

    // Get lead
    const lead = await Lead.findOne({
      _id: leadId,
      userId: req.user._id,
      isDeleted: false
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'NOT_FOUND'
        }
      });
    }

    let message = customMessage || '';
    let template = null;

    // If template provided, fetch and apply
    if (templateId) {
      template = await Template.findOne({
        _id: templateId,
        $or: [
          { userId: req.user._id },
          { isSystem: true }
        ],
        isActive: true
      });

      if (template) {
        message = template.applyVariables(lead);
      }
    }

    // Generate link
    const result = whatsappService.generateLink(lead.phone, message, lead._id.toString());

    res.json({
      success: true,
      data: {
        ...result,
        lead: {
          id: lead._id,
          name: lead.name,
          phone: lead.phone
        },
        template: template ? {
          id: template._id,
          name: template.name
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log WhatsApp send
// @route   POST /api/whatsapp/log-send
// @access  Private
const logSend = async (req, res, next) => {
  try {
    const { leadId, templateId, message } = req.body;

    // Verify lead
    const lead = await Lead.findOne({
      _id: leadId,
      userId: req.user._id,
      isDeleted: false
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lead not found',
          code: 'NOT_FOUND'
        }
      });
    }

    // Log activity
    const activity = await Activity.log({
      userId: req.user._id,
      leadId,
      type: 'whatsapp_sent',
      title: 'WhatsApp message sent',
      description: message ? message.substring(0, 200) + (message.length > 200 ? '...' : '') : 'Message sent via WhatsApp',
      templateId,
      metadata: {
        templateId,
        messageLength: message?.length
      }
    });

    // Update lead's lastContactedAt
    lead.lastContactedAt = new Date();
    await lead.save();

    // Increment template usage if used
    if (templateId) {
      const template = await Template.findById(templateId);
      if (template) {
        await template.incrementUsage();
      }
    }

    res.json({
      success: true,
      data: {
        activity
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get templates
// @route   GET /api/whatsapp/templates
// @access  Private
const getTemplates = async (req, res, next) => {
  try {
    const { category, language } = req.query;

    const query = {
      $or: [
        { userId: req.user._id },
        { isSystem: true }
      ],
      isActive: true
    };

    if (category) {
      query.category = category;
    }

    if (language) {
      query.language = language;
    }

    const templates = await Template.find(query)
      .sort({ isSystem: 1, usageCount: -1, name: 1 })
      .lean();

    // Group by category for frontend
    const grouped = {};
    templates.forEach(t => {
      if (!grouped[t.category]) {
        grouped[t.category] = [];
      }
      grouped[t.category].push(t);
    });

    res.json({
      success: true,
      data: {
        templates,
        grouped
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create template
// @route   POST /api/whatsapp/templates
// @access  Private
const createTemplate = async (req, res, next) => {
  try {
    const { name, category, message, language, tags } = req.body;

    // Extract variables from message
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;
    while ((match = variableRegex.exec(message)) !== null) {
      const varName = match[1];
      const validVars = ['FirstName', 'LastName', 'FullName', 'Company', 'Email', 'Phone', 'PropertyType', 'Budget', 'Location'];
      if (validVars.includes(varName) && !variables.includes(varName)) {
        variables.push(varName);
      }
    }

    const template = await Template.create({
      userId: req.user._id,
      name,
      category: category || 'custom',
      message,
      variables,
      language: language || 'en',
      tags: tags || [],
      isSystem: false
    });

    res.status(201).json({
      success: true,
      data: {
        template
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update template
// @route   PUT /api/whatsapp/templates/:id
// @access  Private
const updateTemplate = async (req, res, next) => {
  try {
    const { name, category, message, language, tags, isActive } = req.body;

    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isSystem: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found or cannot be edited',
          code: 'NOT_FOUND'
        }
      });
    }

    // Update fields
    if (name) template.name = name;
    if (category) template.category = category;
    if (message) {
      template.message = message;
      // Re-extract variables
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables = [];
      let match;
      while ((match = variableRegex.exec(message)) !== null) {
        const varName = match[1];
        const validVars = ['FirstName', 'LastName', 'FullName', 'Company', 'Email', 'Phone', 'PropertyType', 'Budget', 'Location'];
        if (validVars.includes(varName) && !variables.includes(varName)) {
          variables.push(varName);
        }
      }
      template.variables = variables;
    }
    if (language) template.language = language;
    if (tags) template.tags = tags;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();

    res.json({
      success: true,
      data: {
        template
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete template
// @route   DELETE /api/whatsapp/templates/:id
// @access  Private
const deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isSystem: false
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found or cannot be deleted',
          code: 'NOT_FOUND'
        }
      });
    }

    await template.deleteOne();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Preview template with lead data
// @route   POST /api/whatsapp/templates/:id/preview
// @access  Private
const previewTemplate = async (req, res, next) => {
  try {
    const { leadId } = req.body;

    const template = await Template.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { isSystem: true }
      ],
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found',
          code: 'NOT_FOUND'
        }
      });
    }

    let preview = template.message;
    let lead = null;

    if (leadId) {
      lead = await Lead.findOne({
        _id: leadId,
        userId: req.user._id,
        isDeleted: false
      });

      if (lead) {
        preview = template.applyVariables(lead);
      }
    }

    res.json({
      success: true,
      data: {
        template: template.message,
        preview,
        variables: template.variables,
        lead: lead ? {
          id: lead._id,
          name: lead.name
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get template categories
// @route   GET /api/whatsapp/templates/categories
// @access  Private
const getCategories = async (req, res, next) => {
  try {
    const categories = [
      { id: 'initial_contact', name: 'Initial Contact', description: 'First message to a new lead' },
      { id: 'follow_up', name: 'Follow Up', description: 'Following up on previous conversation' },
      { id: 'appointment', name: 'Appointment', description: 'Scheduling and confirming meetings' },
      { id: 'closing', name: 'Closing', description: 'Finalizing deals' },
      { id: 're_engagement', name: 'Re-engagement', description: 'Reaching out to cold leads' },
      { id: 'thank_you', name: 'Thank You', description: 'Appreciation messages' },
      { id: 'custom', name: 'Custom', description: 'User-created templates' }
    ];

    res.json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateLink,
  logSend,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  getCategories
};
