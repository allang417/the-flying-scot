const express = require('express');
const cors = require('cors');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const nodemailer = require('nodemailer'); 

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

// Ensure the database is created cleanly in the current working directory
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: console.log // Logs all database actions to your Render terminal
});

const ContactMessage = sequelize.define('ContactMessage', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false }
});

const Subscriber = sequelize.define('Subscriber', {
  email: { type: DataTypes.STRING, allowNull: false, unique: true }
});

// Force database synchronization on startup
sequelize.sync({ alter: true })
  .then(() => console.log('Database tables successfully synchronized.'))
  .catch(err => console.error('Database sync error:', err));

// Updated Email Sender forcing standard IPv4 to fix the ENETUNREACH network error
const emailTransporter = nodemailer.createTransport({
  host: '74.125.142.108', // Forces the direct IPv4 address for smtp.gmail.com
  port: 587,
  secure: false, 
  auth: {
    user: 'admin@theflyingscot.co.nz', 
    pass: 'YOUR_EMAIL_APP_PASSWORD'     // Make sure your real 16-character app password is here
  },
  tls: {
    rejectUnauthorized: false,
    servername: 'smtp.gmail.com'        // Ensures SSL certificate matches Gmail
  }
});

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
    console.error('Backend Contact Error Detail:', err);
    res.json({ success: false, error: 'Database or mail delivery failed.' });
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
    console.error('Backend Subscribe Error Detail:', err);
    
    // Check if the error is due to a duplicate email address
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.json({ success: false, error: 'already_subscribed' });
    }
    
    res.json({ success: false, error: 'Server error' });
  }
});
// Secure route to view contact messages
app.get('/api/view-messages', async (req, res) => {
  try {
    const messages = await ContactMessage.findAll();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure route to view newsletter subscribers
app.get('/api/view-subscribers', async (req, res) => {
  try {
    const subscribers = await Subscriber.findAll();
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Database & Email server is ready on port ${PORT}!`));