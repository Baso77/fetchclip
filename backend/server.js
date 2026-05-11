const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "FetchClip backend running"
  });
});

app.post("/api/download", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }

  return res.json({
    success: true,
    message: "Backend connected successfully",
    url
  });
});

module.exports = app;