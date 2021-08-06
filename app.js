#!/usr/bin/env node

const axios = require("axios");
const express = require("express");

const app = express();
const config = require("./config.json");

let currentStatus;

app.set("views", "public");
app.use(express.static("public"));
app.set("view engine", "ejs");

async function getCurrentStatus(url) {
  return axios
    .get(url)
    .then(async (res) => {
      const reqTime = Date.parse(res.data.date) - Date.now();

      if (res.status === 500) {
        // call slack webhook with @canal mentioned
        await axios.post(config.slack_webhook, {
          text: ":bangbang: API Production: api.ikobox.eu <!here>",
          attachments: [
            {
              color: "#ff0000",
              fields: [
                {
                  title: "Request Status",
                  value: res.status,
                  short: true,
                },
                {
                  title: "Response time",
                  value: reqTime,
                  short: true,
                },
              ],
            },
          ],
        });
        return "red";
      } else if (reqTime > 500) {
        // call slack webhook
        await axios.post(config.slack_webhook, {
          text: ":warning: API Production: api.ikobox.eu <!here>",
          attachments: [
            {
              color: "#ffff00",
              fields: [
                {
                  title: "Request Status",
                  value: res.status,
                  short: true,
                },
                {
                  title: "Response time",
                  value: reqTime,
                  short: true,
                },
              ],
            },
          ],
        });
        return "yellow";
      } else if (res.status === 200 && reqTime < 500) {
        return "green";
      }
    })
    .catch(async (err) => {
      await axios.post(config.slack_webhook, {
        text: ":bangbang: API Production: api.ikobox.eu <!here>",
        attachments: [
          {
            color: "#ff0000",
            fields: [
              {
                title: "Request Status",
                value: err.code,
                short: true,
              },
              {
                title: "URL",
                value: err.config.url,
                short: true,
              },
              {
                title: "HTTP Method",
                value: err.config.method,
                short: true,
              }
            ],
          },
        ],
      });
      return "red";
    });
}

app.get("/", async (req, res) => {
  res.render("status", {
    currentStatus: currentStatus,
  });
});

app.listen(config.port || 9000);

(async () => {
  console.log("Application running on ::", config.port);
  currentStatus = await getCurrentStatus(config.target_url);
    setInterval(async () => {
      currentStatus = await getCurrentStatus(config.target_url);
    }, config.polling_inteval)
})();
