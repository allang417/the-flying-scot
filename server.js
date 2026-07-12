const express = require('express');
const cors = require('cors');
const path = require('path');
const { Resend } = require('resend'); // Keep Resend for HTTP email delivery

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// NOTE: All Sequelize database configurations, models, and sync lines have been completely removed.

// Receive Contact Form Details (Email-Only)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Database save line removed completely. 

    // Directly dispatch the inquiry to your inbox via Resend
    await resend.emails.send({
      from: 'Website Inquiry <onboarding@resend.dev>', // Change to your domain email once CNAMEs verify
      to: 'admin@theflyingscot.co.nz', 
      subject: 'New Website Contact Form Submission!',
      html: `
        <h3>New Inquiry Received:</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Customer Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Backend Contact Error Detail:', err);
    res.json({ success: false, error: 'Mail delivery failed.' });
  }
});

// Newsletter Subscriber Route (Email-Only)
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Database lookup and unique checks removed completely.

    // Send the subscriber alert straight to your inbox
    await resend.emails.send({
      from: 'Newsletter Alert <onboarding@resend.dev>', // Change to your domain email once CNAMEs verify
      to: 'admin@theflyingscot.co.nz',
      subject: 'New Website Notification!',
      text: `Great news! A user has subscribed to your newsletter.\n\nEmail: ${email}`
    });

    // Because we are no longer checking a database for duplicates, 
    // it will simply say thank you every time someone signs up.
    res.json({ success: true, message: 'Thank you for subscribing!' });

  } catch (error) {
    console.error('Backend Subscribe Error Detail:', error);
    res.status(500).json({ success: false, error: 'Email processing error.' });
  }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Email-only server is ready on port ${PORT}!`));