// server.js (Node.js with Express)
const express = require("express");
const { engine } = require("express-handlebars");
const path = require("path");
const app = express();
const Handlebars = require("handlebars");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const User = require("./model/user");
const Forum = require("./model/forum");
const session = require("express-session");
const crypto = require("crypto");
const MongoStore = require("connect-mongo");
const moment = require("moment");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { exec } = require('child_process');

mongoose.connection.models = {};

const secret = crypto.randomBytes(64).toString("hex");
console.log(secret);

Handlebars.registerHelper("-", function (a, b) {
  return a - b;
});
// Define the formatDate helper
Handlebars.registerHelper("formatDate", function (date, format) {
  const dateFormat = typeof format === "string" ? format : "YYYY-MM-DD";
  return moment(date).format(dateFormat);
});
Handlebars.registerHelper("safeGet", function (obj, prop) {
  return obj && obj.hasOwnProperty(prop) ? obj[prop] : undefined;
});
Handlebars.registerHelper('isMoreTopics', function(category, allTopics) {
  const topicsInCategory = allTopics.filter(topic => topic.category === category);
  return topicsInCategory.length > 3; // Return true if there are more than 3 topics in this category
});
Handlebars.registerHelper("allowProtoPropertiesByDefault", true);
Handlebars.registerHelper("allowProtoMethodsByDefault", true);

// Set up Handlebars view engine
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    defaultLayout: "main", // Use 'main.hbs' as the default layout
    helpers: {
      formatDate: Handlebars.helpers.formatDate, // Register the formatDate helper
    },
    allowProtoPropertiesByDefault: true,
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://minooeip:minooei89@cluster0.c7gpila.mongodb.net/InstaDevOne",
    }),
  })
);

// Create a transporter object using your Gmail SMTP settings
const transporter = nodemailer.createTransport({
  service: "gmail", // Use Gmail's SMTP service
  auth: {
    user: "instadevone@gmail.com", // Your Gmail email address
    pass: "weew oqkc facy lcja", // Your Gmail password (consider using environment variables for security)
  },
});

app.use(express.static(path.join(__dirname, "public"))); // Ensure correct path for static files
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(bodyParser.json());
app.use(express.json());

app.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

mongoose
  .connect(
    "mongodb+srv://minooeip:minooei89@cluster0.c7gpila.mongodb.net/InstaDevOne"
  )
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

// Sample portfolio data (replace with MongoDB data later)
const portfolioData = {
  name: "Parjad",
  logo: "/images/logo.jpg",
  projects: [
    {
      title: "Project 1",
      description: "This is a test",
      image: "/images/logo.jpg",
    },
  ],
  year: new Date().getFullYear(),
};

app.get("/", (req, res) => {
  const username = req.session.username;
  res.render("home", { portfolioData, username }); // Render 'home.hbs' with data
});

app.get('/project/codeeditor', (req, res) => {
  const username = req.session.username;
  res.render('codeeditor', { portfolioData, username }); 
});

app.get("/about", (req, res) => {
  const username = req.session.username;
  res.render("about", { portfolioData, username });
});

app.get("/projects", (req, res) => {
  const username = req.session.username;
  res.render("project", { portfolioData, username });
});

app.post('/run', (req, res) => {
  const code = req.body.code;
  const fileName = 'HelloWorld.java';

  // Write the code to a file
  require('fs').writeFileSync(fileName, code);

  // Compile the Java code
  exec(`javac ${fileName}`, (err, stdout, stderr) => {
      if (err) {
          return res.json({ error: stderr });
      }

      // Run the compiled Java code
      exec(`java HelloWorld`, (err, stdout, stderr) => {
          if (err) {
              return res.json({ error: stderr });
          }
          res.json({ output: stdout });
      });
  });
});



app.get("/skills", (req, res) => {
  const username = req.session.username;
  res.render("skills", { portfolioData, username });
});

app.get("/contact", (req, res) => {
  const username = req.session.username;
  res.render("contact", { portfolioData, username });
});

app.post("/contact", (req, res) => {
  if (req.session.username) {
    // Check if user is logged in
    const { name, email, message } = req.body;

    // Create the email message
    const mailOptions = {
      from: email, // Sender's email address (from the form)
      to: "instadevone@gmail.com", // Recipient's email address
      subject: "New Contact Form Submission",
      text: `
                Name: ${name}
                Email: ${email}
                Message: ${message}
            `,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        res.status(500).send("An error occurred while sending your message.");
      } else {
        res.redirect("/");
      }
    });
  } else {
    res.redirect("/user"); // Redirect to login if not authenticated
  }
});

app.get("/news", (req, res) => {
  const username = req.session.username;
  res.render("news", { portfolioData, username });
});

