const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8n4atui.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

app.get("/", (req, res) => {
    res.send("Hello Monabber Hossain! I am from server!");
});

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send("Unauthorized Access!");
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: "Forbidden Access!" });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        const usersCollection = client.db("trendyResale").collection("users");
        const sellersCollection = client
            .db("trendyResale")
            .collection("sellers");
        const buyersCollection = client.db("trendyResale").collection("buyers");

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== "Admin") {
                return res.status(403).send({ message: "Forbidden Access!" });
            }
            next();
        };

        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== "Seller") {
                return res.status(403).send({ message: "Forbidden Access!" });
            }
            next();
        };

        app.get("/jwt", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
                    expiresIn: "24h",
                });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: "" });
        });

        app.get("/buyers", async (req, res) => {
            const query = { role: "Buyer" };
                const users = await usersCollection.find(query).toArray();
                res.send(users);
        });        

        app.get("/sellers", async (req, res) => {
            const query = { role: "Seller" };
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.get("/users", async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.get("/users/admin/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === "Admin" });
        });

        app.get("/users/seller/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === "Seller" });
        });

        app.post("/users", async (req, res) => {
            const user = req.body;
            const email = user.email;
            const filter = { email: email };
            const query = await usersCollection.findOne(filter);
            if (query) {
                console.log("User Exists");
                return res
                    .status(422)
                    .send({ message: "User Already Exists!" });
            }
            const result = await usersCollection.insertOne(user);
            console.log("User Created");
            res.send(result);
        });

        app.put(
            "/users/admin/:id",
            verifyJWT,
            verifyAdmin,
            async (req, res) => {
                const id = req.params.id;
                const filter = { _id: ObjectId(id) };
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        role: "Admin",
                    },
                };
                const result = await usersCollection.updateOne(
                    filter,
                    updatedDoc,
                    options
                );
                res.send(result);
            }
        );

        app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        });
        
    } finally {
    }
}

run().catch((err) => console.log(err));

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
