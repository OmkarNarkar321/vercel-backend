// backend/routes/counseling.js
const express = require('express');
const router = express.Router();
const Counseling = require('../models/Counseling');
const { authenticateToken } = require('../middleware/auth');

// 📝 POST - Submit counseling form (Public or Protected)
router.post('/submit', async (req, res) => {
  try {
    console.log('📝 Counseling form submission received:', req.body);

    const { fullName, email, counselingPoints } = req.body;

    // Validate required fields
    if (!fullName || !email || !counselingPoints) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email'
      });
    }

    // Create counseling entry
    const counseling = new Counseling({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      counselingPoints: counselingPoints.trim()
    });

    await counseling.save();

    console.log('✅ Counseling request saved:', counseling._id);

    res.status(201).json({
      success: true,
      message: 'Counseling request submitted successfully! We will contact you soon.',
      data: {
        id: counseling._id,
        fullName: counseling.fullName,
        email: counseling.email,
        status: counseling.status,
        createdAt: counseling.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error submitting counseling form:', error);
    
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
      message: 'Failed to submit counseling request. Please try again.',
      error: error.message
    });
  }
});

// 📋 GET - Get all counseling requests (For admin viewing in browser)
router.get('/requests', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // Optional filter by status
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await Counseling.countDocuments(query);

    // Get counseling requests
    const counselingRequests = await Counseling.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'fullName email'); // If linked to student

    res.json({
      success: true,
      data: counselingRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRequests: total,
        requestsPerPage: limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching counseling requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch counseling requests',
      error: error.message
    });
  }
});

// 📄 GET - Get single counseling request by ID
router.get('/requests/:id', async (req, res) => {
  try {
    const counseling = await Counseling.findById(req.params.id)
      .populate('studentId', 'fullName email');
    
    if (!counseling) {
      return res.status(404).json({
        success: false,
        message: 'Counseling request not found'
      });
    }

    res.json({
      success: true,
      data: counseling
    });

  } catch (error) {
    console.error('❌ Error fetching counseling request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch counseling request',
      error: error.message
    });
  }
});

// 🔄 PUT - Update counseling request status (Admin only)
router.put('/requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'reviewed', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, reviewed, or completed'
      });
    }

    const counseling = await Counseling.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!counseling) {
      return res.status(404).json({
        success: false,
        message: 'Counseling request not found'
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: counseling
    });

  } catch (error) {
    console.error('❌ Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// 🗑️ DELETE - Delete counseling request (Admin only)
router.delete('/requests/:id', async (req, res) => {
  try {
    const counseling = await Counseling.findByIdAndDelete(req.params.id);
    
    if (!counseling) {
      return res.status(404).json({
        success: false,
        message: 'Counseling request not found'
      });
    }

    res.json({
      success: true,
      message: 'Counseling request deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting counseling request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete counseling request',
      error: error.message
    });
  }
});

// 🌐 GET - View all counseling requests in browser (HTML page)
router.get('/view-requests', async (req, res) => {
  try {
    const counselingRequests = await Counseling.find()
      .sort({ createdAt: -1 })
      .populate('studentId', 'fullName email');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Counseling Requests - Admin View</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 2.5em;
            text-align: center;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .stat-card {
            flex: 1;
            min-width: 200px;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            color: white;
        }
        .stat-card.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-card.pending { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .stat-card.reviewed { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        .stat-card.completed { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
        .stat-number { font-size: 2.5em; font-weight: bold; }
        .stat-label { font-size: 0.9em; opacity: 0.9; margin-top: 5px; }
        .filter-buttons {
            display: flex;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .filter-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }
        .filter-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .filter-btn.active { box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
        .filter-btn.all { background: #667eea; color: white; }
        .filter-btn.pending { background: #f5576c; color: white; }
        .filter-btn.reviewed { background: #00f2fe; color: white; }
        .filter-btn.completed { background: #38f9d7; color: white; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.9em;
        }
        td {
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
            background: #f8f9ff;
        }
        .status-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            display: inline-block;
        }
        .status-pending { background: #ffe0e0; color: #d32f2f; }
        .status-reviewed { background: #e3f2fd; color: #1976d2; }
        .status-completed { background: #e8f5e9; color: #388e3c; }
        .counseling-points {
            max-width: 400px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .date {
            color: #666;
            font-size: 0.9em;
        }
        .no-data {
            text-align: center;
            padding: 60px;
            color: #999;
            font-size: 1.2em;
        }
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
            transition: all 0.3s;
        }
        .refresh-btn:hover {
            transform: scale(1.1) rotate(180deg);
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 Counseling Requests Dashboard</h1>
        
        <div class="stats">
            <div class="stat-card total">
                <div class="stat-number" id="totalCount">${counselingRequests.length}</div>
                <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card pending">
                <div class="stat-number" id="pendingCount">${counselingRequests.filter(r => r.status === 'pending').length}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card reviewed">
                <div class="stat-number" id="reviewedCount">${counselingRequests.filter(r => r.status === 'reviewed').length}</div>
                <div class="stat-label">Reviewed</div>
            </div>
            <div class="stat-card completed">
                <div class="stat-number" id="completedCount">${counselingRequests.filter(r => r.status === 'completed').length}</div>
                <div class="stat-label">Completed</div>
            </div>
        </div>

        <div class="filter-buttons">
            <button class="filter-btn all active" onclick="filterStatus('all')">All Requests</button>
            <button class="filter-btn pending" onclick="filterStatus('pending')">Pending</button>
            <button class="filter-btn reviewed" onclick="filterStatus('reviewed')">Reviewed</button>
            <button class="filter-btn completed" onclick="filterStatus('completed')">Completed</button>
        </div>

        ${counselingRequests.length === 0 ? '<div class="no-data">📭 No counseling requests yet</div>' : `
        <table id="requestsTable">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Counseling Points</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${counselingRequests.map(request => `
                    <tr data-status="${request.status}">
                        <td class="date">${new Date(request.createdAt).toLocaleString()}</td>
                        <td><strong>${request.fullName}</strong></td>
                        <td>${request.email}</td>
                        <td><div class="counseling-points" title="${request.counselingPoints}">${request.counselingPoints}</div></td>
                        <td><span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `}
    </div>

    <button class="refresh-btn" onclick="location.reload()" title="Refresh">↻</button>

    <script>
        function filterStatus(status) {
            const rows = document.querySelectorAll('#requestsTable tbody tr');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            rows.forEach(row => {
                if (status === 'all' || row.dataset.status === status) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>
    `;

    res.send(html);

  } catch (error) {
    console.error('❌ Error viewing counseling requests:', error);
    res.status(500).send(`
      <h1>Error loading counseling requests</h1>
      <p>${error.message}</p>
    `);
  }
});

module.exports = router;