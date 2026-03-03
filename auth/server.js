require("dotenv").config();
const app = require("./src/app");
// const connectDB = require("./src/config/db");
const { connectPostgresDB } = require("./src/config/postgresdb");

// connectDB();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    connectPostgresDB()
    console.log(`Server running on port ${PORT}`);
});