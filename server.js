const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors());

// تشغيل ملفات الموقع
app.use(express.static(__dirname));

// API لجلب سعر الذهب من OANDA
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

// API لجلب شموع الذهب من OANDA
app.get("/api/candles", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles",
      {
        headers: {
          Authorization: "Bearer " + process.env.OANDA_API_KEY
        },
        params: {
          granularity: "M1",
          count: 500,
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});