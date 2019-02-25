const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
// mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track');

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// your first API endpoint...
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

/**
 * Open Stories:
 *
 * 4. I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id). Return will be the user object with added array log and count (total exercise count).
 * 5. I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit. (Date format yyyy-mm-dd, limit = int)
 *
 */

let users = [
  { username: 'gen', _id: 'cJ16IC5R' },
  { username: 'usermi', _id: 'LbtGOYGL' },
  { username: 'usersden', _id: 'psMZmlim' }
];

/* Generate an Id with random letters */
function generateId(lngth) {
  const letters =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let usrId = '';

  for (let i = 0; i < lngth; i++) {
    usrId += letters.charAt(
      Math.floor(Math.random() * (letters.length - 1 + 1))
    );
  }

  return usrId;
}

/* lookup a user */
function userExists(usr, usr_id) {
  if (usr) return users.find(x => x.username === usr);
  return users.find(x => x._id === usr_id);
}

/*
 * 1. I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
 */
app.post('/api/exercise/new-user', function(req, res) {
  console.log('----------------------- POST REQUEST -----------------------');
  console.log('Request: POST new user: ', req.body);

  const usr = userExists(req.body.username);

  // return existing user if already created
  if (usr) return res.json(usr);

  // else create a new one
  const user = { username: req.body.username, _id: generateId(8) };

  // add the user to the db
  users.push(user);

  return res.json(user);
});

/*
 * 2. I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
 */
app.get('/api/exercise/users', function(req, res) {
  console.log('----------------------- GET REQUEST -----------------------');
  console.log('Request: GET users');
  return res.json(users);
});

/*
 * 3. I can add an exercise to any user by posting form data userId(_id), description, duration, and optionally date to /api/exercise/add.
 *    If no date supplied it will use current date. Returned will the the user object with also with the exercise fields added.
 */
app.post('/api/exercise/add', function(req, res) {
  console.log('----------------------- POST REQUEST -----------------------');
  console.log('Request: POST add exercise: ', req.body);

  // check if the user exists in the db
  const usr = userExists(null, req.body.userId);

  if (!usr) {
    return res.json('user does not exist');
  } else {
    const result = {
      username: usr.username,
      _id: usr._id,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date
    };

    // Record the exercise in db
    // Check Date format and add current date if empty
    return res.json(result);
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res
    .status(errCode)
    .type('txt')
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
