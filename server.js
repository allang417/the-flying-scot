const express = require('express');
const path = require('path');
const { Resend } = require('resend');

const app = express();
app.use(express.json({ limit: '50kb' }));

// Serve ONLY the public folder — never the server code or package files
app.use(express.static(path.join(__dirname, 'public')));

// On Render, RESEND_API_KEY is set and emails send for real.
// Locally there's no key, so we use a placeholder and the site still runs.
const resend = new Resend(process.env.RESEND_API_KEY || 're_local_testing_placeholder');

if (!process.env.RESEND_API_KEY) {
  console.log('Note: no RESEND_API_KEY found — running in local test mode, emails will not send.');
}

// Set this in Render's Environment tab:
//   SITE_URL -> your live site address, e.g. https://theflyingscot.co.nz
// (used so the logo shows inside the branded emails)
const SITE_URL = process.env.SITE_URL || 'https://theflyingscot.co.nz';

// ---------- Branded email template ----------
// Wraps any message in The Flying SCOT colours. Email clients ignore most
// modern CSS, so everything here is inline styles and tables — that's normal.
function brandedEmail(title, bodyHtml) {
  return `
  <div style="margin:0;padding:0;background-color:#efe4cc;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#efe4cc;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
          <!-- Navy header with logo -->
          <tr>
            <td align="center" style="background-color:#16233a;padding:26px 20px 18px;">
              <img src="${SITE_URL}/assets/logo.jpg" width="90" height="90" alt="The Flying SCOT" style="border-radius:50%;display:block;">
              <p style="margin:12px 0 0;color:#f4ebd8;font-size:20px;font-weight:bold;letter-spacing:0.5px;">The Flying <span style="color:#9cc0e2;">SCOT</span></p>
              <p style="margin:4px 0 0;color:#f4ebd8;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Scottish Food<span style="color:#b32025;">.</span> Big Flavour<span style="color:#b32025;">.</span></p>
            </td>
          </tr>
          <!-- Tartan stripe -->
          <tr><td style="height:6px;background-color:#b32025;font-size:0;line-height:0;">&nbsp;</td></tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 30px;">
              <h2 style="margin:0 0 14px;color:#16233a;font-size:20px;">${title}</h2>
              <div style="color:#4c4c4c;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#0d1626;padding:18px 30px;text-align:center;">
              <p style="margin:0;color:#f4ebd8;font-size:12px;opacity:0.85;">
                The Flying SCOT · Canterbury, New Zealand<br>
                <a href="mailto:admin@theflyingscot.co.nz" style="color:#9cc0e2;">admin@theflyingscot.co.nz</a>
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

// Escapes user input before it goes into email HTML
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

// ---------- Contact form ----------
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, website, alsoSubscribe } = req.body || {};

    // Honeypot: real visitors never see this field. If it's filled, it's a bot.
    if (website) {
      return res.json({ success: true });
    }

    if (!name || !message || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid name, email, and message.' });
    }
    if (String(name).length > 100 || String(message).length > 5000) {
      return res.status(400).json({ success: false, error: 'Message is too long.' });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    // 1) The enquiry, to Leisa & Hannah — reply goes straight to the customer
    await resend.emails.send({
      from: 'Website Enquiry <info@theflyingscot.co.nz>',
      to: 'admin@theflyingscot.co.nz',
      replyTo: email,
      subject: `New website enquiry from ${safeName}`,
      html: brandedEmail('New enquiry received', `
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap;background:#efe4cc;padding:14px;border-radius:8px;">${safeMessage}</p>
        <p style="font-size:13px;color:#888;">Hit Reply to answer ${safeName} directly.${alsoSubscribe === true ? ' They also opted in to the newsletter.' : ''}</p>
      `)
    });

    // If they ticked "also send me specials", add them to the audience too.
    // Their name gets stored on the contact — so on the Resend Audience page,
    // contacts WITH a name came from the contact form, email-only ones came
    // from the newsletter box.
    if (alsoSubscribe === true) {
      try {
        await resend.contacts.create({
          email: email,
          firstName: String(name).slice(0, 50),
          unsubscribed: false
        });
      } catch (subErr) {
        // Never let a list hiccup block the enquiry itself
        console.error('Audience add failed (contact form):', subErr);
      }
    }

    // 2) A confirmation, to the customer
    await resend.emails.send({
      from: 'The Flying SCOT <info@theflyingscot.co.nz>',
      to: email,
      subject: "We've got your message! — The Flying SCOT",
      html: brandedEmail(`Thanks, ${safeName}!`, `
        <p>Your message has landed safely with us — thanks for getting in touch.</p>
        <p>We'll get back to you within a day or two. In the meantime, keep an eye on our socials for pop-up locations and weekly specials.</p>
        <p>Cheers,<br><strong>Leisa &amp; Hannah</strong><br>The Flying SCOT</p>
      `)
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ success: false, error: 'Mail delivery failed. Please try again or email us directly.' });
  }
});

// ---------- Newsletter signup ----------
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    // 1) Add them to the Resend Audience (your growing subscriber list).
    //    Adding the same email twice is fine — Resend won't duplicate it.
    // Adds them to your account's built-in Resend audience.
    // Adding the same email twice is fine — Resend won't duplicate it.
    await resend.contacts.create({
      email: email,
      unsubscribed: false
    });

    // 2) Welcome email to the new subscriber
    await resend.emails.send({
      from: 'The Flying SCOT <newsletter@theflyingscot.co.nz>',
      to: email,
      subject: "You're on the list! — The Flying SCOT",
      html: brandedEmail("Welcome aboard! 🏴", `
        <p>You're officially first in line for <strong>The Flying SCOT</strong> news — pop-up locations, weekly specials, and whatever soulful Scottish creation comes off the griddle next.</p>
        <p>No spam, just haggis &amp; good times.</p>
        <p>See you at the truck,<br><strong>Leisa &amp; Hannah</strong></p>
      `)
    });

    // 3) A heads-up to your inbox
    await resend.emails.send({
      from: 'Newsletter Signup <newsletter@theflyingscot.co.nz>',
      to: 'admin@theflyingscot.co.nz',
      subject: 'New newsletter subscriber',
      text: `A new subscriber joined the list and was added to your Resend audience.\n\nEmail: ${email}`
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
