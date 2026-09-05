const express = require("express");
const { Client } = require("bedrock-protocol");

const app = express();

const servers = [
  { ip: "RLMC.ir", port: 19132, password: "ItzBubble" },
  { ip: "sv4.tgmc.ir", port: 29049, password: "ItzBubble" },
  { ip: "185.26.33.12", port: 19132, password: "ItzBubble" },
  { ip: "dreamland.falixsrv.me", port: 23110, password: "ItzBubble" }
];

function move(bot) {
  setInterval(() => {
    if (!bot.entity || !bot.entity.position) return;

    const pos = bot.entity.position;

    try {
      bot.write("move_player", {
        runtime_entity_id: bot.entity.runtime_id,
        position: {
          x: pos.x + 0.3,
          y: pos.y,
          z: pos.z
        },
        pitch: 0,
        yaw: 0,
        head_yaw: 0,
        mode: 0,
        on_ground: true,
        ridden_runtime_entity_id: 0,
        tick: BigInt(Date.now())
      });
    } catch (e) {
      console.log("Move error:", e.message);
    }
  }, 500);
}

function connect(server) {
  console.log(`Connecting to ${server.ip}:${server.port}`);

  const bot = Client.createClient({
    host: server.ip,
    port: server.port,
    username: "Bubble",
    offline: true,
    version: "1.21.50"
  });

  let moving = false;

  bot.on("join", () => {
    console.log(`[${server.ip}] Joined`);
  });

  bot.on("spawn", () => {
    console.log(`[${server.ip}] Spawned`);

    if (!moving) {
      moving = true;
      move(bot);
    }
  });

  bot.on("modal_form_request", (packet) => {
    try {
      const formId = packet.form_id ?? packet.formId;
      const raw = packet.data ?? "";

      let form;

      try {
        form = JSON.parse(raw);
      } catch {
        return;
      }

      const fields = form.content || form.controls || [];

      const inputs = fields.filter(
        field => field.type === "input"
      );

      if (inputs.length >= 2) {
        bot.write("modal_form_response", {
          form_id: formId,
          data: JSON.stringify([
            server.password,
            server.password
          ]),
          cancel_reason: 0
        });

        console.log(`[${server.ip}] Password sent`);
        return;
      }

      const buttons = fields.filter(
        field =>
          field.type === "button" ||
          field.type === "label"
      );

      if (buttons.length > 0) {
        bot.write("modal_form_response", {
          form_id: formId,
          data: JSON.stringify(0),
          cancel_reason: 0
        });

        console.log(`[${server.ip}] Login button pressed`);
      }

    } catch (e) {
      console.log(`[${server.ip}] Form error: ${e.message}`);
    }
  });

  bot.on("disconnect", (packet) => {
    console.log(`[${server.ip}] Disconnected`);

    setTimeout(() => {
      connect(server);
    }, 3000);
  });

  bot.on("close", () => {
    console.log(`[${server.ip}] Connection closed`);

    setTimeout(() => {
      connect(server);
    }, 3000);
  });

  bot.on("error", (err) => {
    console.log(`[${server.ip}] Error: ${err.message}`);
  });
}

servers.forEach(connect);

app.get("/", (req, res) => {
  res.send("Bubble bot is online.");
});

app.listen(3000, () => {
  console.log("Web server running on port 3000");
});
