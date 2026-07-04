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

const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', 
  port: 587,
  secure: false, 
  auth: {
    user: 'admin@theflyingscot.co.nz', 
    pass: 'YOUR_EMAIL_APP_PASSWORD' // Double check your 16-character Gmail App Password here
  }
});

// Receive Contact Form Details
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    console.log('Received contact submission:', { name, email });
    
    const newMessage = await ContactMessage.create({ name, email, message });
    console.log('Saved to database:', newMessage.id);

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
    console.log('Contact email sent successfully.');

    res.json({ success: true });
  } catch (err) {
    console.error('Backend Contact Error Detail:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Receive Newsletter Subscriptions
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Received subscription request for:', email);

    const newSub = await Subscriber.create({ email });
    console.log('Saved subscriber to database:', newSub.id);

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
    console.log('Subscription email sent successfully.');

    res.json({ success: true });
  } catch (err) {
    console.error('Backend Subscribe Error Detail:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Database & Email server is ready on port ${PORT}!`));