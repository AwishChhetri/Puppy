// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const jwt= require('jsonwebtoken')
const http=require('http')
const nodemailer = require('nodemailer');
// Initialize Express app
const app = express();
const crypto = require('crypto');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = new socketIo.Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  require('dotenv').config(); 
  
// Middleware
app.use(bodyParser.json());
app.use(cors());


// Connect to MongoDB using Mongoose
mongoose.connect('mongodb+srv://Veltech:zvAyJKNSNQh2WtVh@cluster0.zurjhcy.mongodb.net/Student(ThirdYear)?retryWrites=true&w=majority&appName=Cluster0',{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    // console.log("DB Connected")
}).catch((err) => {
    // console.log("DB not connected", err)
});

const db = mongoose.connection;

// Define schema
const studentSchema = new mongoose.Schema({
    VTU: {
        type: String,
        unique: true,
        required: true
    },
    Name: {
        type: String,
        required: true
    },
    Degree: {
        type: String
    },
    MatchRequests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student' 
        }
    ],
    Matchs: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student' 
        }
    ],
    Gender: {
        type: String,
     
    },
    Picker:{
        type:Boolean,
        default:false,
    }
},{
    timestamps:true,
});

const ChatRoomSchema = new mongoose.Schema({
    roomId: { type: String, unique: true },
    messages: [
        {
            senderId: {
                type: String,
                
            },
            content: {
                type: String,
               
            }, 
            timestamp: { type: Date, default: Date.now } 
        }
    ]
});


const genderSchema = new mongoose.Schema({
  
        userId: {
            type: String,
           
        },
        Questions: [{
            type: String,
           
        }],
        LookingFor: {
            type: String,
           
        },
        Gender:{
            type: String,
        }

   
      
},
{
    timestamps:true,
});

// Create model from schema
const Gender = mongoose.model('Gender', genderSchema);


  
  // Create ChatRoom model
  const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);


// Create model
const Student = mongoose.model('Student', studentSchema);


// Server-side code

 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'cupid.thematchmakerr@gmail.com', // Your Gmail email address
      pass: 'mbyb cfhx vpzx kfby' // Your Gmail password or application-specific password
    }
  });

// Import necessary modules and set up server
io.on('connection', (socket) => {
    socket.on('connected', async (roomId) => {
        // console.log("User Connected");
        try {
            const chat = await ChatRoom.findOne({ roomId }, { messages: 1 });
            // console.log(chat)
            const previousMessages = chat ? chat.messages : [];
            // console.log('Previous Messages:', previousMessages);
            // Emit 'previous_messages' event to the connected client
            socket.emit('previous_messages', previousMessages);
        } catch (error) {
            // console.error('Error fetching previous messages:', error);
            // Handle error - You might want to emit an error event to the client
        }
    });

    socket.on('chat message', async (msg, callback) => { // Added 'callback' parameter
        // console.log('Received message:', msg);
        const { senderId, roomId, content } = msg;

        try {
            const updatedChatRoom = await ChatRoom.findOneAndUpdate(
                { roomId },
                {
                    $push: {
                        messages: {
                            senderId: senderId,
                            content: content,
                            timestamp: Date.now()
                        }
                    }
                },
                { new: true }
            );

            // console.log('Updated chat room:', updatedChatRoom);
            io.emit('chat message', msg);
            // Send acknowledgment to the client
            callback({ success: true }); // Sending success acknowledgment
        } catch (error) {
            console.error('Error updating chat room:', error);
            // Handle error - You might want to emit an error event to the client
            callback({ success: false, error: 'Error updating chat room' }); // Sending error acknowledgment
        }
    });
});





app.get('/insert', async (req, res) => {
    try {
        const data = fs.readFileSync('students.json', 'utf8');
        const jsonData = JSON.parse(data);
        const result = await Student.insertMany(jsonData);
        // console.log('Data inserted successfully:', result);
        res.status(200).send('Data inserted successfully');
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Error inserting data');
    }
});

app.post('/students', async (req, res) => {
    // console.log(req.body)
    try {

        const students = await Student.find({Degree:req.body.Degree});
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Error fetching students' });
    }
});

app.get('/students', async (req, res) => {
    
    try {

        const students = await Student.find();
        
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Error fetching students' });
    }
});


