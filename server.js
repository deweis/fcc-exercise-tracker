const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

// Schemas are building block for Models. They can be nested to create complex models
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    _id: { type: String, required: true },
    username: String
  },
  { autoIndex: false }
);

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: String,
  duration: Number,
  date: String
});

// A model allows you to create instances of your objects, called documents.
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// your first API endpoint...
app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

let users = [
  { _id: 'cJ16IC5R', username: 'gen' },
  { _id: 'LbtGOYGL', username: 'usermi' },
  { _id: 'psMZmlim', username: 'usersden' }
];

let exercises = [
  {
    _id: 'psMZmlim',
    description: 'another exercise',
    duration: 50,
    date: 'Mon Jan 21 2019'
  },
  {
    _id: 'psMZmlim',
    description: 'my exercise',
    duration: 23,
    date: 'Tue Jan 22 2019'
  },
  {
    _id: 'psMZmlim',
    description: '3rd exercise',
    duration: 20,
    date: 'Wed Jan 23 2019'
  },
  {
    _id: 'psMZmlim',
    description: '2nd exercise',
    duration: 20,
    date: 'Tue Jan 22 2019'
  }
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
app.post('/api/exercise/new-user', (req, res) => {
  console.log('----------------------- POST REQUEST -----------------------');
  console.log('Request: POST new user: ', req.body);

  /* lookup a user in mongoDB */
  User.find({ username: req.body.username }, (err, docs) => {
    if (err) return console.error('error: ', err);
    console.log('docs: ', docs);

    // if user exists, return it
    if (docs.length > 0) {
      console.log('The requested user exists already in the db..');
      return res.json({
        _id: docs[0]._id,
        username: docs[0].username
      });
      // else create a new one
    } else {
      const user = new User({
        username: req.body.username,
        _id: generateId(8)
      });

      user.save((err, doc) => {
        if (err) return console.error(err);
        console.log(`Stored "${doc.username}" in user collection.`);
        return res.json({
          _id: doc._id,
          username: doc.username
        });
      });
    }
  });
});

/*
 * 2. I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
 *    Example: https://fcc-exercise-tracker-dw.glitch.me/api/exercise/users
 */
app.get('/api/exercise/users', (req, res) => {
  console.log('----------------------- GET REQUEST -----------------------');
  console.log('Request: GET users');
  User.find({}, (err, docs) => {
    if (err) return console.error('error: ', err);
    const users = docs.map(x => ({ _id: x._id, username: x.username }));
    return res.json(users);
  });
});

/*
 * 3. I can add an exercise to any user by posting form data userId(_id), description, duration, and optionally date to /api/exercise/add.
 *    If no date supplied it will use current date. Returned will the the user object with also with the exercise fields added.
 */
app.post('/api/exercise/add', (req, res) => {
  console.log('----------------------- POST REQUEST -----------------------');
  console.log('Request: POST add exercise');

  User.findById(req.body.userId, (err, user) => {
    if (err) return console.error('error: ', err);
    console.log(`User: ${user._id}`);

    if (!user) {
      console.log('Aborted: User does not exist');
      return res.send(
        'Ooops, this user does not exist - please add a valid user ID'
      );
    } else {
      // check and format the date resp. add current date if empty
      let dateInput =
        req.body.date === ''
          ? new Date().toDateString()
          : new Date(req.body.date).toDateString();
      if (
        dateInput.toString() === 'Invalid Date' ||
        (req.body.date !== '' && req.body.date.length !== 10)
      ) {
        console.log('Aborted: Invalid Date');
        return res.send(
          'Please add a valid date (yyyy-mm-dd) or let it empty for adding todays date'
        );
      }

      const toDb = {
        userId: user._id,
        description: req.body.description,
        duration: Number(req.body.duration),
        date: dateInput
      };

      const newDoc = new Exercise(toDb);

      newDoc.save((err, doc) => {
        if (err) return console.error(err);

        console.log(
          `Saved exercise for user "${doc.userId}" in the collection`
        );

        return res.json({
          _id: doc.userId,
          username: user.username,
          description: doc.description,
          duration: doc.duration,
          date: doc.date
        });
      });
    }
  });
});

/*
 * 4. I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id).
 *    Returned will be the user object with added array log and count (total exercise count).
 *    Example: https://fcc-exercise-tracker-dw.glitch.me/api/exercise/log?userId=SYAsrq30
 *
 * 5. I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit. (Date format yyyy-mm-dd, limit = int)
 *    Example: https://fcc-exercise-tracker-dw.glitch.me/api/exercise/log?userId=AMuknOb7&from=2019-02-01&to=2019-01-22&limit=1
 */
app.get('/api/exercise/log/', (req, res) => {
  console.log('----------------------- GET REQUEST -----------------------');
  console.log('Request: GET log of user: ', req.query.userId);

  // Get the User from DB
  User.findById(req.query.userId, (err, user) => {
    if (err) return console.error('error: ', err);

    if (!user) {
      console.log('Aborted: User does not exist');
      return res.send(
        'Ooops, this user does not exist - please add a valid user ID'
      );
    } else {
      let query = {
        userId: user._id
      };

      console.log('Query: ', query);

      // Get Exercises from DB
      Exercise.find(query, (err, exercises) => {
        if (err) return console.error('error: ', err);

        let result = exercises.map(exercise => ({
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date
        }));

        // Apply Date-from Filter
        if (req.query.from) {
          console.log('Filter exercises from: ', req.query.from);
          const fromFilter = new Date(req.query.from);
          if (fromFilter.toString() !== 'Invalid Date') {
            result = result.filter(x => new Date(x.date) >= fromFilter);
          }
        }

        return res.json({
          _id: user._id,
          username: user.username,
          count: result.length,
          log: result
        });
      });
    }
  });
});
/*
  // check if the user exists in the db
  const usr = userExists(null, req.query.userId);

  if (!usr) {
    res.send('Ooops, this user does not exist - please add a valid user');
  } else {
    let result = exercises
      .filter(x => x._id === usr._id)
      .map(x => ({
        description: x.description,
        duration: x.duration,
        date: new Date(x.date)
      }));

    // Apply Date-from Filter
    if (req.query.from) {
      console.log('Filter exercises from: ', req.query.from);
      const fromFilter = new Date(req.query.from);
      if (fromFilter.toString() !== 'Invalid Date') {
        result = result.filter(x => x.date >= fromFilter);
      }
    }

    // Apply Date-to Filter
    if (req.query.to) {
      console.log('Filter exercises to: ', req.query.to);
      const toFilter = new Date(req.query.to);
      if (toFilter.toString() !== 'Invalid Date') {
        result = result.filter(x => x.date <= toFilter);
      }
    }

    // Apply Results-limit Filter
    if (req.query.limit) {
      console.log('Filter exercises limit: ', req.query.limit);
      result = result.slice(0, req.query.limit);
    }

    return res.json({
      _id: usr._id,
      username: usr.username,
      count: result.length,
      log: result
    });
  }
  
*/

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
