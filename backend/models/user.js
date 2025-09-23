import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, default: "Anônimo" }, // <- novo
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true }
});

export default mongoose.model("User", UserSchema);