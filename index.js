require("dotenv").config();
const express = require("express");
const app = express();
const { Client } = require("bedrock-protocol");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOT_NAME = process.env.BOT_NAME || "MehdiBot";
const BOT_PASSWORD = process.env.BOT_PASSWORD || "ItzBubble";

const servers = [
  { ip: "185.26.33.12", port: 19132 }
];

function startAutoMove(bot) {
  setInterval(() => {
    if (!bot.entity || !bot.entity.position) return;

    bot.write("move_player", {
      position: {
        x: bot.entity.position.x + 0.3,
        y: bot.entity.position.y,
        z: bot.entity.position.z
      },
      pitch: 0,
      yaw: 0,
      onGround: true
    });
  }, 800);
}

async function getAIReply(message) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "تو یک ربات ماینکرافت هستی که خیلی خودمونی جواب می‌دی."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    return res.choices[0].message.content.trim();
  } catch (e) {
    console.error("OpenAI error:", e.message);
    return "یه مشکلی پیش اومد، بعداً دوباره بپرس :)";
  }
}

function connectToServer(server) {
  const bot = Client.createClient({
    host: server.ip,
    port: server.port,
    username: BOT_NAME
  });

  bot.on("spawn", () => {
    console.log(`Bot joined: ${server.ip}`);
  });

  bot.on("modal_form_request", (packet) => {
    const formId = packet.formId;
    const formJson = JSON.parse(packet.data);
    const fields = formJson.content;

    if (fields.length >= 2 &&
        fields[0].type === "input" &&
        fields[1].type === "input") {

      bot.write("modal_form_response", {
        formId,
        data: JSON.stringify([BOT_PASSWORD, BOT_PASSWORD])
      });

      console.log(`Sent password to ${server.ip}`);
      return;
    }

    if (fields.length >= 1 &&
        fields[0].type === "label") {

      bot.write("modal_form_response", {
        formId,
        data: JSON.stringify(0)
      });

      console.log(`Pressed LOGIN on ${server.ip}`);

      startAutoMove(bot);
      return;
    }
  });

  bot.on("text", async (packet) => {
    const msg = packet.message;
    const sender = packet.source_name;

    if (sender === BOT_NAME) return;

    if (msg.toLowerCase().includes(BOT_NAME.toLowerCase())) {
      const cleanMsg = msg.replace(new RegExp(BOT_NAME, "gi"), "").trim();
      const reply = await getAIReply(cleanMsg || msg);

      bot.write("text", {
        type: "chat",
        needs_translation: false,
        source_name: BOT_NAME,
        message: reply,
        parameters: []
      });

      console.log(`[AI] ${reply}`);
    }
  });

  bot.on("close", () => {
    console.log(`Disconnected from ${server.ip}, reconnecting...`);
    setTimeout(() => connectToServer(server), 3000);
  });
}

servers.forEach(connectToServer);

app.get("/", (req, res) => {
  res.send("AI Bedrock bot is online.");
});

app.listen(3000);
