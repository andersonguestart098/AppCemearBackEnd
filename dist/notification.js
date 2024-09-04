"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = sendNotification;
const web_push_1 = __importDefault(require("web-push"));
const vapidKeys = {
    publicKey: "BDFt6_CYV5ca61PV7V3_ULiIjsNnikV5wxeU-4fHiFYrAeGlJ6U99C8lWSxz3aPgPe7PClp23wa2rgH25tDhj2Q",
    privateKey: "Pj3sUklVQR3xHxsvbF1uLiQWolD42o_obZy_s5Op8gU",
};
web_push_1.default.setVapidDetails("mailto:example@yourdomain.org", vapidKeys.publicKey, vapidKeys.privateKey);
function sendNotification(subscription, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield web_push_1.default.sendNotification(subscription, payload);
            console.log("Notificação enviada com sucesso!", response);
            return response;
        }
        catch (error) {
            console.error("Erro ao enviar Notificação", error);
            throw error;
        }
    });
}
