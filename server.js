const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()

const mySecret = process.env['MONGO_URI']

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });

let exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
});

let userSchema = new mongoose.Schema({
  username: String,
  log: [exerciseSchema]
}, { strict: false });

let exerciseSession = mongoose.model('Sessions', exerciseSchema);

let userSession = mongoose.model('Users', userSchema);

app.post('/api/users', bodyParser.urlencoded({ extended: false }), (req, res) => {
  let username = new userSession({ username: req.body.username });
  username.save((err, results) => {
    if (err) return console.error(err);
    let responseObject = {};
    responseObject['username'] = results.username;
    responseObject['_id'] = results._id;
    res.json(responseObject);
  });
});

app.get('/api/users', (req, res) => {
  userSession.find({}, (req, results) => {
    res.json(results);
  });
});

app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (req, res) => {
  var exercises = {
    description: req.body.description,
    duration: Number(req.body.duration),
    date: req.body.date
  };

  if (exercises.date === undefined) {
    exercises.date = new Date().toDateString();
  } else {
    let parts = exercises.date.split('-');
    let mydate = new Date(parts[0], parts[1] - 1, parts[2]);
    exercises.date = mydate.toDateString();
  }

  userSession.findByIdAndUpdate(
    req.params._id, { $push: { log: exercises } },
    { new: true }, (error, results) => {
      let responseObject = {};
      responseObject['username'] = results.username;
      responseObject['_id'] = results._id;
      responseObject['description'] = exercises.description;
      responseObject['duration'] = exercises.duration;
      responseObject['date'] = exercises.date;
      res.json(responseObject);
    });
});

app.get('/api/users/:_id/logs?', (req, res) => {
  userSession.findById(req.params._id).exec((error, results) => {
    if (error) return console.error(error);
    let responseObject = results;

    if (req.query.from || req.query.to) {
      let fromDate = req.query.from;
      let toDate = req.query.to;

      if (req.query.from) {
        fromDate = new Date(req.query.from);
      }

      if (req.query.to) {
        toDate = new Date(req.query.to);
      }

      responseObject['log'] = responseObject['log'].filter((session) => {
        let sessionDate = new Date(session.date);
        return sessionDate >= fromDate && sessionDate <= toDate;
      });
    }

    if (req.query.limit) {
      responseObject.log = responseObject.log.slice(0, req.query.limit);
    }

    responseObject['count'] = results['log'].length;
    res.json({ count: results['log'].length, ...responseObject.toJSON() });
  });
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
