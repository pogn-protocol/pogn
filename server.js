const express = require("express");
const app = express();

// Use the PORT from Heroku environment or fallback to 3000 for local testing
const port = process.env.PORT || 3000;

// Basic route for tsting
app.get("/", (req, res) => {
  res.send("Hello, Heroku!");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
