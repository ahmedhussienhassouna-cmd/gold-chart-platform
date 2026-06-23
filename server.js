const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const allowedGranularity = ["M1", "M5", "M15", "H1", "H4", "D"];

// =======================
// TELEGRAM SETTINGS
// =======================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = String(process.env.TELEGRAM_CHANNEL_ID || "");

let telegramChannelPosts = [];

// =======================
// TELEGRAM WEBHOOK
// =======================
app.post("/telegram/webhook", async (req, res) => {
  try {
    const update = req.body;

    const post = update.channel_post || update.edited_channel_post;

    if (!post || !post.chat) {
      return res.sendStatus(200);
    }

    const chatId = String(post.chat.id);

    if (chatId !== TELEGRAM_CHANNEL_ID) {
      return res.sendStatus(200);
    }

    let text = post.text || post.caption || "";
    let imageFileId = null;

    if (post.photo && post.photo.length > 0) {
      imageFileId = post.photo[post.photo.length - 1].file_id;
    }

    const newPost = {
      id: post.message_id,
      text,
      imageFileId,
      date: post.date ? post.date * 1000 : Date.now(),
      channelTitle: post.chat.title || "Golden Trade",
      type: imageFileId ? "image" : "text"
    };

    telegramChannelPosts.unshift(newPost);
    telegramChannelPosts = telegramChannelPosts.slice(0, 50);

    console.log("New Telegram post saved:", newPost.id);

    res.sendStatus(200);

  } catch (error) {
    console.error("Telegram webhook error:", error.message);
    res.sendStatus(200);
  }
});

// =======================
// GET TELEGRAM POSTS
// =======================
app.get("/api/telegram/posts", (req, res) => {
  res.json({
    success: true,
    posts: telegramChannelPosts
  });
});

// =======================
// TELEGRAM IMAGE PROXY
// =======================
app.get("/api/telegram/photo/:fileId", async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).send("Telegram token missing");
    }

    const fileId = req.params.fileId;

    const fileInfo = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile`,
      {
        params: { file_id: fileId }
      }
    );

    const filePath = fileInfo.data.result.file_path;

    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    const imageResponse = await axios.get(fileUrl, {
      responseType: "stream"
    });

    res.setHeader("Content-Type", imageResponse.headers["content-type"] || "image/jpeg");
    imageResponse.data.pipe(res);

  } catch (error) {
    console.error("Telegram photo error:", error.message);
    res.status(500).send("Photo error");
  }
});

// =======================
// SET TELEGRAM WEBHOOK AUTO
// =======================
async function setupTelegramWebhook() {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.log("Telegram token missing");
      return;
    }

    const domain =
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.PUBLIC_URL ||
      "";

    if (!domain) {
      console.log("No public domain found for Telegram webhook");
      return;
    }

    const webhookUrl = domain.startsWith("http")
      ? `${domain}/telegram/webhook`
      : `https://${domain}/telegram/webhook`;

    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        params: {
          url: webhookUrl
        }
      }
    );

    console.log("Telegram webhook set:", response.data);

  } catch (error) {
    console.error("Telegram webhook setup error:", error.response?.data || error.message);
  }
}

// =======================
// OANDA PRICE
// =======================
app.get("/api/price", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api-fxpractice.oanda.com/v3/accounts/" +
        process.env.OANDA_ACCOUNT_ID +
        "/pricing",
      {
        headers: {
          Authorization: "Bearer " + process.env.OANDA_API_KEY
        },
        params: {
          instruments: "XAU_USD"
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

// =======================
// OANDA CANDLES
// =======================
app.get("/api/candles", async (req, res) => {
  try {
    let granularity = req.query.granularity || "M1";
    let count = Number(req.query.count || 1500);

    if (!allowedGranularity.includes(granularity)) {
      granularity = "M1";
    }

    if (count > 5000) count = 5000;
    if (count < 100) count = 100;

    const response = await axios.get(
      "https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles",
      {
        headers: {
          Authorization: "Bearer " + process.env.OANDA_API_KEY
        },
        params: {
          granularity,
          count,
          price: "M"
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await setupTelegramWebhook();
});