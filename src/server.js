import "dotenv/config";

import express from "express";
import configViewEngine from "./config/configEngine.js";
import routes from "./routes/web.js";
import cronJobController from "./controllers/cronJobController.js";
import socketIoController from "./controllers/socketIoController.js";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
const app = express();
import createUSDTGateway from './controllers/usdtGatewayController.js';
import topbetgaming from './controllers/topbatgaming.js';
import jiligames from './controllers/jilimain.js';
import path from 'path';


const server = http.createServer(app);
const io = new Server(server);


const port = process.env.PORT || 3000;

app.use(cookieParser());
// app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// setup viewEngine
configViewEngine(app);
// init Web Routes
routes.initWebRouter(app);

// Cron game 1 Phut
cronJobController.cronJobGame1p(io);

// Check xem ai connect vào sever
socketIoController.sendMessageAdmin(io);


const usdtGatewayRouter = createUSDTGateway();
app.use('/usdt', usdtGatewayRouter);
app.use('/topbetgaming', topbetgaming);
app.use('/jiligames', jiligames);

// app.all('*', (req, res) => {
//     return res.render("404.ejs");
// });

server.listen(port, () => {
  console.log(`Connected success http://localhost:${port}`);
});
