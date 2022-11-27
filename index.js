const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
// const jwt = require("jsonwebtoken");
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

async function run() {
    try {
        const usersCollection = client.db("trendyResale").collection("users");

        app.post("/users", async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
    } finally {
    }
}

run().catch((err) => console.log(err));

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
