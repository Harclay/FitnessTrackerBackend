/* eslint-disable no-useless-catch */
const express = require("express");
const router = express.Router();
const {
    getUserByUsername,
    createUser,
    getUserById,
    getPublicRoutinesByUser,
    getAllRoutinesByUser,
  } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const bcrypt = require("bcrypt");



// POST /api/users/register
router.post("/register", async (req, res, next) => {
    const { username, password } = req.body;
  
    // Checking if the username already exists
    const checkUserName = await getUserByUsername(username);
  
    if (checkUserName) {
      // If the username already exists, send an error response
      res.send({
        error: "USERNAME ALREADY EXISTS",
        message: `User ${username} is already taken.`,
        name: "UsernameExists",
      });
    } else if (password.length < 8) {
      // If the password is too short, send an error response
      res.send({
        error: "PASSWORD TOO SHORT",
        message: "Password Too Short!",
        name: "ShortPassword",
      });
    } else {
      try {
        // If the username is available and password length is valid, create the user
        const user = await createUser({ username, password });
  
        // Generate a JWT token for the user
        const token = jwt.sign(
          {
            id: user.id,
            username,
          },
          JWT_SECRET,
          {
            expiresIn: "1w",
          }
        );
  
        // Send a success response with user details and token
        res.json({
          user: {
            id: user.id,
            username: username,
          },
          token: token,
          message: "USER CREATED",
        });
      } catch (error) {
        // Handle any errors that occurred during user creation
        next(error);
      }
    }
  });
  

// POST /api/users/login
router.post("/login", async (req, res, next) => {
    const { username, password } = req.body;
  
    try {
      const checkUsername = await getUserByUsername(username);
  
      if (!checkUsername) {
        res.send({
          error: "REQUIRES VALID USERNAME",
          message: "Requires valid Username",
          name: "RequireUsername",
        });
      }
  
      const hashedPassword = checkUsername.password;
      const matchPasswords = await bcrypt.compare(password, hashedPassword);
  
      if (!matchPasswords) {
        res.send({
          error: "REQUIRES VALID PASSWORD",
          message: "Requires Valid Password",
          name: "RequirePassword",
        });
      }
  
      const token = jwt.sign(
        {
          id: checkUsername.id,
          username,
        },
        JWT_SECRET
      );
  
      res.send({
        user: {
          id: checkUsername.id,
          username: username,
        },
        token: token,
        message: "you're logged in!",
      });
    } catch (error) {
      next(error);
    }
  });
  
  

// GET /api/users/me
router.get("/me", async (req, res, next) => {
    const prefix = "Bearer ";
    const auth = req.header("Authorization");
    if (!auth) {
      res.status(401).send({
        error: "Requirements",
        name: "Login",
        message: "You must be logged in to perform this action",
      });
    } else if (auth.startsWith(prefix)) {
      const token = auth.slice(prefix.length);
      try {
        const { id } = jwt.verify(token, JWT_SECRET);
        if (id) {
          req.username = await getUserById(id);
          res.send(req.username);
        }
      } catch (error) {
        next(error);
      }
    }
  });
  
  
  
  
  

// GET /api/users/:username/routines
router.get('/:username/routines', async (req, res, next) => {
    try {
      const { username } = req.params;
      const user = await getUserByUsername(username);
  
      if (!req.username || req.username.username !== username) {
        const publicRoutines = await getPublicRoutinesByUser(user);
        res.send(publicRoutines);
      } else {
        const allRoutines = await getAllRoutinesByUser(user);
        res.send(allRoutines);
      }
    } catch (error) {
      next(error);
    }
  });
  

  
  
  
  


module.exports = router;
