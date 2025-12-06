require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=> console.log("MongoDB connecté"))
  .catch(e=> console.error("Erreur MongoDB :", e));

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  passwordHash: String,
  country: String,
  plan: { type: String, default: "standard" },
  createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  plan: String,
  method: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Order = mongoose.model("Order", orderSchema);

function generateToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

app.get("/health", (req,res)=> res.json({ alive:true }));

app.post("/api/signup", async (req,res)=>{
  try {
    const { email, password, name, phone, country } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Utilisateur existe déjà" });

    const hash = await bcrypt.hash(password, 10);
    const u = new User({ email, name, phone, passwordHash: hash, country });
    await u.save();

    const token = generateToken(u);
    res.json({ ok:true, token });
  } catch(e){
    console.error(e);
    res.status(500).json({ error:"Erreur serveur" });
  }
});

app.post("/api/login", async (req,res)=>{
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ email });
    if(!u) return res.status(400).json({ error:"Identifiants incorrects" });

    const match = await bcrypt.compare(password, u.passwordHash);
    if(!match) return res.status(400).json({ error:"Identifiants incorrects" });

    const token = generateToken(u);
    res.json({ ok:true, token });
  } catch(e){
    res.status(500).json({ error:"Erreur serveur" });
  }
});

app.listen(PORT, ()=> console.log("Backend lancé sur port", PORT));
