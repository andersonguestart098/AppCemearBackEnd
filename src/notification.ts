import webPush from "web-push";

const vapidKeys = {
  publicKey:
    "BDFt6_CYV5ca61PV7V3_ULiIjsNnikV5wxeU-4fHiFYrAeGlJ6U99C8lWSxz3aPgPe7PClp23wa2rgH25tDhj2Q",
  privateKey: "Pj3sUklVQR3xHxsvbF1uLiQWolD42o_obZy_s5Op8gU",
};

webPush.setVapidDetails(
  "mailto:example@yourdomain.org",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function sendNotification(subscription: any, payload: any) {
  try {
    const response = await webPush.sendNotification(subscription, payload);
    console.log("Notificação enviada com sucesso!", response);
    return response;
  } catch (error) {
    console.error("Erro ao enviar Notificação", error);
    throw error;
  }
}
