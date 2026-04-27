const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.SECRET_KEY}@cluster0.rgj7zze.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const admin = require("firebase-admin");

const serviceAccount = require("./assignment-11-firebase-adminsdk.json");

const verifyToken = async (req, res, next) => {
  const tokenHeader = req.headers.authorization;
  if (!tokenHeader) {
    return res.status(401).send({ message: "unauthoriz access" });
  }
  const tokenOnly = tokenHeader.split(" ")[1];
  if (!tokenOnly) {
    return res.status(401).send({ message: "token not found" });
  }
  try {
    const check = await admin.auth().verifyIdToken(tokenOnly);
    req.check_email = check.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthoriz access" });
  }
};
async function run() {
  try {
    await client.connect();
    const assignment11Server = client.db("assignment11Server");
    const userCollection = assignment11Server.collection("userCollection");
    const lessonCollection = assignment11Server.collection("lessonCollection");
    app.post("/user", async (req, res) => {
      const data = req.body;
      const query = { email: req.email };
      const email = req.email;
      data.user = "user";
      data.createdAt = new Date();
      data.user = "not_premeum";
      const existUser = await userCollection.findOne({ email });
      if (existUser) {
        return res.send({ message: "user exist" });
      }
      const result = await userCollection.insertOne(data);
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/user/:email/role", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await userCollection.findOne(query);
      res.send({ role: result?.role || "user" });
    });
    app.post("/addlesson", async (req, res) => {
      const data = req.body;
      data.createdAt = new Date();
      const result = await lessonCollection.insertOne(data);
      res.send(result);
    });
    app.patch("/addlesson/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: { lesson_like: 1 },
      };
      const result = await lessonCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.get("/addlesson", async (req, res) => {
      const data = lessonCollection.find().sort({ createdAt: -1 });
      const result = await data.toArray();
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
