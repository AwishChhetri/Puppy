const nodemailer = require('nodemailer');
const fs = require('fs');

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'cupid.thematchmakerr@gmail.com',
        pass: 'mbyb cfhx vpzx kfby'
    }
});

const l = [];

// Read JSON data asynchronously
fs.readFile('Student2.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    const jsonData = JSON.parse(data);
    sendEmails(jsonData);
});

// Function to send email
const sendEmail = async (to, subject, text) => {
    try {
        const res = await transporter.sendMail({
            from: 'Cupid <cupid.thematchmakerr@gmail.com>',
            to,
            subject,
            text,
        });
        l.push(to);
        console.log('Email sent successfully to:', to);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// Function to send emails to the first 100 recipients
const sendEmails = async (jsonData) => {
    const promises = [];
    const start = 50;
    const end = Math.min(60, jsonData.length);  // Ensure we don't go out of bounds
    for (let i = start; i < end; i++) {
        const item = jsonData[i];
        const vtu = item.VTU;
        const userEmail = `vtu${vtu}@veltech.edu.in`;
        const subject = 'Let\'s find a match for you!';
        const text = `
            💌 Hey Users! 💌\n\n
            Exciting news awaits you! If you're ready to spark some magic and find your special someone, we've got just the thing for you! 🌟\n\n
            🌟 Introducing CupidHub - Your Ultimate Matchmaking Destination! 🌟\n\n
            Here's how to dive into the world of romance:\n\n
            1) 🔑 Login to our enchanting platform: [CupidHub Online](https://cupidhub.online/)\n
            2) 💖 Explore the plethora of features designed just for you.\n
            3) 💘 Find your perfect match and start a delightful conversation!\n\n
            Rest assured, your privacy and security are our top priorities. All your interactions are safe and encrypted, allowing you to connect with confidence and ease. 💖\n\n
            So, what are you waiting for? Trust your instincts, and let the journey of love begin! 💑\n\n
            Happy Matching! 🎉\n\n
            With Love and Cupid's Arrows,\n
            💘 Cupid 💘
        `;
        promises.push(sendEmail(userEmail, subject, text));
    }

    try {
        await Promise.all(promises);
    } catch (error) {
        console.error('Error sending emails:', error);
    } finally {
        console.log("Emails sent to the following addresses:", l);
    }
};
