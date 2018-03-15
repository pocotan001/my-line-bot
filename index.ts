import * as express from "express";
import * as line from "@line/bot-sdk";

interface IHandlerArgs<M> {
  message: M;
  replyToken: string;
  source: line.EventSource;
}

if (!process.env.NODE_ENV) {
  const { error } = require("dotenv").config();

  if (error) {
    throw error;
  }
}

const lineConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.CHANNEL_SECRET!
};

const app = express();
const lineClient = new line.Client(lineConfig);

const handleText = ({
  message,
  replyToken
}: IHandlerArgs<line.TextEventMessage>) => {
  return lineClient.replyMessage(replyToken, {
    type: "text",
    text: message.text
  });
};

const handleEvent = ({
  type,
  message,
  replyToken,
  source
}: line.MessageEvent) => {
  if (type !== "message") {
    return Promise.resolve(null);
  }

  switch (message.type) {
    case "text":
      return handleText({ message, replyToken, source });
    case "image":
    case "video":
    case "audio":
    case "location":
    case "sticker":
      return Promise.resolve(null);
    default:
      throw new Error(`Unknown message: ${JSON.stringify(message)}`);
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

app.listen(process.env.PORT);
