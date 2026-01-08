const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Category = require('../models/Category');
const Message = require('../models/Message');
const ExtractionJob = require('../models/ExtractionJob');

// Dashboard
router.get('/', async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const totalCategories = await Category.countDocuments();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayLeads = await Lead.countDocuments({ extractedAt: { $gte: todayStart } });

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const weekLeads = await Lead.countDocuments({ extractedAt: { $gte: last7Days } });

    const statusStats = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const recentJobs = await ExtractionJob.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentLeads = await Lead.find()
      .populate('category', 'name')
      .sort({ extractedAt: -1 })
      .limit(10);

    res.render('dashboard', {
      title: 'Dashboard',
      totalLeads,
      totalCategories,
      todayLeads,
      weekLeads,
      statusStats,
      recentJobs,
      recentLeads
    });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Categories page
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Lead.countDocuments({ category: cat._id });
        return { ...cat.toObject(), leadCount: count };
      })
    );
    res.render('categories', { title: 'Categories', categories: categoriesWithCount });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Leads page
router.get('/leads', async (req, res) => {
  try {
    const { category, status, page = 1 } = req.query;
    const limit = 50;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    const leads = await Lead.find(query)
      .populate('category', 'name')
      .sort({ extractedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Lead.countDocuments(query);
    const categories = await Category.find().sort({ name: 1 });

    res.render('leads', {
      title: 'Leads',
      leads,
      categories,
      currentCategory: category || '',
      currentStatus: status || '',
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Extraction page
router.get('/extraction', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    const jobs = await ExtractionJob.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    res.render('extraction', { title: 'Extraction', categories, jobs });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Messages page
router.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.render('messages', { title: 'Messages', messages });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Analytics page
router.get('/analytics', async (req, res) => {
  try {
    const categoryStats = await Lead.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category'
      }},
      { $unwind: '$category' },
      { $project: {
        categoryName: '$category.name',
        count: 1
      }},
      { $sort: { count: -1 } }
    ]);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const dateStats = await Lead.aggregate([
      { $match: { extractedAt: { $gte: last30Days } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$extractedAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const messageStats = await Lead.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        messaged: { $sum: { $cond: ['$messageStatus.sent', 1, 0] } },
        delivered: { $sum: { $cond: ['$messageStatus.delivered', 1, 0] } },
        seen: { $sum: { $cond: ['$messageStatus.seen', 1, 0] } },
        replied: { $sum: { $cond: ['$messageStatus.replied', 1, 0] } },
        clicked: { $sum: { $cond: ['$linkTracking.clicked', 1, 0] } }
      }}
    ]);

    res.render('analytics', {
      title: 'Analytics',
      categoryStats,
      dateStats,
      messageStats: messageStats[0] || { total: 0, messaged: 0, delivered: 0, seen: 0, replied: 0, clicked: 0 }
    });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

module.exports = router;
