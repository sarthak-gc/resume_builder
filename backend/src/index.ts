import express from "express";
import router from "./routes";
import { envConfig } from "./utils/config";

const app = express();

const PORT = envConfig.PORT || 8888;

app.use(express.json());
app.use(router);

app.listen(PORT, () => {
  console.log(`server started at port ${PORT}`);
});
