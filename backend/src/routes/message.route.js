import express from 'express';

const router = express.Router();

router.get("/send", (req,res) => {
  res.send("Send messages endpoint");





});
  
router.get("/receive", (req,res) => {
  res.send("Receive messages endpoint");





});

export default router;