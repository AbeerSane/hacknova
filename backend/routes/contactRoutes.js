const express = require("express");
const router = express.Router();

const Contact = require("../models/Contact");


// SAVE CONTACT MESSAGE
router.post("/", async (req,res)=>{

try{

const contact = new Contact(req.body);

await contact.save();

res.json({
message:"Message received",
contact
});

}
catch(error){

res.status(500).json({error:error.message});

}

});


module.exports = router;