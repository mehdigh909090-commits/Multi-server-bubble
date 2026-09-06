require("dotenv").config();
const express = require("express");
const app = express();
const { Client } = require("bedrock-protocol");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOT_NAME = process.env.BOT_NAME || "Bubble";
const BOT_PASSWORD = process.env.BOT_PASSWORD || "ItzBubble";

// سرورها
const servers = [
  { ip: "185.26.33.12", port: 19132 }
  ]
// حرکت اتوماتیک با تأخیر
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

// گرفتن جواب از OpenAI
async function getAIReply(message) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "تو یک ربات ماینکرافت هستی، خیلی خودمونی و کوتاه جواب می‌دی، اسم‌ت Bubble هست."
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
    console.log(`[${server.ip}] ${BOT_NAME} spawned`);
  });

  // لاگین UI: رمز + تکرار رمز + ورود
  bot.on("modal_form_request", (packet) => {
    const formId = packet.formId;
    const formJson = JSON.parse(packet.data);
    const fields = formJson.content;

    // مرحله ۱: رمز + تکرار رمز
    if (fields.length >= 2 &&
        fields[0].type === "input" &&
        fields[1].type === "input") {

      bot.write("modal_form_response", {
        formId,
        data: JSON.stringify([BOT_PASSWORD, BOT_PASSWORD])
      });

      console.log(`[${server.ip}] Login form submitted (password + repeat)`);
      return;
    }

    // مرحله ۲: فرم نهایی ورود (label + buttons)
    if (fields.length >= 1 &&
        fields[0].type === "label") {

      bot.write("modal_form_response", {
        formId,
        data: JSON.stringify(0) // دکمه اول = ورود
      });

      console.log(`[${server.ip}] LOGIN button pressed`);

      // تأخیر ۲ ثانیه برای جلوگیری از Packet Error
      setTimeout(() => {
        startAutoMove(bot);
      }, 2000);

      return;
    }
  });

  // شنیدن چت و جواب دادن با OpenAI
  bot.on("text", async (packet) => {
    const msg = packet.message;
    const sender = packet.source_name;

    if (sender === BOT_NAME) return;

    console.log(`[CHAT ${server.ip}] ${sender}: ${msg}`);

    // اگر اسم ربات تو پیام بود، جواب بده
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

      console.log(`[AI REPLY ${server.ip}] ${reply}`);
    }
  });

  bot.on("close", () => {
    console.log(`[${server.ip}] Disconnected, reconnecting...`);
    setTimeout(() => connectToServer(server), 3000);
  });
}

// اتصال به همه سرورها
servers.forEach(connectToServer);

// وب‌سرور ساده
app.get("/", (req, res) => {
  res.send("Multi-server Bubble bot with OpenAI is online.");
});

app.listen(8080, () => {
  console.log("Web server running on port 8080");
});
