import express from 'express';
import dotenv from 'dotenv'
import http from 'http';
import cors from 'cors';
import {Server } from 'socket.io';
import axios from 'axios'; 
dotenv.config({
    path:"./.env"
})

const app = express();

app.use(cors());
app.use(express.json());


const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_custom_secret_token';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'YOUR_META_PAGE_ACCESS_TOKEN';

const io = new Server(server, {
    cors:{
        origin:"*"
    }
});


io.on("connection",(socket)=>{

    console.log("A client connected:", socket.id);


    socket.on("disconnect",()=>{
        console.log("Client disconnected");
    });

});


app.get("/",(req,res)=>{
    res.send("Backend is running");
});


app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook Verified Successfully!');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});


app.post("/webhook",(req,res)=>{
   res.status(200).send('EVENT_RECEIVED');

  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          const leadgenId = change.value.leadgen_id;
          console.log(`New Lead Notification. Lead ID: ${leadgenId}`);

            fetchAndBroadcastLead(leadgenId)
                        .catch(err => console.error(err));
        }
      }
    }
  }
})



async function fetchAndBroadcastLead(leadgenId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${leadgenId}`,
      {
        params: {
          access_token: PAGE_ACCESS_TOKEN,
        },
      }
    );

    const leadData = response.data;
    console.log('Fetched Lead Details from Meta:', leadData);

    io.emit('newLead', leadData);
  } catch (error) {
    console.error(
      'Error fetching lead from Graph API:',
      error.response?.data || error.message
    );
  }
}

server.listen(PORT,()=>{
    console.log("Server running on port 4000");
});