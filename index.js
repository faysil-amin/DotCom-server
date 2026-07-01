const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const stripe = require('stripe')(process.env.STRIPS_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rgj7zze.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const admin = require("firebase-admin");

const serviceAccount = require("./assignment-11-a032d-firebase-adminsdk-fbsvc-13f9cecf42.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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
    const check = await getAuth().verifyIdToken(tokenOnly);
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
    const userReaction = assignment11Server.collection("userReaction");
    const contactList = assignment11Server.collection("contactList");
    const lessonSaveCollection = assignment11Server.collection(
      "lessonSaveCollection",
    );
    const newsLettersCollection = assignment11Server.collection("newsLetters");
    const commentCollection = assignment11Server.collection("comment");
    const verifyAdmin = async (req, res, next) => {
      const email = req.check_email;
      const query = { userEmail: email };
      const result = await userCollection.findOne(query);
      if (!result || result.userRole !== "admin") {
        return res.status(403).send({ message: "forbiden Exice" });
      }
      next();
    };
    app.post("/user", async (req, res) => {
      const data = req.body;
      const { userEmail } = data;
      const existUser = await userCollection.findOne({ userEmail });
      if (existUser) {
        return res.send({ message: "user exist" });
      }
      data.userRole = "user";
      data.createdAt = new Date();
      data.user = "not_premium";
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
      res.send({ role: result?.userRole || "user" });
    });
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    app.post("/addlesson", async (req, res) => {
      const data = req.body;
      data.lesson_like = 0;
      data.lesson_save = 0;
      data.admin_select = "not select";
      data.createdAt = new Date();
      const result = await lessonCollection.insertOne(data);
      res.send(result);
    });
    app.patch(
      "/addlesson/:id/adminSelect",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const { selectLesson } = req.body;
        if (selectLesson === "select") {
          const selectedCount = await lessonCollection.countDocuments({
            admin_select: "select",
          });
          if (selectedCount >= 6) {
            return res.status(400).send({
              message: "You can only select 6 lessons for home",
            });
          }
        }
        let lessonSelect = "";
        if (selectLesson === "select") {
          lessonSelect = "select";
        } else if (selectLesson === "not select") {
          lessonSelect = "not select";
        }
        const update = {
          $set: {
            admin_select: lessonSelect,
          },
        };
        const result = await lessonCollection.updateOne(query, update);
        res.send(result);
      },
    );
    app.get("/addlesson", async (req, res) => {
      const { skip, limit } = req.query;
      const pageSkip = skip * limit;
      const data = lessonCollection
        .find()
        .sort({ createdAt: -1 })
        .skip(Number(pageSkip))
        .limit(Number(limit));
      const result = await data.toArray();
      const countLesson = await lessonCollection.countDocuments();
      res.send({ result, total: countLesson });
    });
    app.get("/homeAddlesson", async (req, res) => {
      const data = lessonCollection.find().sort({ createdAt: -1 });
      const result = await data.toArray();
      res.send(result);
    });
    app.get("/addlesson/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const result = await lessonCollection.find(query).toArray();
      res.send(result);
    });
    app.patch("/addlesson/:id/like", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { like_lesson } = req.body;
      let incValue = 0;
      if (like_lesson === "like") {
        incValue = 1;
      } else if (like_lesson === "dislike") {
        incValue = -1;
      }
      const update = {
        $inc: {
          lesson_like: incValue,
        },
      };
      const result = await lessonCollection.updateOne(query, update);
      res.send(result);
    });
    app.post("/userReaction", async (req, res) => {
      const data = req.body;
      const { lessonId, user_email } = data;
      const existId = await userReaction.findOne({ lessonId, user_email });
      if (existId) {
        return res.send({ message: "lesson exist" });
      }
      data.createdAt = new Date();
      const result = await userReaction.insertOne(data);
      res.send(result);
    });
    app.get("/userReaction/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const data = await userReaction.find(query).toArray();
      res.send(data);
    });
    app.patch("/userReaction/:id/:email", async (req, res) => {
      const { id, email } = req.params;
      const { islike } = req.body;
      const query = { lessonId: id, user_email: email };
      const update = {
        $set: { islike: islike },
      };
      const result = await userReaction.updateOne(query, update);
      res.send(result);
    });
    app.delete("/addlessons/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await lessonCollection.deleteOne(query);
      res.send(result);
    });
    app.post("/lessonSave", async (req, res) => {
      const data = req.body;
      const { user_email, lessonId } = data;
      const existLesson = await lessonSaveCollection.findOne({
        user_email,
        lessonId,
      });
      if (existLesson) {
        return res.send({ message: "lesson already saved" });
      }
      const result = await lessonSaveCollection.insertOne(data);
      res.send(result);
    });
    app.get("/lessonSave/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const result = await lessonSaveCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/addlessontohome", async (req, res) => {
      const cursor = lessonCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.post("/contact", verifyToken, async (req, res) => {
      const data = req.body;
      data.createdAt = new Date();
      const result = await contactList.insertOne(data);
      res.send(result);
    });
    app.get("/contact", async (req, res) => {
      const result = await contactList.find().sort({ createdAt: -1 }).toArray();
      res.send(result);
    });
    app.post("/newsLetters", async (req, res) => {
      const data = req.body;
      data.createdAt = new Date();
      const result = await newsLettersCollection.insertOne(data);
      res.send(result);
    });
    app.get("/newsLetters", async (req, res) => {
      const result = await newsLettersCollection.find().toArray();
      res.send(result);
    });
    app.delete("/newsLetters/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await newsLettersCollection.deleteOne(query);
      res.send(result);
    });
    app.post("/comment", async (req, res) => {
      const data = req.body;
      const result = await commentCollection.insertOne(data);
      res.send();
    });
    app.post('/create-checkout-session', async (req, res) => {
      const { user_email } = req.body;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Premium Membership',
              },
              unit_amount: 1000, // Amount in cents (e.g., $10.00)
            },
            quantity: 1,
          },
        ],
        customer_email: user_email,
        mode: 'payment',
        success_url: `${process.env.YOUR_DOMAIN}/successFullPayment?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.YOUR_DOMAIN}/paymentCancle`,
      });

      res.send({ url: session.url });
    });
    app.patch("/paymentSuccess", async (req, res) => {
      const url = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(url);
      const query = { userEmail: session.customer_email };
      const update = {
        $set: {
          user: 'premium'
        }
      }
      const result = await userCollection.updateOne(query, update)
      res.send({ success: true })
    })
    app.get("/toptwopost", async (req, res) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await lessonCollection.aggregate([
        {
          $match: {
            createdAt: {
              $gte: sevenDaysAgo,
            },
          },
        },
        {
          $sort: {
            lesson_like: -1,
          },
        },
        {
          $limit: 2,
        },
      ]).toArray();

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
