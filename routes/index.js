var express = require("express");
const { body, validationResult } = require("express-validator");
var router = express.Router();
const db = require("../db/queries");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs")
const passport = require('passport');

const validateUser = [
  body("firstName")
    .trim()
    .isAlpha()
    .withMessage("First name must contain only letters")
    .isLength({ min: 1, max: 12 })
    .withMessage("First name must contain characters between 1 and 12"),
  body("lastName")
    .trim()
    .isAlpha()
    .withMessage("Last name must contain only letters")
    .isLength({ min: 1, max: 12 })
    .withMessage("Last Name must contain characters between 1 and 12"),
  body("email").isEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must contain minimum of 8 characters"),
  body("cnf-password")
    .custom((value, { req }) => {
      return value === req.body.password;
    })
    .withMessage("Passwords do not match!"),
];

const validateMember = [
  body("username").custom(async (username, { req }) => {
  // First, check if user exists
  const user = await db.getUserByUsername(username);
  if (!user) {
    throw new Error(`User with username ${username} does not exist`);
  }
  
  // Store user in request for subsequent checks
  req.validatedUser = user;
  return true;
}).bail(), // This ensures subsequent validators only run if this passes

body("password").custom(async (password, { req }) => {
  // Can only run after username validation
  const user = req.validatedUser;
  
  // Check password
  console.log(user.password)
  const match = await bcrypt.compare(password, user.password)
  if (!match) {
    throw new Error("Incorrect password");
  }
  
  return true;
}).bail(),

body("secret_key").custom(async (value) => {
  // Final validation step
  const databaseSecretKey = await db.getSecretKey();
  console.log(databaseSecretKey.secret_key)
  
  if (value !== databaseSecretKey.secret_key) {
    throw new Error("Incorrect Secret Code");
  }
  
  return true;
})]

validateMessage = [
  body("title").trim()
    .isLength({min: 1, max: 120}).withMessage("Title can contain max 120 characters")
    .escape(),
  body("message").trim()
    .isLength({min: 1, max: 1000}).withMessage("Message must be between 1 and 1000 characters")
    .escape(),
]

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try{
      const user = await db.getUserByUsername(username);

      if(!user){
        return done(null, false, {message: "Invalid username"})
      }
  
      const match = await bcrypt.compare(password, user.password)
      if(!match){
        return done(null, false, {message: "Incorrect Password"})
      }
  
      return done(null, user)
    }catch(err){
      return done(err)
    }
}))

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser( async(id, done) => {
  try{
    console.log("Desirializing user with id: ", id)
    const user = await db.getUserById(id);
    console.log("Retrieved user:" , user)
    done(null, user)
  }
  catch(err){
    done(err)
  }
})

/* GET home page. */
router.get("/", async function (req, res, next) {
  const messages = await db.getMessages()
  const authors = await Promise.all(
    messages.map(async (message) => {
      return await db.getUserById(message.user_id)
    })
  )
  console.log(authors)
  res.render("index", { 
    title: "Express",
    user: req.user,
    messages: messages,
    authors: authors,
   });
});

/* GET sign-up page */
router.get("/sign-up", function (req, res, next) {
  res.render("sign-up", { title: "Sign Up" });
});

router.post("/sign-up", validateUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render("sign-up", {
      title: "Sign Up",
      errors: errors.array(),
    });
  }
  const { firstName, lastName, email, password } = req.body;
  try {
    const hasedPassword = await bcrypt.hash(password, 10);
    await db.insertUser(firstName, lastName, email, hasedPassword);
    res.redirect("/");
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).render("sign-up", {
        title: "Sign Up",
        errors: [{ msg: "Email already exists" }],
      });
    }
  }
});

router.get("/add-member", function(req, res) {
  res.render("member", {
    title: "Membership Portal"
  })
})

router.post("/add-member", 
  validateMember,
  async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(400).render("member", {
        title: "Membership Portal",
        errors: errors.array()
      })
    }
    const membership_status = await db.getMembershipStatus(req.body.username)
    // console.log(membership_status)
    if(membership_status.membership_status === true){
      return res.render("member", {
        title: "Membership Portal", 
        errors: [{msg: `You are already a member!`}]
      })
    }
    await db.setMembershipStatus(req.body.username)
    res.render("member", {
      title: "Membership Portal",
      errors: [{msg: "Congratulations You are now our club's exclusive member"}]
    })
  }
)

router.get("/log-in", (req, res) => {
  res.render("login")
})

router.post("/log-in", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/",
}
));

router.get("/log-out", (req, res, next) => {
  req.logOut((err) => {
    if (err) return next(err)
    res.redirect("/")
  })
})

router.get("/create-message", (req, res) => {
  res.render("addMessage")
})

router.post("/create-message", validateMessage, 
  async (req, res) => {
    const {title, message} = req.body
    const created_at = new Date()
    const user_id = req.user.id
    await db.insertMessage(title, message, created_at, user_id)
    res.redirect("/")
  }
)

router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: err.message, 
    error: process.env.NODE_ENV === 'development' ? err : {} 
  });
});

module.exports = router;