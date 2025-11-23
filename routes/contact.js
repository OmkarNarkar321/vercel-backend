// backend/routes/contact.js
const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const { authenticateToken } = require('../middleware/auth');

// POST - Submit contact form
router.post('/', async (req, res) => {
  try {
    console.log('📧 Contact form submission received');
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    // Message length validation
    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters long'
      });
    }

    // Create contact message
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      userId: req.user ? req.user.userId : null // If user is logged in
    });

    await contactMessage.save();

    console.log('✅ Contact message saved:', {
      id: contactMessage._id,
      email: contactMessage.email,
      subject: contactMessage.subject
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully',
      data: {
        id: contactMessage._id,
        createdAt: contactMessage.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again.',
      error: error.message
    });
  }
});

// ============================================
// 📋 GET - View all contact messages in browser (HTML View)
// ============================================
router.get('/view-messages', async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });

    // Generate HTML page to display messages
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Messages - Admin View</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #FFF2E9 0%, #FFE4D6 100%);
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header {
          background: linear-gradient(135deg, #ED9455 0%, #A7561C 100%);
          color: white;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header h1 {
          font-size: 32px;
          margin-bottom: 10px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        .stat-card h3 {
          color: #ED9455;
          font-size: 14px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .stat-card p {
          font-size: 28px;
          font-weight: bold;
          color: #333;
        }
        .message-card {
          background: white;
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .message-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.12);
        }
        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .message-info {
          flex: 1;
        }
        .message-name {
          font-size: 20px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .message-email {
          color: #ED9455;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .message-date {
          color: #888;
          font-size: 13px;
        }
        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-new {
          background: #E3F2FD;
          color: #1976D2;
        }
        .status-in-progress {
          background: #FFF3E0;
          color: #F57C00;
        }
        .status-resolved {
          background: #E8F5E9;
          color: #388E3C;
        }
        .status-closed {
          background: #ECEFF1;
          color: #607D8B;
        }
        .message-subject {
          font-size: 16px;
          font-weight: 600;
          color: #555;
          margin-bottom: 12px;
          padding: 10px;
          background: #F5F5F5;
          border-radius: 8px;
        }
        .message-body {
          color: #666;
          line-height: 1.6;
          padding: 15px;
          background: #FAFAFA;
          border-radius: 8px;
          border-left: 3px solid #ED9455;
        }
        .message-id {
          font-size: 11px;
          color: #999;
          margin-top: 10px;
          font-family: monospace;
        }
        .no-messages {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        .no-messages h2 {
          color: #999;
          font-size: 24px;
        }
        .refresh-btn {
          background: linear-gradient(135deg, #ED9455 0%, #A7561C 100%);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 5px 15px rgba(237, 148, 85, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .refresh-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(237, 148, 85, 0.4);
        }
        .filter-section {
          background: white;
          padding: 20px;
          border-radius: 15px;
          margin-bottom: 20px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        .filter-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .filter-btn {
          padding: 8px 16px;
          border: 2px solid #ED9455;
          background: white;
          color: #ED9455;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .filter-btn:hover, .filter-btn.active {
          background: #ED9455;
          color: white;
        }
        @media (max-width: 768px) {
          .message-header {
            flex-direction: column;
          }
          .stats {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Contact Messages</h1>
          <p>Admin Dashboard - All Contact Form Submissions</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <h3>Total Messages</h3>
            <p>${messages.length}</p>
          </div>
          <div class="stat-card">
            <h3>New Messages</h3>
            <p>${messages.filter(m => m.status === 'new').length}</p>
          </div>
          <div class="stat-card">
            <h3>In Progress</h3>
            <p>${messages.filter(m => m.status === 'in-progress').length}</p>
          </div>
          <div class="stat-card">
            <h3>Resolved</h3>
            <p>${messages.filter(m => m.status === 'resolved').length}</p>
          </div>
        </div>

        <div class="filter-section">
          <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>

        ${messages.length === 0 ? `
          <div class="no-messages">
            <h2>📭 No messages yet</h2>
            <p style="color: #999; margin-top: 10px;">Contact form submissions will appear here</p>
          </div>
        ` : messages.map(msg => `
          <div class="message-card">
            <div class="message-header">
              <div class="message-info">
                <div class="message-name">${msg.name}</div>
                <div class="message-email">📧 ${msg.email}</div>
                <div class="message-date">📅 ${new Date(msg.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}</div>
              </div>
              <span class="status-badge status-${msg.status}">${msg.status}</span>
            </div>
            <div class="message-subject">
              📋 Subject: ${msg.subject}
            </div>
            <div class="message-body">
              ${msg.message}
            </div>
            <div class="message-id">ID: ${msg._id}</div>
            ${msg.userId ? `<div class="message-id">User ID: ${msg.userId}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </body>
    </html>
    `;

    res.send(html);

  } catch (error) {
    console.error('❌ Error fetching contact messages:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1 style="color: red;">Error Loading Messages</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

// ============================================
// 📋 GET - Get all contact messages (JSON API)
// ============================================
router.get('/messages', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};

    const messages = await ContactMessage.find(query)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ContactMessage.countDocuments(query);

    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching contact messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// ============================================
// PATCH - Update contact message status (Admin only)
// ============================================
router.patch('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const { status, response, respondedBy } = req.body;
    const messageId = req.params.id;

    const updateData = {
      status,
      ...(response && { response, respondedAt: new Date(), respondedBy })
    };

    const message = await ContactMessage.findByIdAndUpdate(
      messageId,
      updateData,
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });

  } catch (error) {
    console.error('❌ Error updating contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message',
      error: error.message
    });
  }
});

// ============================================
// DELETE - Delete contact message (Admin only)
// ============================================
router.delete('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting contact message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

module.exports = router;