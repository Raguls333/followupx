const { Template } = require('../models');

// Get all templates (system + user)
const getTemplates = async (req, res, next) => {
  try {
    const templates = await Template.find({
      $or: [
        { userId: req.user._id },
        { isSystem: true }
      ],
      isActive: true
    }).sort({ isSystem: -1, createdAt: -1 });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

// Get single template
const getTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found',
          code: 'NOT_FOUND'
        }
      });
    }

    // Verify ownership (unless system template)
    if (!template.isSystem && template.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized',
          code: 'UNAUTHORIZED'
        }
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// Create template
const createTemplate = async (req, res, next) => {
  try {
    const { name, category, message, variables } = req.body;

    if (!name || !message) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name and message are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }

    const template = new Template({
      userId: req.user._id,
      name,
      category,
      message,
      variables: variables || [],
      isSystem: false
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// Update template
const updateTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found',
          code: 'NOT_FOUND'
        }
      });
    }

    // Only allow editing user's own templates
    if (template.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized',
          code: 'UNAUTHORIZED'
        }
      });
    }

    const { name, category, message, variables } = req.body;

    if (name) template.name = name;
    if (category) template.category = category;
    if (message) template.message = message;
    if (variables) template.variables = variables;

    await template.save();

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// Delete template
const deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found',
          code: 'NOT_FOUND'
        }
      });
    }

    if (template.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized',
          code: 'UNAUTHORIZED'
        }
      });
    }

    await Template.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: { message: 'Template deleted' }
    });
  } catch (error) {
    next(error);
  }
};

// Render template with variables
const renderTemplate = async (req, res, next) => {
  try {
    const { templateId, variables } = req.body;

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found',
          code: 'NOT_FOUND'
        }
      });
    }

    let message = template.message;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, 'g'), value || '');
    });

    res.json({
      success: true,
      data: {
        message,
        variables: template.variables
      }
    });
  } catch (error) {
    next(error);
  }
};

// Use template (increment usage count)
const useTemplate = async (req, res, next) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { usageCount: 1 },
        lastUsed: new Date()
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Template not found',
          code: 'NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  useTemplate
};
