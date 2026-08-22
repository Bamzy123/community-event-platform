import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Community Event Platform server running on http://localhost:${PORT}`);
});