app.get("/user", (req, res) => {
  const username = req.session.username;
  res.render("login", { portfolioData, username });
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send("Username and password are required.");
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).send("Invalid username or password.");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(400).send("Invalid username or password.");

    req.session.username = user.username;
    req.session.userId = user._id; // Store the user's ID in the session
    return res.redirect("/");
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).send("An error occurred during login.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    // Destroy the user's session
    if (err) {
      console.error("Error destroying session:", err);
      // Handle the error gracefully, perhaps by displaying an error message to the user
    } else {
      res.redirect("/"); // Redirect to the home page after logout
    }
  });
});

app.get("/register", (req, res) => {
  const username = req.session.username;
  res.render("register", { portfolioData, username });
});

app.post("/register", async (req, res) => {
  try {
    // Basic input validation (you'll likely want to add more robust validation)
    const {
      username,
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      address,
    } = req.body;

    if (
      !username ||
      !email ||
      !password ||
      !confirmPassword ||
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !gender ||
      !address
    ) {
      return res.status(400).send("All fields are required.");
    }

    if (password !== confirmPassword) {
      return res.status(400).send("Passwords do not match.");
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).send("User already registered.");

    user = new User({
      username,
      email,
      // Hash the password before saving
      password: await bcrypt.hash(password, 10),
      firstName,
      lastName,
      dateOfBirth,
      gender,
      address,
    });

    await user.save();

    // Log out the previous user (if any)
    if (req.session.username) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying previous session:", err);
        }
      });
    }

    req.session.username = username; // Store the username in the session
    console.log("Successfuly registered");
    res.redirect("/");
  } catch (err) {
    console.error("Error during registration:", err); // Log the error for debugging
    res.status(500).send("An error occurred during registration."); // Send an error response to the client
  }
});
// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.session.username) {
    return next(); // User is logged in, proceed to the next middleware/route handler
  } else {
    res.redirect("/user"); // Redirect to login if not authenticated
  }
}
// Apply the middleware to the /profile route
app.get("/profile", ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.session.username });
    if (!user) return res.status(404).send("User not found.");

    res.render("profile", {
      portfolioData,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).send("An error occurred while fetching your profile.");
  }
});

app.get('/forum', async (req, res) => {
  const loggedInUsername = req.session.username;
  try {
    // Fetch all forums (or filter by a specific category if needed)
    const forums = await Forum.find({})
      .populate('topics.createdBy topics.posts.createdBy'); 
    if (!forums || forums.length === 0) { 
      return res.status(500).send('No forums found. Please create a forum first.');
    }

    // You might want to handle multiple forums here if needed
    const forum = forums[0]; // Get the first forum for now
    
    let topics = forum.topics;

    if (loggedInUsername) {
      // Filter topics created by the logged-in user
      const userTopics = topics.filter(
        (topic) =>
          topic.createdBy && topic.createdBy.username === loggedInUsername
      );

      // If the user has created topics, show only those
      // Otherwise, show all topics
      topics = userTopics.length > 0 ? userTopics : topics;
    }

    res.render("forum", {
      portfolioData,
      username: loggedInUsername,
      categories: forum.categories, 
      topics,
    });
  } catch (err) {
    console.error("Error fetching forum data:", err);
    res.status(500).send("An error occurred while fetching the forum.");
  }
});

app.get('/forum/category/:categoryName', async (req, res) => {
  try {
    const categoryName = req.params.categoryName;

    // Find the forum document and filter topics by category
    const forum = await Forum.findOne({});

    if (!forum) {
      return res.status(500).send('No forum found.');
    }

    const topics = forum.topics.filter(topic => topic.category === categoryName);

    res.render('category', { 
      portfolioData, 
      username: req.session.username, 
      category: categoryName,
      topics 
    }); 
  } catch (err) {
    console.error('Error fetching topics for category:', err);
    res.status(500).send('An error occurred while fetching the topics.');
  }
});
// Route to handle creating a new topic (protected)
app.get('/forum/create-topic/:categoryName', ensureAuthenticated, (req, res) => {
  const categoryName = req.params.categoryName;
  res.render('create-topic', { portfolioData, categoryName }); 
});
app.post('/forum/create-topic/:categoryName', ensureAuthenticated, async (req, res) => {
  try {
    const { title, content } = req.body;
    const categoryName = req.params.categoryName;

    // Input validation 
    if (!title || !content) {
      return res.status(400).send('Title and content are required.');
    }

    // Find the existing forum document 
    let forum = await Forum.findOne({});

    if (!forum) { 
      return res.status(500).send('No forum found. Please create a forum first.');
    }

    // Check if the specified category exists in the forum
    if (!forum.categories.includes(categoryName)) {
      return res.status(400).send('Invalid category.');
    }

    const newTopic = {
      title,
      category: categoryName,  
      createdBy: req.session.username || "defaultUser",
      posts: [
        {
          content,
          createdBy: req.session.username || "defaultUser"
        }
      ]
    };

    // Update the forum document using $push to add the new topic to the topics array
    await Forum.updateOne({}, { $push: { topics: newTopic } });

    res.redirect('/forum'); // Redirect to the forum page 
  } catch (err) {
    console.error('Error creating topic:', err);
    res.status(500).send('An error occurred while creating the topic.');
  }
});
app.get('/forum/category/:categoryName', async (req, res) => {
try {
  const categoryName = req.params.categoryName;

  const forum = await Forum.findOne({});
  if (!forum) {
    return res.status(500).send('No forum found.');
  }

  const topics = forum.topics.filter(topic => topic.category === categoryName);

  res.render('forum', {  // You might want to create a separate template for displaying all topics in a category
    portfolioData, 
    username: req.session.username, 
    category: categoryName,
    topics 
  }); 
} catch (err) {
  console.error('Error fetching topics for category:', err);
  res.status(500).send('An error occurred while fetching the topics.');
}
});



