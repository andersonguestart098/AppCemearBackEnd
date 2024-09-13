const { MongoClient, ObjectId } = require("mongodb");

// URL de conexão com o MongoDB
const url =
  "mongodb+srv://teste:teste123@serverlessinstance0.wedqfuc.mongodb.net/cemear?retryWrites=true&w=majority&appName=ServerlessInstance0"; // Substitua pela sua URL de conexão
const dbName = "cemear"; // Substitua pelo nome correto do banco de dados

async function addUserFieldToSubscriptions() {
  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log("Conectado ao servidor MongoDB");

    const db = client.db(dbName);

    const subscriptionsCollection = db.collection("Subscription");
    const usersCollection = db.collection("User");

    // Buscar todas as assinaturas que possuem userId
    const subscriptions = await subscriptionsCollection
      .find({ userId: { $exists: true } })
      .toArray();

    for (let subscription of subscriptions) {
      const userId = subscription.userId;

      // Buscar o usuário correspondente ao userId
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

      if (user) {
        // Atualizar a assinatura com o campo 'user' como subdocumento
        await subscriptionsCollection.updateOne(
          { _id: subscription._id },
          {
            $set: {
              user: {
                _id: user._id, // ObjectId do usuário
                usuario: user.usuario, // Nome do usuário ou outras informações relevantes
                tipoUsuario: user.tipoUsuario, // Exemplo de outro campo que você pode querer incluir
                createdAt: user.createdAt, // Você pode incluir outros campos do documento do usuário aqui
              },
            },
          }
        );
        console.log(
          `Assinatura ${subscription._id} atualizada com o subdocumento do usuário`
        );
      } else {
        console.log(`Nenhum usuário encontrado para o userId ${userId}`);
      }
    }

    console.log(
      "Campo 'user' com subdocumento adicionado com sucesso às assinaturas"
    );
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

addUserFieldToSubscriptions();
