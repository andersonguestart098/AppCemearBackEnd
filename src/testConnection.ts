import { config } from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

config(); // Carrega variáveis do .env

const uri = process.env.MONGODB_URI as string; // Garante que MONGODB_URI é uma string

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true, // Força o uso de TLS
  tlsAllowInvalidCertificates: true, // Ignora certificados inválidos (não recomendado para produção)
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);
