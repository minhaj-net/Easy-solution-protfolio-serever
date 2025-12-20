require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");

const app = express();
const port = process.env.PORT || 5000;
// MongoDB connection URI
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iesbwy6.mongodb.net/?appName=Cluster0`;
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@easysolutions01.kion0l5.mongodb.net/?appName=easysolutions01`;

// Middleware
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Create MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let contactCollection;
let serviceCollection;
let projectCollection;
// Connect to MongoDB and initialize collection
async function connectDB() {
  try {
    await client.connect();
    const db = client.db("contactForm");
    contactCollection = db.collection("senderInfo");
    serviceCollection = db.collection("service");
    projectCollection = db.collection("project");
    
    // await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}
connectDB();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email configuration error:", error);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});
//project related APIs
app.get("/projects", async (req, res) => {
  const result = await projectCollection.find().toArray();
  res.send(result);
});


//service data insert
app.get("/service", async (req, res) => {
  const result = await serviceCollection.find().toArray();
  res.send(result);
});

app.get("/project/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid service ID" });
    }

    const query = { _id: new ObjectId(id) };
    const result = await projectCollection.findOne(query);

    if (!result) {
      return res.status(404).send({ message: "Service not found" });
    }

    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch service" });
  }
});
// Service Related APIs
app.post("/service", async (req, res) => {
  const newService = req.body;
  const result = await serviceCollection.insertOne(newService);
  res.send(result);
});
app.get("/service/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid service ID" });
    }

    const query = { _id: new ObjectId(id) };
    const result = await serviceCollection.findOne(query);

    if (!result) {
      return res.status(404).send({ message: "Service not found" });
    }

    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch service" });
  }
});

// Send email & save to DB
app.post("/api/send-email", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (name, email, subject, message)",
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }
    // Save to MongoDB
    const dbResult = await contactCollection.insertOne({
      name,
      email,
      subject,
      message,
      createdAt: new Date(),
    });

    console.log("Saved contact to DB:", dbResult.insertedId);

    // Email options
    //dfjdf
    const mailOptions = {
      from: `${name} ${process.env.RECEIVER_EMAIL}`,
      to: process.env.RECEIVER_EMAIL,
      replyTo: email,
      subject: `${subject}`,
      text: `
              New Contact Form Submission

              Name: ${name}
              Email: ${email}
              Subject: ${subject}
                
              Message:
              ${message}

              ---
              Easy Solution LTD
              Received: ${new Date().toLocaleString()}
                    `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    // console.log("✅ Email sent:", info.messageId);

    res.status(200).json({
      success: true,
      message: "Email sent and saved to database successfully!",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("❌ Error in send-email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Email & DB server is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Start server
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🚀 Email & MongoDB Backend Started");
      console.log(`📡 Server running on: http://localhost:${port}`);
      console.log(
        `📧 Email User: ${process.env.EMAIL_USER || "Not configured"}`
      );
      console.log(
        `📬 Receiver: ${process.env.RECEIVER_EMAIL || "Not configured"}`
      );
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
