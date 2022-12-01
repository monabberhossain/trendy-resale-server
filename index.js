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
        const categoriesCollection = client
        .db("trendyResale")
        .collection("categories");
        const productsCollection = client.db("trendyResale").collection("products");
        const bookedProductsCollection = client.db("trendyResale").collection("bookedProducts");

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

        // Get JWT Token
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

        // Users API
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

        app.get("/users/verified/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({
                isVerified:
                    user?.role === "Seller" && user?.status === "Verified",
            });
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
                        status: "Verified",
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

        // Category API

        app.get("/categories", async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        app.post("/categories", async (req, res) => {            
            const category = req.body;
            const result = await categoriesCollection.insertOne(category);
            res.send(result);
        });

        app.get("/categories/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const category = await categoriesCollection.findOne(filter);
            const categoryName = category.name;
            console.log((categoryName));
            const productQuery = {category: categoryName};
            const categoryProducts = await productsCollection.find(productQuery).toArray();
            res.send(categoryProducts);            
        });

        // Products API

        app.post("/products", verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        app.get("/products", async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.get("/myproducts/:email", async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { email: email };
            const myProducts = await productsCollection.find(query).toArray();
            res.send(myProducts);
        });

        app.delete("/products/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
        });

        // Booked Products API        

        app.post("/bookedProducts", async (req, res) => {
            const bookedProduct = req.body;
            const result = await bookedProductsCollection.insertOne(
                bookedProduct
            );
            res.send(result);
        });
        
    } finally {
    }
}

run().catch((err) => console.log(err));

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
