// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const jwt= require('jsonwebtoken')
const http=require('http')
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
  
// Middleware
app.use(bodyParser.json());
app.use(cors());


// Connect to MongoDB using Mongoose
mongoose.connect('mongodb+srv://Veltech:zvAyJKNSNQh2WtVh@cluster0.zurjhcy.mongodb.net/Student(ThirdYear)?retryWrites=true&w=majority&appName=Cluster0',{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("DB Connected")
}).catch((err) => {
    console.log("DB not connected", err)
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

  
  // Create ChatRoom model
  const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);


// Create model
const Student = mongoose.model('Student', studentSchema);


// Server-side code

// Import necessary modules and set up server
io.on('connection', (socket) => {
    socket.on('connected', async (roomId) => {
        console.log("User Connected");
        try {
            const chat = await ChatRoom.findOne({ roomId }, { messages: 1 });
            console.log(chat)
            const previousMessages = chat ? chat.messages : [];
            console.log('Previous Messages:', previousMessages);
            // Emit 'previous_messages' event to the connected client
            socket.emit('previous_messages', previousMessages);
        } catch (error) {
            console.error('Error fetching previous messages:', error);
            // Handle error - You might want to emit an error event to the client
        }
    });

    socket.on('chat message', async (msg, callback) => { // Added 'callback' parameter
        console.log('Received message:', msg);
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

            console.log('Updated chat room:', updatedChatRoom);
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





// app.get('/insert', async (req, res) => {
//     try {
//         const data = fs.readFileSync('students.json', 'utf8');
//         const jsonData = JSON.parse(data);
//         const result = await Student.insertMany(jsonData);
//         console.log('Data inserted successfully:', result);
//         res.status(200).send('Data inserted successfully');
//     } catch (error) {
//         console.error('Error inserting data:', error);
//         res.status(500).send('Error inserting data');
//     }
// });

app.post('/students', async (req, res) => {
    console.log(req.body)
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
        console.log(student)
        const matchRequests = student.Matchs;

        // Fetch VTU and name for each match request
        const matchRequestDetails = await Promise.all(matchRequests.map(async (matchRequest) => {
            const matchStudent = await Student.findById(matchRequest);
            if (matchStudent) {
                return { id: matchStudent._id, name: matchStudent.Name, VTU: matchStudent.VTU };
            }
        }));

        const count = matchRequestDetails.length; // Count the number of match requests

        console.log(matchRequestDetails);
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
        console.log(studentNumber)
        try {
            // Fetch student from MongoDB
            const student = await Student.findOne({VTU: studentNumber });
            console.log(student)
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
    console.log(userId);

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

        console.log(matchRequestDetails);
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

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if(!user1.MatchRequests.includes(matchId)){
            if(!user1.Matchs.includes(matchId)){
                if (user.MatchRequests.includes(userId)) {
                    if(user.Matchs.includes(userId)){
                    user.Matchs.push(userId);
                    user1.Matchs.push(matchId);
                    await user.save();
                    await user1.save();
                    return res.status(200).json({ message: 'Match found' });
                    }else{
                        return res.status(200).json({ message: 'Aleady Matched' });
                    }
                    
                } else {
                    if (user1.MatchRequests.length < 8) {
                        user1.MatchRequests.push(matchId);
                        await user1.save();
                        return res.status(200).json({ message: 'Match ID added successfully' });
                    } else {
                        return res.status(200).json({ message: 'Reached your max limit' });
                    }
                    
                }
            }else{
                return res.status(200).json({ message: 'Aleady Matched' });
            }
            

        }else{
            return res.status(200).json({ message: 'Match ID already in request' });

        }

        // Check if matchId is already added to MatchRequests
       
    } catch (error) {
        console.error('Error adding match ID:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});



  app.post('/approve', async (req, res) => {
    const { id, approvalStatus, userId } = req.body;
   console.log(req.body)
    try {

        const student = await Student.findById(userId);
         console.log(student)
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (approvalStatus === true) {
            // If approvalStatus is true
            // Check if the match request ID already exists in the Matchs array
            if (student.Matchs.includes(id)) {
                console.log('Match request already approved')
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
    console.log(roomId);

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
        console.log(messages)
        // Return the messages
        return res.status(200).json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});



  
  
// Start the server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

 
  function generateSingleValue(id1, id2) {
    // Convert IDs to strings
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

// Example usage:
const id1 = "6050b14363d4380041f0a2a1"; // Example ObjectId 1
const id2 = "6050b14663d4380041f0a2a2"; // Example ObjectId 2

const singleValue = generateSingleValue(id1, id2);
console.log(singleValue);