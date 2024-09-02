import webPush from "web-push";

const vapidKeys = {
  publicKey:
    "BF_dDzXcKHG9Jbdyirin5s6L7NNdNT7kQvGyQkuztdvHBQlxspD46dLUFN4NNR9NChqOItG7nIKcK6McZXeY7SE",
  privateKey: "CM4acuevFWkJmBtahb4BZQ1MBTMMh9BUSD4fy-iVMU8",
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
