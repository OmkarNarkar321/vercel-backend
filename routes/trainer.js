// backend/routes/trainer.js
const express = require('express');
const router = express.Router();
const Trainer = require('../models/Trainer');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/trainers/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit per file
  },
  fileFilter: function (req, file, cb) {
    // Allow specific file types
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG allowed.'));
    }
  }
});

// 📝 POST - Submit trainer registration
router.post('/submit', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'certificates', maxCount: 5 }
]), async (req, res) => {
  try {
    console.log('📝 Trainer registration received');
    console.log('📦 Form data:', req.body);
    console.log('📎 Files:', req.files);

    // Parse JSON strings back to objects/arrays
    const formData = {
      ...req.body,
      careerCounseling: JSON.parse(req.body.careerCounseling || '[]'),
      domainCounseling: JSON.parse(req.body.domainCounseling || '{}'),
      interviewCounseling: JSON.parse(req.body.interviewCounseling || '[]'),
      availability: JSON.parse(req.body.availability || '[]')
    };

    // Add file paths
    if (req.files?.resume?.[0]) {
      formData.resume = req.files.resume[0].path;
    }
    
    if (req.files?.certificates) {
      formData.certificates = req.files.certificates.map(f => f.path).join(',');
    }

    // Check if email already exists
    const existingTrainer = await Trainer.findOne({ email: formData.email });
    if (existingTrainer) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please use a different email.'
      });
    }

    // Create new trainer
    const trainer = new Trainer(formData);
    await trainer.save();

    console.log('✅ Trainer registered successfully:', trainer._id);

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Our team will contact you within 3-5 business days.',
      data: {
        id: trainer._id,
        fullName: trainer.fullName,
        email: trainer.email,
        status: trainer.status
      }
    });

  } catch (error) {
    console.error('❌ Trainer registration error:', error);
    
    // Handle multer file size errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size is 2MB per file.'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// 📋 GET - Get all trainers (with filtering and pagination)
router.get('/trainers', async (req, res) => {
  try {
    const { 
      status, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const trainers = await Trainer.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Trainer.countDocuments(query);

    // Get statistics
    const stats = await Trainer.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: trainers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('❌ Error fetching trainers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trainers',
      error: error.message
    });
  }
});

// 📄 GET - Get single trainer by ID
router.get('/trainers/:id', async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }
    
    res.json({
      success: true,
      data: trainer
    });
  } catch (error) {
    console.error('❌ Error fetching trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trainer',
      error: error.message
    });
  }
});

