const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Service = require('../models/Service');
const { protect, requireServiceProvider, requireVerification, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Create new service
// @route   POST /api/services
// @access  Private (Service Providers only)
router.post('/', [
  protect,
  requireServiceProvider,
  requireVerification,
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Service title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Service description must be between 20 and 1000 characters'),
  body('category')
    .isIn([
      'home_services', 'automotive', 'healthcare', 'education', 'technology',
      'beauty_wellness', 'professional_services', 'entertainment', 'maintenance', 'consulting', 'other'
    ])
    .withMessage('Invalid service category'),
  body('pricing.type')
    .isIn(['fixed', 'hourly', 'per_unit', 'negotiable'])
    .withMessage('Invalid pricing type'),
  body('pricing.amount')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('serviceArea.cities')
    .isArray({ min: 1 })
    .withMessage('At least one service area city is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const serviceData = {
      ...req.body,
      provider: req.user._id,
      status: 'pending_review'
    };

    const service = new Service(serviceData);
    await service.save();

    // Populate provider info
    await service.populate('provider', 'firstName lastName businessInfo.businessName profileImage');

    res.status(201).json({
      success: true,
      message: 'Service created successfully and pending review',
      data: { service }
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating service'
    });
  }
});

// @desc    Get all services with filtering and pagination
// @route   GET /api/services
// @access  Public
router.get('/', [
  optionalAuth,
  query('category').optional().isString(),
  query('city').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('rating').optional().isFloat({ min: 0, max: 5 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['price_asc', 'price_desc', 'rating_desc', 'newest', 'oldest'])
], async (req, res) => {
  try {
    const {
      category,
      city,
      minPrice,
      maxPrice,
      rating,
      page = 1,
      limit = 12,
      sort = 'newest'
    } = req.query;

    // Build filter object
    const filter = { status: 'active', isVerified: true };

    if (category) filter.category = category;
    if (city) filter['serviceArea.cities'] = { $regex: city, $options: 'i' };
    if (minPrice || maxPrice) {
      filter['pricing.amount'] = {};
      if (minPrice) filter['pricing.amount'].$gte = minPrice;
      if (maxPrice) filter['pricing.amount'].$lte = maxPrice;
    }
    if (rating) filter['qualityRating.average'] = { $gte: rating };

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'price_asc':
        sortObj = { 'pricing.amount': 1 };
        break;
      case 'price_desc':
        sortObj = { 'pricing.amount': -1 };
        break;
      case 'rating_desc':
        sortObj = { 'qualityRating.average': -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      default: // newest
        sortObj = { createdAt: -1 };
    }

    // Add featured services first
    const featuredFilter = { ...filter, isFeatured: true };
    const featuredServices = await Service.find(featuredFilter)
      .sort({ featuredUntil: -1, ...sortObj })
      .populate('provider', 'firstName lastName businessInfo.businessName profileImage city')
      .limit(parseInt(limit));

    // Get regular services
    const regularFilter = { ...filter, isFeatured: { $ne: true } };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [regularServices, total] = await Promise.all([
      Service.find(regularFilter)
        .sort(sortObj)
        .populate('provider', 'firstName lastName businessInfo.businessName profileImage city')
        .skip(skip)
        .limit(parseInt(limit)),
      Service.countDocuments(regularFilter)
    ]);

    // Combine featured and regular services
    const services = [...featuredServices, ...regularServices];

    // Increment view count for each service
    services.forEach(service => {
      service.incrementViewCount();
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalServices: total + featuredServices.length,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services'
    });
  }
});

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'firstName lastName businessInfo.businessName profileImage city address')
      .populate('verifiedBy', 'firstName lastName');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (service.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Service not available'
      });
    }

    // Increment view count
    await service.incrementViewCount();

    res.json({
      success: true,
      data: { service }
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service'
    });
  }
});

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Service Provider - Owner only)
router.put('/:id', [
  protect,
  requireServiceProvider,
  requireVerification,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Service title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Service description must be between 20 and 1000 characters'),
  body('pricing.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check ownership
    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this service'
      });
    }

    // Update service
    const updates = req.body;
    const allowedUpdates = [
      'title', 'description', 'shortDescription', 'subcategory', 'tags',
      'duration', 'availability', 'pricing', 'serviceArea', 'onSiteService',
      'remoteService', 'images', 'videos', 'documents'
    ];

    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    // Reset status to pending review if significant changes made
    if (filteredUpdates.title || filteredUpdates.description || filteredUpdates.pricing) {
      filteredUpdates.status = 'pending_review';
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).populate('provider', 'firstName lastName businessInfo.businessName profileImage');

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service: updatedService }
    });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating service'
    });
  }
});

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private (Service Provider - Owner only)
router.delete('/:id', [protect, requireServiceProvider], async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check ownership
    if (service.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this service'
      });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting service'
    });
  }
});

// @desc    Get services by provider
// @route   GET /api/services/provider/:providerId
// @access  Public
router.get('/provider/:providerId', async (req, res) => {
  try {
    const services = await Service.find({
      provider: req.params.providerId,
      status: 'active',
      isVerified: true
    })
    .populate('provider', 'firstName lastName businessInfo.businessName profileImage city')
    .sort({ isFeatured: -1, createdAt: -1 });

    res.json({
      success: true,
      data: { services }
    });

  } catch (error) {
    console.error('Get provider services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching provider services'
    });
  }
});

// @desc    Get service categories
// @route   GET /api/services/categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'home_services', name: 'Home Services', icon: '🏠' },
      { id: 'automotive', name: 'Automotive', icon: '🚗' },
      { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
      { id: 'education', name: 'Education', icon: '📚' },
      { id: 'technology', name: 'Technology', icon: '💻' },
      { id: 'beauty_wellness', name: 'Beauty & Wellness', icon: '💄' },
      { id: 'professional_services', name: 'Professional Services', icon: '💼' },
      { id: 'entertainment', name: 'Entertainment', icon: '🎭' },
      { id: 'maintenance', name: 'Maintenance', icon: '🔧' },
      { id: 'consulting', name: 'Consulting', icon: '📋' },
      { id: 'other', name: 'Other', icon: '✨' }
    ];

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

module.exports = router;
