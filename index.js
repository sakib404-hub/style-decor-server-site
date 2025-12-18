const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5016;
require("dotenv").config();
// stripe
const stripe = require("stripe")(process.env.SECRET_KEY);
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

// generating trackingId
const generateStyleDecorTrackingId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "SD-"; // prefix for styleDecor
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

const run = async () => {
  try {
    //connecting with the mongo db and checking if the connection is successful
    await client.connect();
    //creating the database and the collection
    const db = client.db("style-decor-db");
    const usersCollection = db.collection("users");
    const servicesCollection = db.collection("services");
    const bookingsCollection = db.collection("bookings");
    const paymentsCollection = db.collection("payments");
    const completedServiceCollection = db.collection("completedService");

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
          return res.status(200).send({ message: "User Updated!" });
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
      try {
        const id = req.params.id;
        const { userRole } = req.body;
        let status = "";
        if (userRole === "decorator") {
          status = "available";
        }
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            userRole,
            status,
          },
        };
        const result = await usersCollection.updateOne(query, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update role" });
      }
    });

    app.get("/users/:status/decorator", async (req, res) => {
      const status = req.params.status;
      const query = {
        status: status,
        userRole: "decorator",
      };
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //?Updating both the user inforamtion and the booking information

    app.patch("/bookings/:id/assign", async (req, res) => {
      const bookingId = req.params.id;
      const { decoratorId } = req.body;
      const queryBooking = {
        _id: new ObjectId(bookingId),
      };
      const queryUser = {
        _id: new ObjectId(decoratorId),
      };
      const decorator = await usersCollection.findOne(queryUser);
      const updatedBookingDoc = {
        $set: {
          decoratorName: decorator.userName,
          decoratorEmail: decorator.userEmail,
          decoratorId: decoratorId,
          serviceStatus: "Decorator Assigned",
        },
      };
      const updatedUserDoc = {
        $set: {
          status: "assigned",
        },
      };
      const updatedBookingResult = await bookingsCollection.updateOne(
        queryBooking,
        updatedBookingDoc
      );
      const updatedUserResult = await usersCollection.updateOne(
        queryUser,
        updatedUserDoc
      );
      res.send({ message: true, updatedBookingResult, updatedUserResult });
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
      const decoratorEmail = req.query.decoratorEmail;
      if (decoratorEmail) {
        query.decoratorEmail = decoratorEmail;
      }
      const cursor = bookingsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch("/bookings/:id/update", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedDoc = {
        $set: {
          serviceStatus: status,
        },
      };
      const result = await bookingsCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.get("/paidBookings", async (req, res) => {
      const status = req.query.status;
      const query = {
        paymentStatus: status,
      };
      const cursor = bookingsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    app.delete("/bookings/:id/delete", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    //! PAYMENT RELATED APIS
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const cost = parseInt(paymentInfo.cost) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "BDT",
              unit_amount: cost,
              product_data: {
                name: `Please Pay for ${paymentInfo.serviceName}`,
                images: [paymentInfo.serviceImg],
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          serviceId: paymentInfo.serviceId,
          serviceName: paymentInfo.serviceName,
          bookingId: paymentInfo.bookingId,
        },
        mode: "payment",
        customer_email: paymentInfo.customerEmail,
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancel`,
      });
      res.send({ url: session.url });
    });

    app.patch("/payment-success", async (req, res) => {
      try {
        const session_id = req.query.session_id;
        const session = await stripe.checkout.sessions.retrieve(session_id);

        const transactionId = session.payment_intent;

        // Check if payment already exists
        const query = {
          transactionId: transactionId,
        };
        const paymentExists = await paymentsCollection.findOne(query);
        if (paymentExists) {
          return res.send({
            success: true,
            message: "Payment already exists",
            transactionId: transactionId,
            trackingId: paymentExists.trackingId,
          });
        }

        if (session.payment_status === "paid") {
          // Update booking/payment status
          const bookingId = session.metadata.bookingId;
          const trackingId = generateStyleDecorTrackingId();
          const query = { _id: new ObjectId(bookingId) };
          const updatedDoc = {
            $set: {
              paymentStatus: "Paid",
              serviceStatus: "Paid–Waiting for Assignment",
              trackingId: trackingId,
            },
          };
          const updateResult = await bookingsCollection.updateOne(
            query,
            updatedDoc
          );

          // Insert payment record
          const payment = {
            transactionId: transactionId,
            amount: session.amount_total / 100,
            name: session.metadata.percelName,
            currency: session.currency,
            customerEmail: session.customer_email,
            parcelId: session.metadata.percelId,
            paymentStatus: session.payment_status,
            paidAt: new Date(),
            trackingId: trackingId,
          };
          const insertedPayment = await paymentsCollection.insertOne(payment);

          return res.send({
            success: true,
            updatedBooking: updateResult,
            paymentInfo: insertedPayment,
            transactionId: transactionId,
            trackingId: trackingId,
          });
        }

        res.send({ success: false });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, error: error.message });
      }
    });

    app.get("/payments", async (req, res) => {
      const query = {};
      const email = req.query.email;
      if (email) {
        query.customerEmail = email;
      }
      const cursor = paymentsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //! COMPLETED SERVICES
    app.post("/completedService", async (req, res) => {
      try {
        const { bookingId } = req.body;

        if (!bookingId) {
          return res.status(400).send({ message: "Booking ID is required" });
        }

        const queryBooking = { _id: new ObjectId(bookingId) };

        // 1. Find booking
        const booking = await bookingsCollection.findOne(queryBooking);
        if (!booking) {
          return res.status(404).send({ message: "Booking not found" });
        }

        // 2. Update decorator availability
        await usersCollection.updateOne(
          { userEmail: booking.decoratorEmail },
          { $set: { status: "available" } }
        );

        // 3. Insert into completed services
        await completedServiceCollection.insertOne({
          ...booking,
          completedAt: new Date(),
          status: "completed",
        });

        // 4. Remove from bookings
        await bookingsCollection.deleteOne(queryBooking);

        res.send({ message: "Service marked as completed successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/completedService", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }
        const query = {
          $or: [{ customerEmail: email }, { decoratorEmail: email }],
        };
        const result = await completedServiceCollection
          .find(query)
          .sort({ completedAt: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal server error" });
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
