import express from "express";
import router from "./routes";

const app = express();

const PORT = process.env.PORT || 8888;
app.use(express.json());
app.use(router);

app.listen(PORT, () => {
  console.log(`server started at port ${PORT}`);
});