// 📊 GET - Get trainer statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Trainer.aggregate([
      {
        $facet: {
          statusBreakdown: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          recentSubmissions: [
            { $sort: { submittedAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                fullName: 1,
                email: 1,
                status: 1,
                submittedAt: 1
              }
            }
          ],
          experienceDistribution: [
            {
              $group: {
                _id: {
                  $switch: {
                    branches: [
                      { case: { $lt: ['$experience', 2] }, then: '0-2 years' },
                      { case: { $lt: ['$experience', 5] }, then: '2-5 years' },
                      { case: { $lt: ['$experience', 10] }, then: '5-10 years' },
                      { case: { $gte: ['$experience', 10] }, then: '10+ years' }
                    ]
                  }
                },
                count: { $sum: 1 }
              }
            }
          ],
          qualificationBreakdown: [
            {
              $group: {
                _id: '$qualification',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// 🔄 PUT - Update trainer status
router.put('/trainers/:id/status', async (req, res) => {
  try {
    const { status, statusNotes, reviewedBy } = req.body;

    if (!['pending', 'under_review', 'approved', 'rejected', 'on_hold'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const trainer = await Trainer.findByIdAndUpdate(
      req.params.id,
      {
        status,
        statusNotes,
        reviewedBy,
        reviewedAt: new Date()
      },
      { new: true }
    );

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    console.log(`✅ Trainer status updated: ${trainer.fullName} -> ${status}`);

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: trainer
    });

  } catch (error) {
    console.error('❌ Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
});

// 🗑️ DELETE - Delete trainer
router.delete('/trainers/:id', async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndDelete(req.params.id);
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }
    
    console.log(`✅ Trainer deleted: ${trainer.fullName}`);

    res.json({
      success: true,
      message: 'Trainer deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting trainer',
      error: error.message
    });
  }
});

// 🖥️ GET - View trainers in HTML dashboard
router.get('/view-trainers', async (req, res) => {
  try {
    const trainers = await Trainer.find().sort({ submittedAt: -1 });
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Trainer Management Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
        }
        
        /* Header */
        .header {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 20px 30px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .header-content {
            max-width: 1600px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
        }
        .header-stats {
            display: flex;
            gap: 30px;
        }
        .stat-item {
            text-align: center;
        }
        .stat-number {
            font-size: 24px;
            font-weight: 700;
            color: #f97316;
        }
        .stat-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
            margin-top: 2px;
        }
        
        /* Controls */
        .controls {
            background: white;
            padding: 20px 30px;
            border-bottom: 1px solid #e2e8f0;
        }
        .controls-content {
            max-width: 1600px;
            margin: 0 auto;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }
        .search-box {
            flex: 1;
            min-width: 250px;
            position: relative;
        }
        .search-box input {
            width: 100%;
            padding: 10px 15px 10px 40px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s;
        }
        .search-box input:focus {
            outline: none;
            border-color: #f97316;
        }
        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
        }
        .filter-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .filter-btn {
            padding: 10px 16px;
            border: 2px solid #e2e8f0;
            background: white;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .filter-btn:hover {
            border-color: #f97316;
            color: #f97316;
        }
        .filter-btn.active {
            background: #f97316;
            color: white;
            border-color: #f97316;
        }
        
        /* Table Container */
        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 30px;
        }
        .table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        /* Table */
        table {
            width: 100%;
            border-collapse: collapse;
        }
        thead {
            background: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
        }
        th {
            padding: 16px 20px;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        td {
            padding: 16px 20px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
        }
        tr:hover {
            background: #f8fafc;
        }
        
        /* Expandable Row */
        .trainer-row {
            transition: background 0.2s;
        }
        .details-row {
            background: #fef3c7;
            transition: all 0.3s ease;
        }
        .details-row.hidden {
            display: none;
        }
        
        .details-content {
            padding: 25px;
        }
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .detail-item {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border-left: 3px solid #f59e0b;
        }
        .detail-label {
            font-size: 11px;
            color: #92400e;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .detail-value {
            font-size: 14px;
            color: #1f2937;
            font-weight: 600;
        }
        
        /* Counseling Details */
        .counseling-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .counseling-box {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid;
        }
        .counseling-box.career { border-color: #3b82f6; }
        .counseling-box.domain { border-color: #a855f7; }
        .counseling-box.interview { border-color: #10b981; }
        .counseling-box-title {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 10px;
        }
        .counseling-box.career .counseling-box-title { color: #1e40af; }
        .counseling-box.domain .counseling-box-title { color: #7c3aed; }
        .counseling-box.interview .counseling-box-title { color: #059669; }
        .domain-item {
            margin-bottom: 10px;
            padding: 8px;
            background: #f9fafb;
            border-radius: 6px;
        }
        .domain-item:last-child { margin-bottom: 0; }
        .domain-name {
            font-size: 11px;
            font-weight: 700;
            color: #6b21a8;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .tag {
            padding: 4px 10px;
            background: #e0e7ff;
            color: #3730a3;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        /* Status Badge */
        .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-under_review { background: #dbeafe; color: #1e40af; }
        .status-approved { background: #d1fae5; color: #065f46; }
        .status-rejected { background: #fee2e2; color: #991b1b; }
        .status-on_hold { background: #e5e7eb; color: #374151; }
        
        /* Actions */
        .actions {
            display: flex;
            gap: 8px;
        }
        .btn {
            padding: 8px 14px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-approve { background: #10b981; color: white; }
        .btn-approve:hover { background: #059669; }
        .btn-reject { background: #ef4444; color: white; }
        .btn-reject:hover { background: #dc2626; }
        .btn-review { background: #3b82f6; color: white; }
        .btn-review:hover { background: #2563eb; }
        .btn-expand {
            background: #f97316;
            color: white;
            padding: 6px 12px;
            font-size: 12px;
        }
        .btn-expand:hover:not(:disabled) { background: #ea580c; }
        .btn-expand:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .btn-expand.expanded {
            background: #64748b;
        }
        .btn-expand.expanded:hover:not(:disabled) { background: #475569; }
        
        /* Documents Section */
        .documents-section {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #3b82f6;
            margin-top: 15px;
        }
        .documents-title {
            font-size: 13px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 10px;
        }
        .doc-links {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .doc-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #dbeafe;
            color: #1e40af;
            text-decoration: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
        }
        .doc-link:hover {
            background: #3b82f6;
            color: white;
            transform: translateY(-2px);
        }
        
        /* PDF Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .modal.active {
            display: flex;
        }
        .modal-content {
            background: white;
            width: 90%;
            height: 90%;
            max-width: 1200px;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .modal-header {
            padding: 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
        }
        .modal-close {
            background: #ef4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        }
        .modal-close:hover {
            background: #dc2626;
        }
        .modal-body {
            flex: 1;
            overflow: hidden;
        }
        .modal-body iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .header-stats { display: none; }
            .controls-content { flex-direction: column; }
            .search-box { min-width: 100%; }
            table { font-size: 12px; }
            td, th { padding: 12px; }
            .details-grid { grid-template-columns: 1fr; }
            .counseling-grid { grid-template-columns: 1fr; }
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
        }
        .empty-icon { font-size: 48px; margin-bottom: 15px; opacity: 0.5; }
        .empty-text { color: #64748b; font-size: 16px; }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <h1>🎓 Trainer Management Dashboard</h1>
            <div class="header-stats">
                <div class="stat-item">
                    <div class="stat-number">${trainers.length}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${trainers.filter(t => t.status === 'pending').length}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${trainers.filter(t => t.status === 'approved').length}</div>
                    <div class="stat-label">Approved</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${trainers.filter(t => t.status === 'under_review').length}</div>
                    <div class="stat-label">Review</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Controls -->
    <div class="controls">
        <div class="controls-content">
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" id="searchInput" placeholder="Search by name, email, organization, or specialization...">
            </div>
            <div class="filter-group">
                <button class="filter-btn active" onclick="filterStatus('all')">All</button>
                <button class="filter-btn" onclick="filterStatus('pending')">Pending</button>
                <button class="filter-btn" onclick="filterStatus('under_review')">Under Review</button>
                <button class="filter-btn" onclick="filterStatus('approved')">Approved</button>
                <button class="filter-btn" onclick="filterStatus('rejected')">Rejected</button>
            </div>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="container">
        <div class="table-container">
            ${trainers.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">🔭</div>
                    <div class="empty-text">No trainer applications yet</div>
                </div>
            ` : `
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Name & Contact</th>
                        <th>Position & Org</th>
                        <th>Experience</th>
                        <th>Qualification</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th style="width: 200px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${trainers.map((trainer, index) => {
                        const hasDomain = trainer.domainCounseling && 
                            Object.values(trainer.domainCounseling).some(d => d && d.length > 0);
                        
                        return `
                        <tr class="trainer-row" data-status="${trainer.status}" data-name="${trainer.fullName.toLowerCase()}" data-email="${trainer.email.toLowerCase()}" data-org="${trainer.organization.toLowerCase()}" data-spec="${trainer.specialization.toLowerCase()}">
                            <td><strong>${index + 1}</strong></td>
                            <td>
                                <div style="font-weight: 600; margin-bottom: 4px;">${trainer.fullName}</div>
                                <div style="font-size: 12px; color: #64748b;">📧 ${trainer.email}</div>
                                <div style="font-size: 12px; color: #64748b;">📞 ${trainer.phone}</div>
                            </td>
                            <td>
                                <div style="font-weight: 600; margin-bottom: 4px;">${trainer.currentDesignation}</div>
                                <div style="font-size: 12px; color: #64748b;">${trainer.organization}</div>
                            </td>
                            <td><strong>${trainer.experience}</strong> years</td>
                            <td style="font-size: 12px;">${trainer.qualification}</td>
                            <td><span class="status status-${trainer.status}">${trainer.status.replace('_', ' ')}</span></td>
                            <td style="font-size: 12px; color: #64748b;">${new Date(trainer.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td>
                                <button class="btn btn-expand" onclick="toggleDetails(this, '${trainer._id}')">View Details</button>
                            </td>
                        </tr>
                        <tr class="details-row hidden" id="details-${trainer._id}">
                            <td colspan="8">
                                <div class="details-content">
                                    <div class="details-grid">
                                        <div class="detail-item">
                                            <div class="detail-label">Specialization</div>
                                            <div class="detail-value">${trainer.specialization}</div>
                                        </div>
                                        <div class="detail-item">
                                            <div class="detail-label">Preferred Mode</div>
                                            <div class="detail-value">${trainer.preferredMode}</div>
                                        </div>
                                        <div class="detail-item">
                                            <div class="detail-label">Expected Remuneration</div>
                                            <div class="detail-value">${trainer.expectedRemuneration}</div>
                                        </div>
                                        <div class="detail-item">
                                            <div class="detail-label">Availability</div>
                                            <div class="detail-value">${trainer.availability && trainer.availability.length > 0 ? trainer.availability.join(', ') : 'Not specified'}</div>
                                        </div>
                                        ${trainer.alternatePhone ? `
                                        <div class="detail-item">
                                            <div class="detail-label">Alternate Phone</div>
                                            <div class="detail-value">${trainer.alternatePhone}</div>
                                        </div>
                                        ` : ''}
                                        ${trainer.linkedin ? `
                                        <div class="detail-item">
                                            <div class="detail-label">LinkedIn</div>
                                            <div class="detail-value"><a href="${trainer.linkedin}" target="_blank" style="color: #0066cc;">View Profile</a></div>
                                        </div>
                                        ` : ''}
                                    </div>
                                    
                                    <div class="counseling-grid">
                                        ${trainer.careerCounseling && trainer.careerCounseling.length > 0 ? `
                                        <div class="counseling-box career">
                                            <div class="counseling-box-title">🎯 Career Counseling</div>
                                            <div class="tags">
                                                ${trainer.careerCounseling.map(item => `<span class="tag">${item}</span>`).join('')}
                                            </div>
                                        </div>
                                        ` : ''}
                                        
                                        ${hasDomain ? `
                                        <div class="counseling-box domain">
                                            <div class="counseling-box-title">🔧 Domain Counseling</div>
                                            ${trainer.domainCounseling.computer && trainer.domainCounseling.computer.length > 0 ? `
                                            <div class="domain-item">
                                                <div class="domain-name">💻 Computer Science</div>
                                                <div class="tags">${trainer.domainCounseling.computer.map(s => `<span class="tag">${s}</span>`).join('')}</div>
                                            </div>
                                            ` : ''}
                                            ${trainer.domainCounseling.mechanical && trainer.domainCounseling.mechanical.length > 0 ? `
                                            <div class="domain-item">
                                                <div class="domain-name">⚙️ Mechanical</div>
                                                <div class="tags">${trainer.domainCounseling.mechanical.map(s => `<span class="tag">${s}</span>`).join('')}</div>
                                            </div>
                                            ` : ''}
                                            ${trainer.domainCounseling.automobile && trainer.domainCounseling.automobile.length > 0 ? `
                                            <div class="domain-item">
                                                <div class="domain-name">🚗 Automobile</div>
                                                <div class="tags">${trainer.domainCounseling.automobile.map(s => `<span class="tag">${s}</span>`).join('')}</div>
                                            </div>
                                            ` : ''}
                                            ${trainer.domainCounseling.electrical && trainer.domainCounseling.electrical.length > 0 ? `
                                            <div class="domain-item">
                                                <div class="domain-name">⚡ Electrical</div>
                                                <div class="tags">${trainer.domainCounseling.electrical.map(s => `<span class="tag">${s}</span>`).join('')}</div>
                                            </div>
                                            ` : ''}
                                            ${trainer.domainCounseling.civil && trainer.domainCounseling.civil.length > 0 ? `
                                            <div class="domain-item">
                                                <div class="domain-name">🏗️ Civil</div>
                                                <div class="tags">${trainer.domainCounseling.civil.map(s => `<span class="tag">${s}</span>`).join('')}</div>
                                            </div>
                                            ` : ''}
                                        </div>
                                        ` : ''}
                                        
                                        ${trainer.interviewCounseling && trainer.interviewCounseling.length > 0 ? `
                                        <div class="counseling-box interview">
                                            <div class="counseling-box-title">💼 Interview Prep</div>
                                            <div class="tags">
                                                ${trainer.interviewCounseling.map(item => `<span class="tag">${item}</span>`).join('')}
                                            </div>
                                        </div>
                                        ` : ''}
                                    </div>
                                    
                                    ${trainer.resume || trainer.certificates ? `
                                    <div class="documents-section">
                                        <div class="documents-title">📄 Uploaded Documents</div>
                                        <div class="doc-links">
                                            ${trainer.resume ? `
                                                <a href="#" onclick="viewDocument('/${trainer.resume.replace(/\\/g, '/')}', '${trainer.fullName} - Resume'); return false;" class="doc-link">
                                                    📄 View Resume
                                                </a>
                                                <a href="/${trainer.resume.replace(/\\/g, '/')}" download class="doc-link">
                                                    ⬇️ Download Resume
                                                </a>
                                            ` : ''}
                                            ${trainer.certificates ? `
                                                ${trainer.certificates.split(',').map((cert, idx) => `
                                                    <a href="#" onclick="viewDocument('/${cert.trim().replace(/\\/g, '/')}', '${trainer.fullName} - Certificate ${idx + 1}'); return false;" class="doc-link">
                                                        📜 View Certificate ${idx + 1}
                                                    </a>
                                                `).join('')}
                                            ` : ''}
                                        </div>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="actions" style="margin-top: 20px; justify-content: flex-end;">
                                        <button class="btn btn-approve" onclick="updateStatus('${trainer._id}', 'approved')">✓ Approve</button>
                                        <button class="btn btn-review" onclick="updateStatus('${trainer._id}', 'under_review')">👁️ Review</button>
                                        <button class="btn btn-reject" onclick="updateStatus('${trainer._id}', 'rejected')">✗ Reject</button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            `}
        </div>
    </div>
    
    <!-- PDF Viewer Modal -->
    <div id="pdfModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title" id="modalTitle">Document Viewer</div>
                <button class="modal-close" onclick="closeModal()">✕ Close</button>
            </div>
            <div class="modal-body">
                <iframe id="pdfFrame" src=""></iframe>
            </div>
        </div>
    </div>

    <script>
        // Toggle Details - FIXED VERSION
        function toggleDetails(btn, id) {
            // Prevent multiple rapid clicks
            if (btn.disabled) return;
            btn.disabled = true;
            
            const detailsRow = document.getElementById('details-' + id);
            if (!detailsRow) {
                console.error('Details row not found for ID:', id);
                btn.disabled = false;
                return;
            }
            
            const isExpanded = !detailsRow.classList.contains('hidden');
            
            if (isExpanded) {
                // Close details
                detailsRow.classList.add('hidden');
                btn.textContent = 'View Details';
                btn.classList.remove('expanded');
            } else {
                // Open details
                detailsRow.classList.remove('hidden');
                btn.textContent = 'Hide Details';
                btn.classList.add('expanded');
            }
            
            // Re-enable button after animation
            setTimeout(() => {
                btn.disabled = false;
            }, 300);
        }
        
        // View Document in Modal
        function viewDocument(path, title) {
            console.log('Opening document:', path);
            const modal = document.getElementById('pdfModal');
            const frame = document.getElementById('pdfFrame');
            const modalTitle = document.getElementById('modalTitle');
            
            modalTitle.textContent = title;
            frame.src = path;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        // Close Modal
        function closeModal() {
            const modal = document.getElementById('pdfModal');
            const frame = document.getElementById('pdfFrame');
            
            modal.classList.remove('active');
            frame.src = '';
            document.body.style.overflow = 'auto';
        }
        
        // Close modal on outside click
        document.getElementById('pdfModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
        
        // Filter by Status
        let currentFilter = 'all';
        function filterStatus(status) {
            currentFilter = status;
            const rows = document.querySelectorAll('.trainer-row');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            applyFilters();
        }
        
        // Search Functionality
        document.getElementById('searchInput').addEventListener('input', function(e) {
            applyFilters();
        });
        
        // Apply Filters - FIXED VERSION
        function applyFilters() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const rows = document.querySelectorAll('.trainer-row');
            
            rows.forEach(row => {
                const name = row.dataset.name;
                const email = row.dataset.email;
                const org = row.dataset.org;
                const spec = row.dataset.spec;
                const rowStatus = row.dataset.status;
                
                const matchesSearch = !searchTerm || 
                                    name.includes(searchTerm) || 
                                    email.includes(searchTerm) || 
                                    org.includes(searchTerm) ||
                                    spec.includes(searchTerm);
                const matchesFilter = currentFilter === 'all' || rowStatus === currentFilter;
                
                const detailsRow = row.nextElementSibling;
                const expandBtn = row.querySelector('.btn-expand');
                
                if (matchesSearch && matchesFilter) {
                    row.style.display = '';
                    // Keep details row state intact, but respect the hidden class
                } else {
                    row.style.display = 'none';
                    // When hiding parent row, also hide details row
                    if (detailsRow && detailsRow.classList.contains('details-row')) {
                        if (!detailsRow.classList.contains('hidden')) {
                            detailsRow.classList.add('hidden');
                            if (expandBtn) {
                                expandBtn.classList.remove('expanded');
                                expandBtn.textContent = 'View Details';
                            }
                        }
                    }
                }
            });
        }
        
        // Update Status
        async function updateStatus(id, status) {
            const statusText = status.replace('_', ' ');
            if (!confirm(\`Change status to "\${statusText}"?\`)) return;
            
            try {
                const response = await fetch(\`/api/trainer/trainers/\${id}/status\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status, reviewedBy: 'Admin' })
                });
                
                if (response.ok) {
                    alert('✅ Status updated successfully!');
                    location.reload();
                } else {
                    const result = await response.json();
                    alert('❌ Failed: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('❌ Network error. Please try again.');
            }
        }
    </script>
</body>
</html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('❌ Error rendering dashboard:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #ef4444;">❌ Error Loading Dashboard</h1>
          <p style="color: #666; margin-top: 20px;">${error.message}</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            Retry
          </button>
        </body>
      </html>
    `);
  }
});

module.exports = router;