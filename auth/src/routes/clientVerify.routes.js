const router = require("express").Router();
const clientVerify = require("../controllers/clientVerify.controller");


router.get("/oauth2/authorize", clientVerify.capture);
 
module.exports = router;