const express = require("express");
const app = express();
const { Client } = require("bedrock-protocol");

// ???????? ?? ???? + ??? ItzBubble
const servers = [
  { ip: "RLMC.ir", port: 19132, password: "ItzBubble" },
  { ip: "sv4.tgmc.ir", port: 29049, password: "ItzBubble" },
  { ip: "185.26.33.12", port: 19132, password: "ItzBubble" },
  { ip: "dreamland.falixsrv.me", port: 19132, password: "ItzBubble" }
];

// ???? ???????? ??? ?? ????
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
    username: "Bubble"
  });

  bot.on("spawn", () => {
    console.log(`Bot joined: ${server.ip}`);
  });

  bot.on("modal_form_request", (packet) => {
    const formId = packet.formId;
    const formJson = JSON.parse(packet.data);
    const fields = formJson.content;

    // ????? ?: ??? + ????? ???
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

    // ????? ?: ??? ????? ???? (label + buttons)
    if (fields.length >= 1 &&
        fields[0].type === "label") {

      bot.write("modal_form_response", {
        formId,
        data: JSON.stringify(0) // ???? ??? = ????
      });

      console.log(`Pressed LOGIN button on ${server.ip}`);

      // ???? ???? ???? ???????? ??? ?? ????
      startAutoMove(bot);

      return;
    }
  });

  bot.on("close", () => {
    console.log(`Disconnected from ${server.ip}, reconnecting...`);
    setTimeout(() => connectToServer(server), 3000);
  });
}

// ????? ?? ??? ??????
servers.forEach(connectToServer);

// ??????? ???? Render
app.get("/", (req, res) => {
  res.send("Bot is alive on multiple servers with UI login + auto move!");
});

app.listen(3000);
