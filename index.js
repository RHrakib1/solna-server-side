const express = require('express')
const app = express()
const port = process.env.PORT || 5001
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieparser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const corsOption = {
    origin: ['https://solo-prokect.web.app','http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', ],
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOption));
app.use(express.json())
app.use(cookieparser())


// personal midelware 
const verifiToken = (req, res, next) => {
    const token = req.cookies?.token
    console.log("Cookies:", token);

    if (!token) return res.status(401).send({ message: 'unauthorice access' })

    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                console.log(err);
                return res.status(401).send({ message: 'unauthorice access' })
            }
            console.log("valu paisi :", decoded);
            req.user = decoded
            next()
        })
    }
}






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.3ad3x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    const jobcollection = client.db('solo-database').collection('jobs')
    const bitscollection = client.db('solo-database').collection('bits')
    try {

        // token make kora 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log("Client sent data:", user); // এখানে ডাটা চেক করুন।

            if (!user.email) {
                return res.status(400).send({ message: "Email is required" });
            }

            const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            }).send({ success: true });
        });




        // delete token on coookie
        app.get('/logout', (req, res) => {
            res.cookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                maxAge: 0
            }).send({ success: true })

        })





        // get fake data to server 
        app.get('/jobs', async (req, res) => {

            const result = await jobcollection.find().toArray()
            // console.log("Job data fetched:", result);
            res.send(result)
        })

        app.get('/job/:id', async (req, res) => {
            const id = req.params.id
            const quary = { _id: new ObjectId(id) }
            const result = await jobcollection.findOne(quary)
            // console.log("Job retrieved by ID:", result);
            res.send(result)
        })



        // bid data set data base 
        app.post('/bid', async (req, res) => {
            const biddata = req.body
            const result = await bitscollection.insertOne(biddata)
            res.send(result)
        })

        //add to the jobs in data base 
        app.post('/job', async (req, res) => {
            const addjobdata = req.body
            const result = await jobcollection.insertOne(addjobdata)
            res.send(result)
        })


        // add to the email base get
        app.get('/jobs/:email', verifiToken, async (req, res) => {
            const tokenemail = req.user.email
            console.log(tokenemail, 'from token');

            const email = req.params.email
            // if (tokenemail !== email) {
            //     return res.status(403).send({ message: 'forbidend access' })
            // }
            const quary = { 'buyer.emailAddress': email }
            const result = await jobcollection.find(quary).toArray()
            res.send(result)
        })

        // get all mybids
        app.get('/mybids/:email', verifiToken, async (req, res) => {
            const email = req.params.email
            console.log('this is email in my bitd=s ::', email);
            const quary = { email: email }
            console.log("this is bit email :", quary);
            const result = await bitscollection.find(quary).toArray()
            res.send(result)
        })

        // get all bids request data 
        app.get('/mybidrequst/:email', verifiToken, async (req, res) => {
            const email = req.params.email
            const quary = { 'buyer.emailAddress': email }
            const result = await bitscollection.find(quary).toArray()
            res.send(result)
        })


        // only update on data 
        app.patch('/bidup/:id', async (req, res) => {
            const id = req.params.id
            const status = req.body
            const quary = { _id: new ObjectId(id) }
            const updatedoc = {
                $set: {
                    status
                }

            }
            const result = await bitscollection.updateOne(quary, updatedoc)
            res.send(result)
        })

        // delete job 
        app.delete('/jobs/:id', async (req, res) => {
            const id = req.params.id
            const quary = { _id: new ObjectId(id) }
            const result = await jobcollection.deleteOne(quary)
            res.send(result)
        })
        app.put('/jobs/:id', async (req, res) => {
            const id = req.params.id
            const data = req.body
            const quary = { _id: new ObjectId(id) }
            const option = { upsert: true }
            const dataUpdate = {
                $set: {
                    ...data,

                }
            }
            const result = await jobcollection.updateOne(quary, dataUpdate, option)
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World! solo game ')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})