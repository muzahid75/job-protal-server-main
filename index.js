const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
var cors = require("cors");
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;

const verifyToken = (req, res, next) => {
  const token = req.cookies.token; // Get token from HTTP-only cookie
  console.log("token : ", token);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden: Invalid token" });
    }
    req.user = decoded;
    next();
  });
};

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://job-protal-a281f.firebaseapp.com",
      "https://job-protal-a281f.web.app",
    ], // Frontend URL
    credentials: true, // Allow cookies in requests
  })
);
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9nmck.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobsCollection = client.db("JobProtal").collection("Jobs");
    const jobsApplicationCollection = client
      .db("JobProtal")
      .collection("Job-application");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true, // Prevents access from JavaScript
          secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const job = req.body;
      console.log(job);
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    });

    app.get("/job-application", verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(email);

      // console.log("ghjfgh",req.cookies);

      const query = { email: email };

      if (req.user.email !== req.query.email) {
        return res.status(403).json({ message: "Forbidden: Invalid token" });
      }
      const result = await jobsApplicationCollection.find(query).toArray();
      for (const application of result) {
        console.log(application.job_id);
        const query1 = { _id: new ObjectId(application.job_id) };
        const result1 = await jobsCollection.findOne(query1);
        if (result1) {
          application.title = result1.title;
          application.company = result1.company;
          application.location = result1.location;
          application.jobType = result1.jobType;
          application.category = result1.category;
          application.requirements = result1.requirements;
          application.status = result1.status;
          application.responsibilities = result1.responsibilities;
          application.company_logo = result1.company_logo;
          application.salaryRange = result1.salaryRange;
          application.applicationDeadline = result1.applicationDeadline;
        }
      }
      res.send(result);
    });

    app.get("/job-application/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      console.log(jobId);
      const query = { job_id: jobId };
      const result = await jobsApplicationCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/job-application", async (req, res) => {
      const application = req.body;
      console.log(application);
      const result = await jobsApplicationCollection.insertOne(application);
      res.send(result);
    });

    app.patch("/job-application/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      console.log(data);
      const filter = { _id: new ObjectId(id) };
      /* Set the upsert option to insert a document if no documents match
    the filter */
      const options = { upsert: true };
      // Specify the update to set a value for the plot field
      const updateDoc = {
        $set: {
          status: data.status,
        },
      };
      // Update the first document that matches the filter
      const result = await jobsApplicationCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  }
  catch (error) {
    console.error(error);
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Jobs!");
});

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });
module.exports=app;
