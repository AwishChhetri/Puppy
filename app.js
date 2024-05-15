// const nodemailer = require('nodemailer');
// const fs = require('fs');

// // Create Nodemailer transporter
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'cupidveltech@gmail.com',
//         pass: 'vzsa oxek kowz mkob'
//     }
// });

// const l = [];

// fs.readFile('Student2.json', 'utf8', (err, data) => {
//     if (err) {
//         console.error('Error reading file:', err);
//         return;
//     }
//     const jsonData = JSON.parse(data);
//     sendEmails(jsonData);
// });

// // Function to send email
// const sendEmail = async (to, subject, text) => {
//     try {
//         const res = await transporter.sendMail({
//             from: 'Cupid <cupidveltech@gmail.com>',
//             to,
//             subject,
//             text,
//         });
//         l.push(to);
//         console.log('Email sent successfully to:', to);
//     } catch (error) {
//         console.error('Error sending email:', error);
//     }
// };

// // Function to send emails to recipients within a specified range
// const sendEmails = async (jsonData) => {
//     const promises = [];
//     const start = 250; // Start index
//     const end = Math.min(300, jsonData.length); // End index (limit to jsonData length)
//     for (let i = start; i < end; i++) {
//         const item = jsonData[i];
//         const vtu = item.VTU;
//         const userEmail = `vtu${vtu}@veltech.edu.in`;
//         const subject = 'Veltech udyogam tho chokri!';
//         const text = `Hey Users! \n\nExciting news awaits you! If you're ready to spark some magic and find your special someone, we've got just the thing for you! 🌟\n\nIntroducing CupidHub - Your Ultimate Matchmaking Destination!\n\nHere's how to dive into the world of romance:\n\n1)Login to our enchanting platform: [CupidHub Online](https://cupidhub.online/)\n2)Explore the plethora of features designed just for you.\n3)Find your perfect match and start a delightful conversation!\n\nRest assured, your privacy and security are our top priorities. All your interactions are safe and encrypted, allowing you to connect with confidence and ease. 💖\n\nSo, what are you waiting for? Trust your instincts, and let the journey of love begin! 💑\n\nHappy Matching! \n\nWith Love and Cupid's Arrows,\nCupid`;
//         promises.push(sendEmail(userEmail, subject, text));
//     }

//     try {
//         await Promise.all(promises);
//     } catch (error) {
//         console.error('Error sending emails:', error);
//     } finally {
//         console.log("Emails sent to the following addresses:", l);
//     }
// };


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

// Function to send emails to recipients within a specified range
const sendEmails = async (jsonData) => {
    const promises = [];
    const start = 400; // Start index
    const end = Math.min(450, jsonData.length); // End index (limit to jsonData length)
    for (let i = start; i < end; i++) {
        const item = jsonData[i];
        const vtu = item.VTU;
        const userEmail = `vtu${vtu}@veltech.edu.in`;
        const subject = 'Who’s Your Campus Crush? Let’s Find Out!';
        const text = `Hey Users! \n\nExciting news awaits you! If you're ready to spark some magic and find your special someone, we've got just the thing for you! 🌟\n\nIntroducing CupidHub - Your Ultimate Matchmaking Destination!\n\nHere's how to dive into the world of romance:\n\n1)Login to our enchanting platform: [CupidHub Online](https://cupidhub.online/)\n2)Explore the plethora of features designed just for you.\n3)Find your perfect match and start a delightful conversation!\n\nRest assured, your privacy and security are our top priorities. All your interactions are safe and encrypted, allowing you to connect with confidence and ease. 💖\n\nSo, what are you waiting for? Trust your instincts, and let the journey of love begin! 💑\n\nHappy Matching! \n\nWith Love and Cupid's Arrows,\nCupid`;
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
