const express = require("express");
const app = express();
const { Client } = require("bedrock-protocol");

// سرورهایی که گفتی + رمز ItzBubble
const servers = [
  { ip: "RLMC.ir", port: 19132, password: "ItzBubble" },
  { ip: "sv4.tgmc.ir", port: 29049, password: "ItzBubble" },
  { ip: "185.26.33.12", port: 19132, password: "ItzBubble" },
  { ip: "dreamland.falixsrv.me", port: 19132, password: "ItzBubble" }
];

// حرکت اتوماتیک بعد از ورود
function startAutoMove(bot) {
  setInterval(() => {
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
  }, 500);
}

function connectToServer(server) {
  const bot = Client.createClient({
    host: server.ip,
    port: server.port,
    username: "MehdiBot"
  });

  bot.on("spawn", () => {
    console.log(`Bot joined: ${server.ip}`);
  });

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
        data: JSON.stringify([server.password, server.password])
      });

      console.log(`Sent password + repeat password to ${server.ip}`);
      return;
    }

    // مرحله ۲: فرم نهایی ورود (label + buttons)
    if (fields.length >= 1 &&
        fields[0].type === "label") {

      bot.write("modal_form_response", {
        formId,
        data: JSON.stringify(0) // دکمه اول = ورود
      });

      console.log(`Pressed LOGIN button on ${server.ip}`);

      // فعال کردن حرکت اتوماتیک بعد از ورود
      startAutoMove(bot);

      return;
    }
  });

  bot.on("close", () => {
    console.log(`Disconnected from ${server.ip}, reconnecting...`);
    setTimeout(() => connectToServer(server), 3000);
  });
}

// اتصال به همه سرورها
servers.forEach(connectToServer);

// وب‌سرور برای Railway
app.get("/", (req, res) => {
  res.send("Bot is alive on multiple servers with UI login + auto move!");
});

app.listen(3000);
