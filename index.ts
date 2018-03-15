import * as express from "express";
import * as line from "@line/bot-sdk";
import handleText, { ITextEvent } from "./handlers/handleText";

if (!process.env.NODE_ENV) {
  const { error } = require("dotenv").config();

  if (error) {
    throw error;
  }
}

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!
};

const port = process.env.PORT || 3000;
const app = express();
const lineClient = new line.Client(lineConfig);

const handleEvent = (e: line.MessageEvent) => {
  if (e.type !== "message") {
    return Promise.resolve(null);
  }

  switch (e.message.type) {
    case "text":
      return handleText(lineClient, e as ITextEvent);
    case "image":
    case "video":
    case "audio":
    case "location":
    case "sticker":
      return Promise.resolve(null);
    default:
      throw new Error(`Unknown message: ${JSON.stringify(e.message)}`);
  }
};

app.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  if (!Array.isArray(req.body.events)) {
    return res.status(500).end();
  }

  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

app.listen(port, (err: Error) => {
  if (err) {
    throw err;
  }

  console.log(`listening on ${port}`);
});
