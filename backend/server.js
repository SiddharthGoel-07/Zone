import express from 'express';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';


dotenv.config();


const app = express();
const PORT = 3000;
let code;
let code2;
app.use(cors());

app.use(express.json());


let accountEmail;

const connectDB= async()=>{
   
    try {
        
        const conn=await mongoose.connect("mongodb+srv://sid:HBfNHQV4uZ-..27@cluster0.floj3xq.mongodb.net/Zone?retryWrites=true&w=majority&appName=Cluster0")
        .then(() => console.log("✅ Connected to MongoDB Atlas"))
        
    } catch (error) {
        console.log("conn failed",error);
    }
    
}

connectDB();
const userSchema = new mongoose.Schema({
    uuid:String,
    accemail:String,
    blockedSites: [{
        url: String,
        duration: Number ,
        currentLeft: Number,
        block:Boolean
    }]
});

const User= mongoose.model('User', userSchema);

app.post('/api/code', async (req, res) => {
    
    const email=req.body.email;
    accountEmail=email;

    const transporter =nodemailer.createTransport(
    {
      service:'gmail',
      auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS,
      },   
    }
    );

    code=Math.floor(1000+Math.random()*9000);

    const mailOptions={
      from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code}`,
    };

    try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    res.json({ success:true,   message: 'Email sent successfully' }); // You can skip sending code to frontend in production
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success:false , error: 'Email failed to send' });
  }

});

app.post('/api/verify' , (req,res)=>{
      
    let codee=req.body.code;

    console.log(typeof codee)
    console.log(typeof code)

    if(Number(codee)===code)
    {
      accountEmail=req.body.email;
      return res.json({success:true})
    }
else
   return res.json({success:false});
});

app.post('/api/block',async (req,res)=>{
  
    const blocks = req.body.list;
    const uuid= req.body.uuid;
    const email = req.body.email;

    let websites = blocks.map(block=>{
        return{
            url: block.url,
            duration: block.duration,
            currentLeft: block.duration,
            block: false
        }
    });

    const userr=await User.findOne({uuid:uuid});
    
    if(userr)
    {
         await User.updateOne(
          { uuid: uuid },
          {$set:{
            accemail: email,
            blockedSites: websites
          }}
         );
    }else
    {

    let user= new User({
        uuid:uuid,
        accemail: email,
        blockedSites: websites
      });

      await user.save();
    }

});

app.post('/api/getCode', async (req, res) => {
    const uuid = req.body.uuid;
    
    
    console.log("request received ");

    const user=await User.findOne({uuid:uuid})

    if(user)
    {
      const email = user.accemail;
       const transporter =nodemailer.createTransport(
    {
      service:'gmail',
      auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS,
      },   
    }
    );

    code2=Math.floor(1000+Math.random()*9000);

    const mailOptions={
      from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code2}`,
    };

    try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    res.json({ success:true,   message: 'Email sent successfully' }); // You can skip sending code to frontend in production
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success:false , error: 'Email failed to send' });
  }
    }
    else
    {
       res.json({success:false,  message:"user not verified"})
    }

});

app.post('/api/verifyCode', async (req, res) => {

  const {domain, codex, uuid} = req.body;
   
  const user = await User.findOne({ uuid: uuid });
  
  if(!user) {
    return res.json({ success: false, message: 'User not found' });
  }
  
  if(Number(codex) !== code2) {
    return res.json({ success: false, message: 'Invalid code' });
  }
  
  const bl=user.blockedSites;
  bl.forEach((block)=>{
    if(domain === block.url || domain.endsWith("." + block.url))
    {
      block.block = false;
      block.currentLeft = block.duration;
    }
  })

  await User.updateOne({ uuid: uuid }, { blockedSites: bl });

  return res.json({ success: true, message: 'Limit refreshed!' });
})

app.post('/api/getBlockedSites', async(req,res)=>{
  
  const {uuid , domain} = req.body;
  
  const user=await User.findOne({uuid:uuid});
  
  if(!user)
  {
    return res.json({success:false , message:"no such user exist"});
  }

  let bl=user.blockedSites;

  bl.forEach((block)=>{

    if(block.url===domain || domain.endsWith("."+ block.url))
    {
      block.currentLeft-=10;
      if(block.currentLeft<=0)
        block.block=true
    }

  })

  await User.findOneAndUpdate(
    {uuid: uuid},
    { $set : { blockedSites: bl } },
  );

  return res.json(bl);
})



app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});
