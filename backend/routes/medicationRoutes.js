const express = require("express");
const router = express.Router();

const Medication = require("../models/Medication");


// ADD MEDICATION
router.post("/add", async (req,res)=>{

try{

if (!req.body.date) {
 req.body.date = new Date().toISOString().slice(0, 10);
}

const med = new Medication(req.body);

await med.save();

res.json({
message:"Medication added",
med
});

}
catch(error){

res.status(500).json({error:error.message});

}

});


// GET USER MEDICATIONS
router.get("/:userId", async (req,res)=>{

try{

const meds = await Medication.find({userId:req.params.userId});

res.json(meds);

}
catch(error){

res.status(500).json({error:error.message});

}

});


module.exports = router;