const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5016;
require("dotenv").config();
// mongoDB connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const servicesCollection = db.collection("services");
    const bookingsCollection = db.collection("bookings");

    //!USERS RELATED APIS
    app.get("/users", async (req, res) => {
      const searchText = req.query.searchText;
      const query = {};
      if (searchText) {
        query.$or = [
          { userName: { $regex: searchText, $options: "i" } },
          { userEmail: { $regex: searchText, $options: "i" } },
        ];
      }
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/myUserInfo", async (req, res) => {
      const query = {};
      const userEmail = req.query.email;
      if (userEmail) {
        query.userEmail = userEmail;
      }
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.get("/users/:email/role", async (req, res) => {
      const query = {
        userEmail: req.params.email,
      };
      const user = await usersCollection.findOne(query);
      res.send({ role: user.userRole || "user" });
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

    app.patch("/users/:id/role", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedDoc = {
        $set: {
          userRole: req.body.userRole,
        },
      };
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    //! SERVICES RELATED APIS
    app.get("/services", async (req, res) => {
      const query = {};
      const searchText = req.query.searchText;
      if (searchText) {
        query.$or = [
          { packageName: { $regex: searchText, $options: "i" } },
          { description: { $regex: searchText, $options: "i" } },
        ];
      }
      const cursor = servicesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/:id/details", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await servicesCollection.findOne(query);
      res.send(result);
    });

    app.get("/latest-services", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 5;
        const cursor = servicesCollection.find().limit(limit);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //! BOOKINGS RELATED APIS
    app.get("/bookings", async (req, res) => {
      const query = {};
      const email = req.query.email;
      if (email) {
        query.customerEmail = email;
      }
      const cursor = bookingsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;

      console.log(newBooking);
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
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
