const express = require('express');
const path = require('path')

const { ADDR_PREFIX, PORT } = require('./config');

const app = express();

app.use(`${ADDR_PREFIX}/`, express.static(path.join(__dirname, '../client')))

// app.get(`${ADDR_PREFIX}/`, (req, res) => {
//   res.send('Hello World!');
// });

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});