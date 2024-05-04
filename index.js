// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const jwt= require('jsonwebtoken')
// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

const cors = require('cors');
const corsOptions ={
    origin:'https://maya-inky.vercel.app', 
    credentials:true,            
    optionSuccessStatus:200
}
app.use(cors(corsOptions));


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
    ]
});

// Create model
const Student = mongoose.model('Student', studentSchema);


// Define routes
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
      console.log(user)
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Check if matchId is already added to MatchRequests
      if (!user.MatchRequests.includes(userId)) {
        // If not added, update the MatchRequests array
        user.MatchRequests.push(userId);
        const resp=await user.save();
        console.log(resp)
        return res.status(200).json({ message: 'Match ID added successfully' });
      } else {
        return res.status(400).json({ error: 'Match ID already exists in MatchRequests' });
      }
    } catch (error) {
      console.error('Error adding match ID:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });


  app.post('/approve', async (req, res) => {
    const { id, approvalStatus, userId } = req.body;
   console.log(req.body)
    try {
        // Find the student by ID
        const student = await Student.findById(userId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (approvalStatus === true) {
            // If approvalStatus is true, add the match request ID to the Matchs array
            // and delete it from the matchRequests array
            const response = await Student.updateOne(
                { _id: userId },
                { $push: { Matchs: id }, $pull: { MatchRequests: id } }
            );
            console.log(response)
            if (response.nModified === 1) {
                console.log("Updated")
                return res.status(200).json({ message: 'Match request approved and processed successfully' });
            } else {
                return res.status(500).json({ error: 'Error processing approval' });
            }
        } else if (approvalStatus === false) {
            // If approvalStatus is false, delete the match request
            const response = await Student.updateOne(
                { _id: userId },
                { $pull: { MatchRequests: id } }
            );

            if (response.nModified === 1) {
                return res.status(200).json({ message: 'Match request deleted successfully' });
            } else {
                return res.status(500).json({ error: 'Error deleting match request' });
            }
        } else {
            // Handle invalid approvalStatus
            return res.status(400).json({ error: 'Invalid approval status' });
        }
    } catch (error) {
        console.error('Error processing approval:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

  
  
// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
