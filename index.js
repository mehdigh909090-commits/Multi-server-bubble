const express = require("express");
const bedrock = require("bedrock-protocol");

const app = express();

const servers = [
  {
    host: "185.26.33.12",
    port: 19132,
    password: "ItzBubble"
  }
];

function startBot(server) {
  let bot = null;
  let connected = false;
  let reconnectTimer = null;
  let movementTimer = null;

  function scheduleReconnect() {
    if (reconnectTimer) return;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;

      if (!connected) {
        connect();
      }
    }, 1000);
  }

  function connect() {
    if (connected) return;

    console.log(
      `[${server.host}:${server.port}] Connecting...`
    );

    try {
      bot = bedrock.createClient({
        host: server.host,
        port: server.port,
        username: "Bubble",
        offline: true,
        version: "1.21.50"
      });
    } catch (error) {
      console.log(
        `[${server.host}] Create error: ${error.message}`
      );

      scheduleReconnect();
      return;
    }

    bot.on("join", () => {
      connected = true;

      console.log(
        `[${server.host}] Bubble joined`
      );
    });

    bot.on("spawn", () => {
      console.log(
        `[${server.host}] Bubble spawned`
      );

      startMovement();
    });

    bot.on("modal_form_request", (packet) => {
      try {
        const formId =
          packet.form_id ??
          packet.formId;

        const raw =
          packet.data ??
          packet.content ??
          "";

        if (!raw) return;

        const form = JSON.parse(raw);

        const controls =
          form.content ??
          form.controls ??
          [];

        const inputs = controls.filter(
          (item) => item.type === "input"
        );

        /*
         * اگر فرم لاگین دو یا چند Input داشته باشد،
         * رمز را برای Inputها ارسال می‌کند.
         */
        if (inputs.length >= 2) {
          const response = [];

          for (let i = 0; i < inputs.length; i++) {
            response.push(server.password);
          }

          bot.write("modal_form_response", {
            form_id: formId,
            data: JSON.stringify(response),
            cancel_reason: 0
          });

          console.log(
            `[${server.host}] Login form submitted`
          );

          return;
        }

        /*
         * اگر فرم یک دکمه داشته باشد،
         * اولین دکمه انتخاب می‌شود.
         */
        const buttons = controls.filter(
          (item) => item.type === "button"
        );

        if (buttons.length > 0) {
          bot.write("modal_form_response", {
            form_id: formId,
            data: JSON.stringify(0),
            cancel_reason: 0
          });

          console.log(
            `[${server.host}] First button selected`
          );
        }

      } catch (error) {
        console.log(
          `[${server.host}] Form error: ${error.message}`
        );
      }
    });

    bot.on("text", (packet) => {
      if (packet.message) {
        console.log(
          `[${server.host}] ${packet.message}`
        );
      }
    });

    bot.on("error", (error) => {
      console.log(
        `[${server.host}] Error: ${error.message}`
      );
    });

    bot.on("disconnect", () => {
      connected = false;

      console.log(
        `[${server.host}] Disconnected`
      );

      stopMovement();
      scheduleReconnect();
    });

    bot.on("close", () => {
      connected = false;

      console.log(
        `[${server.host}] Connection closed`
      );

      stopMovement();
      scheduleReconnect();
    });
  }

  function startMovement() {
    if (movementTimer) return;

    movementTimer = setInterval(() => {
      try {
        if (!bot) return;
        if (!connected) return;
        if (!bot.entity) return;
        if (!bot.entity.position) return;

        const position = bot.entity.position;

        bot.queue("move_player", {
          runtime_entity_id:
            bot.entity.runtime_id,

          position: {
            x: position.x + 0.15,
            y: position.y,
            z: position.z
          },

          pitch: 0,
          yaw: 0,
          head_yaw: 0,

          mode: 0,

          on_ground: true,

          ridden_runtime_entity_id: 0,

          tick: BigInt(Date.now())
        });

      } catch (error) {
        console.log(
          `[${server.host}] Movement error: ${error.message}`
        );
      }
    }, 500);
  }

  function stopMovement() {
    if (!movementTimer) return;

    clearInterval(movementTimer);
    movementTimer = null;
  }

  /*
   * اتصال این سرور مستقل از بقیه شروع می‌شود.
   */
  connect();
}


/*
 * هر چهار سرور هم‌زمان شروع می‌شوند.
 */
servers.forEach((server) => {
  startBot(server);
});


/*
 * Web server برای Railway
 */
app.get("/", (req, res) => {
  res.status(200).send("Bubble Bot Online");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Web server running on port ${PORT}`
  );
});
