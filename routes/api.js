const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Category = require('../models/Category');
const Message = require('../models/Message');
const ExtractionJob = require('../models/ExtractionJob');
const extractionService = require('../services/extractionService');

// ================== CATEGORIES ==================

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    await Lead.deleteMany({ category: req.params.id });
    res.json({ success: true, message: 'Category and associated leads deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== LEADS ==================

// Get leads with filters
router.get('/leads', async (req, res) => {
  try {
    const { category, status, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.extractedAt = {};
      if (startDate) query.extractedAt.$gte = new Date(startDate);
      if (endDate) query.extractedAt.$lte = new Date(endDate);
    }

    const leads = await Lead.find(query)
      .populate('category', 'name sourceType')
      .sort({ extractedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Lead.countDocuments(query);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lead status
router.put('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk update lead status
router.put('/leads/bulk/status', async (req, res) => {
  try {
    const { leadIds, status } = req.body;
    await Lead.updateMany({ _id: { $in: leadIds } }, { status });
    res.json({ success: true, message: `Updated ${leadIds.length} leads` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete lead
router.delete('/leads/:id', async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== MESSAGES ==================

// Get all message templates
router.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create message template
router.post('/messages', async (req, res) => {
  try {
    const message = await Message.create(req.body);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update message template
router.put('/messages/:id', async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete message template
router.delete('/messages/:id', async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Message template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== EXTRACTION ==================

// Start extraction job
router.post('/extraction/start', async (req, res) => {
  try {
    const { categoryId, sourceType, sourceUrl, config } = req.body;

    if (!categoryId || !sourceType || !sourceUrl) {
      return res.status(400).json({
        success: false,
        error: 'categoryId, sourceType, and sourceUrl are required'
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Create extraction job
    const job = await ExtractionJob.create({
      category: categoryId,
      sourceType,
      sourceUrl,
      config: config || {},
      status: 'pending'
    });

    // Start extraction in background
    extractionService.startExtraction(job._id);

    res.json({ success: true, data: job, message: 'Extraction started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get extraction job status
router.get('/extraction/:id', async (req, res) => {
  try {
    const job = await ExtractionJob.findById(req.params.id).populate('category', 'name');
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all extraction jobs
router.get('/extractions', async (req, res) => {
  try {
    const jobs = await ExtractionJob.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save extracted usernames to database
router.post('/extraction/:id/save', async (req, res) => {
  try {
    const job = await ExtractionJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.savedToDb) {
      return res.status(400).json({ success: false, error: 'Already saved to database' });
    }

    let saved = 0;
    let duplicates = 0;

    for (const username of job.extractedUsernames) {
      try {
        await Lead.create({
          username,
          category: job.category,
          extractedAt: job.completedAt || new Date()
        });
        saved++;
      } catch (err) {
        if (err.code === 11000) {
          duplicates++;
        }
      }
    }

    job.savedToDb = true;
    job.totalSaved = saved;
    job.duplicatesSkipped = duplicates;
    await job.save();

    res.json({
      success: true,
      message: `Saved ${saved} leads, ${duplicates} duplicates skipped`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel extraction job
router.post('/extraction/:id/cancel', async (req, res) => {
  try {
    const job = await ExtractionJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    extractionService.cancelExtraction(job._id);
    job.status = 'cancelled';
    await job.save();

    res.json({ success: true, message: 'Extraction cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== ANALYTICS ==================

// Get dashboard stats
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const totalCategories = await Category.countDocuments();

    const statusStats = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayLeads = await Lead.countDocuments({ extractedAt: { $gte: todayStart } });

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const weekLeads = await Lead.countDocuments({ extractedAt: { $gte: last7Days } });

    const messageStats = await Lead.aggregate([
      { $match: { 'messageStatus.sent': true } },
      { $group: {
        _id: null,
        sent: { $sum: 1 },
        delivered: { $sum: { $cond: ['$messageStatus.delivered', 1, 0] } },
        seen: { $sum: { $cond: ['$messageStatus.seen', 1, 0] } },
        replied: { $sum: { $cond: ['$messageStatus.replied', 1, 0] } }
      }}
    ]);

    const clickStats = await Lead.aggregate([
      { $match: { 'linkTracking.linkSent': { $ne: '' } } },
      { $group: {
        _id: null,
        linksSent: { $sum: 1 },
        clicked: { $sum: { $cond: ['$linkTracking.clicked', 1, 0] } },
        viewed: { $sum: { $cond: ['$linkTracking.landingPageViewed', 1, 0] } }
      }}
    ]);

    res.json({
      success: true,
      data: {
        totalLeads,
        totalCategories,
        todayLeads,
        weekLeads,
        statusStats,
        messageStats: messageStats[0] || { sent: 0, delivered: 0, seen: 0, replied: 0 },
        clickStats: clickStats[0] || { linksSent: 0, clicked: 0, viewed: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leads by date
router.get('/analytics/by-date', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await Lead.aggregate([
      { $match: { extractedAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$extractedAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leads by category
router.get('/analytics/by-category', async (req, res) => {
  try {
    const stats = await Lead.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category'
      }},
      { $unwind: '$category' },
      { $project: {
        _id: 0,
        categoryId: '$_id',
        categoryName: '$category.name',
        count: 1
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== LINK TRACKING ==================

// Track link click (public endpoint)
router.get('/track/:leadId', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (lead) {
      lead.linkTracking.clicked = true;
      lead.linkTracking.clickedAt = new Date();
      lead.linkTracking.clickCount += 1;
      lead.status = 'clicked';
      await lead.save();

      // Redirect to landing page
      if (lead.linkTracking.linkSent) {
        return res.redirect(lead.linkTracking.linkSent);
      }
    }
    res.redirect('/');
  } catch (error) {
    res.redirect('/');
  }
});

// Track landing page view
router.post('/track/:leadId/view', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (lead) {
      lead.linkTracking.landingPageViewed = true;
      lead.linkTracking.landingPageViewedAt = new Date();
      await lead.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

// Update message status for a lead
router.put('/leads/:id/message-status', async (req, res) => {
  try {
    const { sent, delivered, seen, replied, linkSent } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (sent) {
      lead.messageStatus.sent = true;
      lead.messageStatus.sentAt = new Date();
      lead.status = 'messaged';
    }
    if (delivered) {
      lead.messageStatus.delivered = true;
      lead.messageStatus.deliveredAt = new Date();
    }
    if (seen) {
      lead.messageStatus.seen = true;
      lead.messageStatus.seenAt = new Date();
    }
    if (replied) {
      lead.messageStatus.replied = true;
      lead.messageStatus.repliedAt = new Date();
      lead.status = 'replied';
    }
    if (linkSent) {
      lead.linkTracking.linkSent = linkSent;
    }

    await lead.save();
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
