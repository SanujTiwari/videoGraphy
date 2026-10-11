const { connectDB, db } = require("./src/db/database");
async function run() {
  await connectDB();
  await db.prepare("UPDATE packages SET price = 30000, price_max = NULL WHERE name = 'Gold'").run();
  console.log("Updated Gold package");
  process.exit(0);
}
run();
