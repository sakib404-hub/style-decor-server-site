const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5016;
require("dotenv").config();
// mongoDB connection
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@crud-operation.iftbw43.mongodb.net/?appName=CRUD-operation`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
app.use(express.json());
app.use(cors());

const run = async () => {
  try {
    //connecting with the mongo db and checking if the connection is successful
    await client.connect();
    //creating the database and the collection
    const db = client.db("style-decor-db");
    const usersCollection = db.collection("users");

    //!USERS RELATED APIS
    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;
        const userEmail = newUser.userEmail;
        const userExist = await usersCollection.findOne({
          userEmail: userEmail,
        });

        if (userExist) {
          return res.status(409).send({ message: "User already exists" });
        }
        newUser.createdAt = new Date();
        newUser.updatedAt = new Date();

        const result = await usersCollection.insertOne(newUser);

        res.status(201).send({ message: "User Created" }, result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    //? CHECKING IF THE CONNECTION IS MADE WITH THE MONGODB
  } catch (error) {
    res.status(503).send("Database Unavailable, Connection Failed!");
  }
};
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Hellow World!");
});

app.listen(port, () => {
  console.log("This app is Listening from Port Number : ", port);
});
