const express = require('express');
const cors = require('cors');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const { Resend } = require('resend'); // Fixed: Correct destructuring for Resend

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

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

// Receive Contact Form Details
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    await ContactMessage.create({ name, email, message });

    // Fixed: Swapped out old emailTransporter for Resend HTTP format
    await resend.emails.send({
      from: 'Website Inquiry <onboarding@resend.dev>', // Free tier default sandbox sender
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
    res.json({ success: false, error: 'Database or mail delivery failed.' });
  }
});

// Updated Subscriber Route that handles duplicate emails gracefully
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Instead of forcing a brand new entry, find or update the existing subscriber
    const [subscriber, created] = await Subscriber.findOrCreate({
      where: { email: email.toLowerCase().trim() },
      defaults: { email: email.toLowerCase().trim() }
    });

    // Sent via Resend API
    await resend.emails.send({
      from: 'Newsletter Alert <onboarding@resend.dev>',
      to: 'admin@theflyingscot.co.nz',
      subject: 'New Website Notification!',
      text: `Great news! A user has subscribed to your newsletter.\n\nEmail: ${email}`
    });

    if (!created) {
      return res.json({ success: true, message: 'Welcome back! You were already on our list.' });
    }

    res.json({ success: true, message: 'Thank you for subscribing!' });

  } catch (error) {
    console.error('Backend Subscribe Error Detail:', error);
    res.status(500).json({ success: false, error: 'Database processing error.' });
  }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Database & Email server is ready on port ${PORT}!`));