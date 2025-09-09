import express from "express";
import { readFileSync } from "fs";
import path from "path";

const router = express.Router();

const filePath = path.join(process.cwd(), "apple-app-site-association");
const aasa = readFileSync(filePath, "utf-8");

router.get("/apple-app-site-association", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(aasa);
});

router.get("/.well-known/apple-app-site-association", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(aasa);
});

export default router;