// Route to handle creating a new topic (protected)
app.get("/forum/create-topic", ensureAuthenticated, (req, res) => {
  const username = req.session.username;
  res.render("create-topic", { portfolioData, username });
});

app.post("/forum/create-topic", ensureAuthenticated, async (req, res) => {
  try {
    const { title, content } = req.body;

    // Input validation
    if (!title || !content) {
      return res.status(400).send("Title and content are required.");
    }

    // Find the existing forum document
    let forum = await Forum.findOne({});

    if (!forum) {
      return res
        .status(500)
        .send("No forum found. Please create a forum first.");
    }

    // Find the user based on the username in the session
    const user = await User.findOne({ username: req.session.username });

    if (!user) {
      return res.status(401).send("User not found. Please log in again.");
    }

    const newTopic = {
      title,
      createdBy: req.session.username, // Use the username from the session
      posts: [
        {
          content,
          createdBy: req.session.username,
        },
      ],
    };
    console.log(req.session.username);
    // Update the forum document using $push to add the new topic to the topics array
    await Forum.updateOne({}, { $push: { topics: newTopic } });

    // Fetch the updated forum document to get the _id of the newly created topic
    const updatedForum = await Forum.findOne({});
    const createdTopic = updatedForum.topics.find(
      (topic) => topic.title === title
    ); // Find the topic by its title

    if (!createdTopic || !createdTopic._id) {
      return res
        .status(500)
        .send("An error occurred while creating the topic.");
    }
    res.redirect("/forum?refresh=true"); // Redirect to the new topic's page
  } catch (err) {
    console.error("Error creating topic:", err);
    res.status(500).send("An error occurred while creating the topic.");
  }
});

// Route to view a specific topic
app.get('/forum/topic/:topicId', async (req, res) => {
  try {
      const topicId = req.params.topicId;

      const forum = await Forum.findOne({ 'topics._id': topicId })
          .populate('topics.createdBy') 
          .populate('topics.posts.createdBy'); 

      if (!forum) {
          return res.status(404).send('Forum not found.');
      }

      const topic = forum.topics.id(topicId); 

      if (!topic) {
          return res.status(404).send('Topic not found.');
      }

      res.render('forum-topic', {  // Render the forum-topic.hbs template
          portfolioData, 
          username: req.session.username, 
          topic 
      }); 
  } catch (err) {
      console.error('Error fetching topic:', err);
      res.status(500).send('An error occurred while fetching the topic.');
  }
});

// Route to handle posting a reply to a topic (protected)
app.post('/forum/topic/:topicId/reply', ensureAuthenticated, async (req, res) => {
  try {
      const topicId = req.params.topicId;
      const { replyContent } = req.body;

      // Input validation 
      if (!replyContent) {
          return res.status(400).send('Reply content is required.');
      }

      // Find the forum document and update the specific topic's posts array
      const result = await Forum.updateOne(
          { 'topics._id': topicId },
          { $push: { 'topics.$.posts': { content: replyContent, createdBy: req.session.username } } }
      );

      if (result.modifiedCount === 0) { // Check if the update was successful
          return res.status(404).send('Topic not found or unable to update.');
      }

      res.redirect(`/forum/topic/${topicId}`); // Redirect back to the same topic page
  } catch (err) {
      console.error('Error posting reply:', err);
      res.status(500).send('An error occurred while posting your reply.');
  }
});

app.listen(3000, () => console.log("Server started on port 3000"));
