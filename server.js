const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const nodemailer = require('nodemailer'); // Imports the email tool

const app = express();
app.use(cors());
app.use(express.json());

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

// 2. Set up the Email Sender (Change credentials to your actual email provider details) go to app settings and find APP Passwords to generate a 16 character password then paste in PASS
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // If using Gmail. Change if using Outlook/GoDaddy etc.
  port: 587,
  secure: false, 
  auth: {
    user: 'admin@theflyingscot.co.nz', // Your business email address
    pass: 'YOUR_EMAIL_APP_PASSWORD'     // Your real email app password
  }
});

// --- UPDATED PATHS TO INCLUDE EMAIL DISPATCH ---

// Receive Contact Form Details
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Save to local database
    await ContactMessage.create({ name, email, message });

    // Send copy to business email
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

    // Save to local database
    await Subscriber.create({ email });

    // Send copy to business email
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

app.listen(5000, () => console.log('Database & Email server is ready on port 5000!'));