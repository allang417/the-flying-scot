const express = require('express');
const path = require('path');
const { Resend } = require('resend');

const app = express();
app.use(express.json({ limit: '50kb' })); // Small limit — nobody needs to send us a novel

// Serve ONLY the public folder — never the server code or package files
app.use(express.static(path.join(__dirname, 'public')));

// On Render, RESEND_API_KEY is set and emails send for real.
// On your local machine there's no key, so we use a placeholder —
// the site runs, and form submissions just fail gracefully in testing.
const resend = new Resend(process.env.RESEND_API_KEY || 're_local_testing_placeholder');

if (!process.env.RESEND_API_KEY) {
  console.log('Note: no RESEND_API_KEY found — running in local test mode, emails will not send.');
}
// Escapes user input before it goes into email HTML, so nobody can
// inject links, images, or markup into the emails you receive.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

// ---- Contact form ----
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, website } = req.body || {};

    // Honeypot: real visitors never see this field. If it's filled, it's a bot.
    // We pretend success so bots don't learn they were caught.
    if (website) {
      return res.json({ success: true });
    }

    if (!name || !message || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid name, email, and message.' });
    }
    if (String(name).length > 100 || String(message).length > 5000) {
      return res.status(400).json({ success: false, error: 'Message is too long.' });
    }

    await resend.emails.send({
      from: 'Website Enquiry <info@theflyingscot.co.nz>',
      to: 'admin@theflyingscot.co.nz',
      replyTo: email, // Leisa/Hannah can hit "Reply" and it goes straight to the customer
      subject: `New website enquiry from ${escapeHtml(name)}`,
      html: `
        <h3>New enquiry received</h3>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      `
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ success: false, error: 'Mail delivery failed. Please try again or email us directly.' });
  }
});

// ---- Newsletter signup ----
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    await resend.emails.send({
      from: 'Newsletter Signup <newsletter@theflyingscot.co.nz>',
      to: 'admin@theflyingscot.co.nz',
      subject: 'New newsletter subscriber',
      text: `A new subscriber joined the newsletter list.\n\nEmail: ${email}`
    });

    res.json({ success: true, message: 'Thanks for subscribing!' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ success: false, error: 'Subscription failed. Please try again.' });
  }
});

// Unknown API routes get JSON, not an HTML 404 page
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Not found.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`The Flying SCOT is ready on port ${PORT}`));
