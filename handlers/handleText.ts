import * as line from "@line/bot-sdk";
import axios from "axios";

export type ITextEvent = {
  type: "message";
  message: line.TextEventMessage;
} & line.ReplyableEvent;

const CONTEXT_EXPIRY_MS = 180000; // 雑談対話 context の有効期限

/**
 * ルームやグループ毎に保持する雑談対話用 context
 */
const contexts = new Map<string, { context: string; updatedAt: number }>();

/**
 * 雑談対話 API
 * https://dev.smt.docomo.ne.jp/?p=docs.api.page&api_name=dialogue&p_name=api_usage_scenario
 */
const dialogue = async (lineClient: line.Client, e: ITextEvent) => {
  const contextId =
    (e.source as line.Room).roomId ||
    (e.source as line.Group).groupId ||
    (e.source as line.User).userId;
  const { context, updatedAt } = contexts.get(contextId) || ({} as any);
  const isContextExpired =
    updatedAt && Date.now() - updatedAt > CONTEXT_EXPIRY_MS;

  let profile: line.Profile | undefined;

  if (e.source.userId) {
    try {
      profile = await lineClient.getProfile(e.source.userId);
    } catch (err) {}
  }

  try {
    const res = await axios.post(
      `https://api.apigw.smt.docomo.ne.jp/dialogue/v1/dialogue?APIKEY=${
        process.env.DOCOMO_API_KEY
      }`,
      {
        // システムから出力された context を入力することにより会話を継続します
        context: !isContextExpired ? context : null,
        // ユーザの発話を入力します
        utt: e.message.text,
        // ユーザのニックネームを設定します
        nickname: profile && profile.displayName
      }
    );

    contexts.set(contextId, {
      context: res.data.context,
      updatedAt: Date.now()
    });

    console.log(context);

    return lineClient.replyMessage(e.replyToken, {
      type: "text",
      text: res.data.utt
    });
  } catch (err) {
    console.error(err);
  }
};

const handleText = async (lineClient: line.Client, e: ITextEvent) => {
  // 1 on 1 以外の場合はたまに返答しない
  if (e.source.type !== "user" && Math.random() >= 0.7) {
    return Promise.resolve(null);
  }

  return await dialogue(lineClient, e);
};

export default handleText;