app.post('/student', async (req, res) => {
    try {
        const student = await Student.findById(req.body.userId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        // console.log(student)
        const matchRequests = student.Matchs;

        // Fetch VTU and name for each match request
        const matchRequestDetails = await Promise.all(matchRequests.map(async (matchRequest) => {
            const matchStudent = await Student.findById(matchRequest);
            if (matchStudent) {
                return { id: matchStudent._id, name: matchStudent.Name, VTU: matchStudent.VTU };
            }
        }));

        const count = matchRequestDetails.length; // Count the number of match requests

        // console.log(matchRequestDetails);
        res.status(200).json({ matchRequestDetails, count, student });
    } catch (error) {
        console.error('Error fetching match requests:', error);
        res.status(500).json({ error: 'Error fetching match requests' });
    }
});



const JWT_SECRET_KEY = 'Hamara hai';
app.post('/login', async (req, res) => {
    const { email } = req.body;

    // Verify email domain
    if (email.endsWith('@veltech.edu.in')) {
        // Extract student number
        const studentNumber = email.match(/vtu(\d{5})@veltech.edu.in/)[1];
        // console.log(studentNumber)
        try {
            // Fetch student from MongoDB
            const student = await Student.findOne({VTU: studentNumber });
            // console.log(student)
            if (student) {
                // Generate JWT
                const token = jwt.sign({
                    name: student.name,
                    studentNumber: student.studentNumber,
                    // Add more payload data as needed
                }, JWT_SECRET_KEY);

                // Return JWT as response
                res.status(200).json({ student, token });
            } else {
                res.status(404).json({mesg: 'Student not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(404).json({ error: 'Invalid email domain' });
    }
});

app.get('/matchRequest/:userId', async (req, res) => {
    const userId = req.params.userId; // Access userId directly from params
    // console.log(userId);

    try {
        // Find the student with the provided user ID
        const student = await Student.findOne({ _id: userId });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Retrieve the match requests from the student document
        const matchRequests = student.MatchRequests;

        // Fetch VTU and name for each match request
        const matchRequestDetails = await Promise.all(matchRequests.map(async (matchRequestId) => {
            const matchStudent = await Student.findById(matchRequestId);
            if (matchStudent) {
                return { id: matchStudent._id,name: matchStudent.Name, VTU: matchStudent.VTU };
            }
        }));

        const count = matchRequests.length; // Count the number of match requests

        // console.log(matchRequestDetails);
        return res.status(200).json({ matchRequestDetails, count });
    } catch (error) {
        console.error('Error searching for match requests:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});



app.post('/students/:id/add-user-id', async (req, res) => {
    const studentId = req.params.id;
    const userId = req.body.userId;

    try {
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        student.associatedUserIds.push(userId);
        await student.save();

        res.json(student);
    } catch (error) {
        console.error('Error adding user ID to student:', error);
        res.status(500).json({ error: 'Error adding user ID to student' });
    }
});


app.post('/add-match', async (req, res) => {
    const { userId, matchId } = req.body;

    try {
        // Check if the user exists
        const user = await Student.findById(matchId);
        const user1 = await Student.findById(userId);
        // console.log(user)
        // console.log(user1)
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if(!user1.MatchRequests.includes(matchId)){
            
            if(!user1.Matchs.includes(matchId)){
                if (user.MatchRequests.includes(userId)) {
                    if(!user.Matchs.includes(userId)){
                    user.Matchs.push(userId);
                    user1.Matchs.push(matchId);
                    await user.save();
                    await user1.save();
                    return res.status(200).json({ message: 'Congratulations! Match found' });
                    }else{
                        return res.status(200).json({ message: 'Aleady Matched' });
                    }
                    
                } else {
                    if (user1.MatchRequests.length < 8) {
                        user1.MatchRequests.push(matchId);
                        await user1.save();
                        return res.status(200).json({ message: 'Match Requested!' });
                    } else {
                        return res.status(201).json({ message: 'Limit exceeds!' });
                    }
                    
                }
            }else{
                return res.status(200).json({ message: 'You are already matched!' });
            }
            

        }else{
            return res.status(200).json({ message: 'Requested Already!' });

        }

        // Check if matchId is already added to MatchRequests
       
    } catch (error) {
        console.error('Error adding match ID:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});



  app.post('/approve', async (req, res) => {
    const { id, approvalStatus, userId } = req.body;
//    console.log(req.body)
    try {

        const student = await Student.findById(userId);
        //  console.log(student)
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (approvalStatus === true) {
            // If approvalStatus is true
            // Check if the match request ID already exists in the Matchs array
            if (student.Matchs.includes(id)) {
                // console.log('Match request already approved')
                return res.status(200).json({ message: 'Match request already approved' });
              
            }


           
        } else if (approvalStatus === false) {
            // If approvalStatus is false, delete the match request
            const response = await Student.updateOne(
                { _id: userId },
                { $pull: { MatchRequests: id } }
            );
            return res.status(200).json({ error: 'Deleted' });

            
        } else {
            // Handle invalid approvalStatus
            return res.status(400).json({ error: 'Invalid approval status' });
        }
    } catch (error) {
        console.error('Error processing approval:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/create-chat-room', async (req, res) => {
    const { senderId, receiverId } = req.body;

    function generateSingleValue(id1, id2) {
        const strId1 = id1.toString();
        const strId2 = id2.toString();

        // Sort the IDs
        const sortedIds = [strId1, strId2].sort();

        // Concatenate the sorted IDs
        const combinedIds = sortedIds.join('');

        // Hash the concatenated string using SHA-256
        const hash = crypto.createHash('sha256').update(combinedIds).digest('hex');

        return hash;
    }

    const roomId = generateSingleValue(senderId, receiverId);
    // console.log(roomId);

    try {
        // Check if the chat room already exists
        const existingRoom = await ChatRoom.findOne({ roomId });

        if (existingRoom) {
            // If room already exists, return a message
            return res.status(200).json({ roomId });
        }

        // If room doesn't exist, create a new one
        const newRoom = new ChatRoom({ roomId });
        await newRoom.save();

        // Return the room ID
        return res.status(200).json({ roomId });
    } catch (error) {
        console.error('Error creating chat room:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


  app.get('/chat-room-messages', async (req, res) => {
    const { roomId } = req.query;

    try {
        // Fetch messages for the specified room
        const chatRoom = await ChatRoom.findOne({ roomId });

        if (!chatRoom) {
            return res.status(404).json({ message: 'Chat room not found' });
        }

        const messages = chatRoom.messages;
        // console.log(messages)
        // Return the messages
        return res.status(200).json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/',(req,res)=>{
    res.send("Hello this is Cupid!")
})

  
app.post('/cupidPicker', async (req, res) => {
    try {
        if (req.body.pickerStatus === true) {
            
            res.status(500).json({ message: "Already submitted" });
          }

        // console.log(req.body);
        const { sex, lookingFor, ...responses } = req.body;
        const userId = req.body.userId;
        // console.log("Sex:", sex);
        // console.log("Looking for:", lookingFor);

        // Update the student's gender
        const updatedStudent = await Student.findByIdAndUpdate(
            userId, // Search criteria
            { $set: { Gender: sex ,Picker: true } }, // Set the new gender value
            { new: true } // Return the updated document
        );

        if (!updatedStudent) {
            return res.status(404).json({ error: "No student found with the specified ID" });
        }

        // Log the updated student
        // console.log("Updated student:", updatedStudent);

        // Construct query to match each selected option separately
        const matchingQuery = {
            Gender: lookingFor,
            LookingFor: sex,
        };
        // console.log("match Query", matchingQuery);
        
        // Find documents in the Gender collection matching the constructed query
        let matching = await Gender.find(matchingQuery);
        // console.log("matching", matching);

        // Filter out documents with the same userId as the current user
        matching = matching.filter(doc => doc.userId !== userId);
        // console.log("matching after filter", matching);

        const finalMatch = [];

        // Filter matching documents based on selected options
         matching.filter(item => {
            // console.log(item.Questions)
            const isMatch = responses.selectedOptions.every((option, index) => {
                // console.log("Option:",option)
                // console.log("Questions",item.Questions[index])
                
                 return option === item.Questions[index];
             
                
            });
            if(isMatch){
                finalMatch.push(item)
            }
        
            return isMatch;
        });
        // console.log("Final Matches:", finalMatch);
        
        if (finalMatch.length === 0) {
            // console.log("match not found");
        } else {
            // console.log("match found");
        
           
        
            try {

                const matchedUserIds = finalMatch.map(match => match.userId);
                // console.log(matchedUserIds);
                // Update current user's matches array with matchedUserIds
                const updatedStudents = await Student.findByIdAndUpdate(
                    userId,
                    { $push: { Matchs: { $each: matchedUserIds } } }, // Add matched user's userIds to current user's matches array
                    { new: true }
                );
        
                // Update each matched user's matches array with current user's ID
                const updatedStudent2 = await Promise.all(matchedUserIds.map(async (matchedUserId) => {
                    // Find the student by userId and update their matches array
                    return await Student.findByIdAndUpdate(
                        matchedUserId,
                        { $push: { Matchs: userId } }, // Add current user's userId to matches array
                        { new: true }
                    );
                }));
        
                // console.log("Updated students with matches:", updatedStudents);
                // console.log("Updated students with matches:", updatedStudent2);

                        
const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: 'Cupid',
            to,
            subject,
            text,
        });
        // console.log('Email sent successfully to:', to);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};
// console.log(updatedStudents.VTU)
const vtu1 = updatedStudents.VTU;
const maleUserEmail = `vtu${vtu1}@veltech.edu.in`;
const subjectTemplate = 'A Match Has Been Found For You!';
const textTemplate = `Hey User,
Exciting news! We've discovered a potential match just for you. Log in to cupidhub.online to learn more. Keep an open mind as you embark on this journey of discovery, connection, and perhaps even love!

Warm regards,
Cupid`;

// Send email to the first user
sendEmail(maleUserEmail, subjectTemplate, textTemplate);

// Send emails to other users
updatedStudent2.forEach((item) => {
    const vtu = item.VTU;
    const userEmail = `vtu${vtu}@veltech.edu.in`;
    const subjectTemplate = 'Cupid have found a match for you!';
const textTemplate = `Hey User,
Exciting news! We've discovered a potential match just for you. Log in to cupidhub.online to learn more. Keep an open mind as you embark on this journey of discovery, connection, and perhaps even love!
Link: www.cupidhub.online
Warm regards,
Cupid`;
    sendEmail(userEmail, subjectTemplate, textTemplate);
})
            } catch (error) {
                console.error("Error updating students with matches:", error);
                // Handle error if updating students fails
            }

         

             
             
             
        }
        
        

       

        // Save the responses to Gender collection
        const newGender = new Gender({
            userId: userId,
            LookingFor: lookingFor,
            Questions: responses.selectedOptions,
            Gender: sex,
        });

        const savedGender = await newGender.save();
        // console.log("Saved gender:", savedGender);

        res.status(200).json({ message: "Student details updated successfully", student: updatedStudent });
    } catch (error) {
        // Handle errors
        console.error("Error:", error);
        res.status(500).json({ error: "An error occurred while updating student details" });
    }
});




app.post('/studentDetails', async (req, res) => {
    try {
        const { userId } = req.body;
        // console.log("=================",req.body)
        // Find the student details by userId
        const student = await Student.findById(userId);

        if (!student) {
            return res.status(404).json({ error: "No student found with the specified ID" });
        }

        // Retrieve the Picker status from the student document
        const pickerStatus = student.Picker;
        const name= student.Name; // Assuming the picker status is stored in the PickerStatus field
        // console.log(pickerStatus,name)
        // Respond with the Picker status
        res.send({ PickerStatus: pickerStatus , name:name});
    } catch (error) {
        // Handle errors
        console.error("Error:", error);
        res.status(500).json({ error: "An error occurred while fetching student details" });
    }
});




// Start the server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    // console.log(`Server running on port ${PORT}`);
  });


   
 


     // Example usage:
            //   const maleUserEmail = 'vtu18995@veltech.edu.in'; // Replace with the male user's email address
            //   const subject = 'A Match Has Been Found For You!';
            //   const text = `Hey User,
            //   Exciting news! We've discovered a potential match just for you. Log in to cupidhub.online to learn more. Keep an open mind as you embark on this journey of discovery, connection, and perhaps even love!
              
            //   Warm regards,
            //   Cupid`;
              
            //   sendEmail(maleUserEmail, subject, text);
             