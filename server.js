const express = require('express');
const cors = require('cors');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const nodemailer = require('nodemailer'); 

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files (index.html, style.css, assets folder) directly
app.use(express.static(__dirname));

// 1. Create the database file automatically
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

// Map out data to save for contact messages
const ContactMessage = sequelize.define('ContactMessage', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false }
});

// Map out data to save for newsletter signups
const Subscriber = sequelize.define('Subscriber', {
  email: { type: DataTypes.STRING, allowNull: false, unique: true }
});

// Generate database tables automatically
sequelize.sync();

// 2. Set up the Email Sender
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', 
  port: 587,
  secure: false, 
  auth: {
    user: 'admin@theflyingscot.co.nz', 
    pass: 'YOUR_EMAIL_APP_PASSWORD'     // Keep your real app password pasted here
  }
});

// --- API ENDPOINTS ---

// Receive Contact Form Details
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    await ContactMessage.create({ name, email, message });

    const mailOptions = {
      from: '"The Flying SCOT Website" <admin@theflyingscot.co.nz>',
      to: 'admin@theflyingscot.co.nz', 
      subject: 'New Website Contact Form Submission!',
      html: `
        <h3>New Inquiry Received:</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Customer Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    };
    await emailTransporter.sendMail(mailOptions);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// Receive Newsletter Subscriptions
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    await Subscriber.create({ email });

    const mailOptions = {
      from: '"The Flying SCOT Website" <admin@theflyingscot.co.nz>',
      to: 'admin@theflyingscot.co.nz',
      subject: 'New Newsletter Subscriber Joined!',
      html: `
        <h3>Good news! A new user joined the clan mailing list:</h3>
        <p><strong>Email Address:</strong> ${email}</p>
      `
    };
    await emailTransporter.sendMail(mailOptions);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// Root Route: Explicitly serve the index.html homepage when visiting the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Dynamic Port configuration required by Render (falls back to 5000 locally)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Database & Email server is ready on port ${PORT}!`));