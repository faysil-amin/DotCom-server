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
async function run() {
  try {
    await client.connect();
    const assignment11Server = client.db("assignment11Server");
    const userCollection = assignment11Server.collection("userCollection");
    app.post("/user", async (req, res) => {
      const data = req.body;
      const query = { email: req.email };
      const email = req.email;
      data.user = "user";
      data.createdAt = new Date();
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
