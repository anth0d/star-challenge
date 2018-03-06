'use latest';
import { MongoClient, ObjectID } from 'mongodb';
import request from 'request';
import _ from 'lodash@4.8.2';

const GAME_DURATION_MS = 30 * 1000;
const GITHUB_API = 'https://api.github.com';
const STAR_RANGES = [
  {min: 1000, max: 9999},
  {min: 10000, max: 49999},
  {min: 50000, max: 74999},
  {min: 75000, max: 499999}
];
const ENCOURAGING_MESSAGES = [
  'Right answer!',
  'Nice work!',
  '⭐️ Gold star!',
  'I am in awe, truly.',
  'Right again!!',
  'Good work!',
  'You are 🔥',
  'Good job!!'
];

const GENERIC_FAILURE = {
  message: 'Wrong!',
  points: 0,
  correct: false
};
const GENERIC_SUCCESS = {
  message: _.sample(ENCOURAGING_MESSAGES),
  points: 50,
  correct: true
};

function incorrect(game) {
  return {
    message: `Wrong! ${game.wrongAnswerStars} < ${game.rightAnswerStars}!`,
    points: 0,
    correct: false
  }
}
function correct(game) {
  return {
    message: `${_.sample(ENCOURAGING_MESSAGES)} ${game.rightAnswerStars} > ${game.wrongAnswerStars}!`,
    points: 50,
    correct: true
  };
}

export default function(context, callback) {
  const { MONGO_URL } = context.secrets;
  const { id, answer } = context.data;

  MongoClient.connect(MONGO_URL, (err, db) => {
    if (err) {
      return callback(err);
    }

    // check answer and award points if correct
    if (id && answer) {
      db.collection('games').findOne({ _id: new ObjectID(id) }, (err, game) => {
        db.close();
        if (err) {
          return callback(err);
        }
        if (!game || !game.expiration || !game.rightAnswer) {
          return callback(null, GENERIC_FAILURE);
        }
        if (Date.now() > game.expiration) {
          return callback(null, GENERIC_FAILURE);
        }
        if (answer === game.rightAnswer) {
          return callback(null, correct(game));
        }
        return callback(null, incorrect(game));
      });
    }

    // otherwise, it's time for a new game!
    // pick a range for the guessing game:
    const range = _.sample(STAR_RANGES);
    const qs = [
      `q=stars:${range.min}..${range.max}`,
      's=stars',
      'type=Repositories'
    ].join('&');
    const options = {
      url: `${GITHUB_API}/search/repositories?${qs}`,
      headers: {
        'User-Agent': 'request'
      }
    };

    // fetch the list of repos within this range
    request(options, (err, res, body) => {
      if (err) {
        return callback(err);
      }
      if (res.statusCode !== 200) {
        return callback(res.statusMessage);
      }
      const repos = JSON.parse(body);
      /** 
       *  repos: {
       *    total_count: 9999,
       *    items: [
       *      {
       *        full_name: 'team/repo',
       *        stargazers_count: 123000,
       *        description: '...'
       *      },
       *      // ...
       *    ]
       *  }
      */

      // todo: validate total_count is >= 2, etc
      const [a, b] = _.sampleSize(repos.items, 2);
      // todo: validate 'a' and 'b' have different # of stars, contain necessary data, etc
      let rightAnswer, rightAnswerStars, wrongAnswerStars;
      if (a['stargazers_count'] >= b['stargazers_count']) {
        // ...a is the right answer
        rightAnswer = a['full_name'];
        rightAnswerStars = a['stargazers_count'];
        wrongAnswerStars = b['stargazers_count'];
      } else {
        // ...b is the right answer
        rightAnswer = b['full_name'];
        rightAnswerStars = b['stargazers_count'];
        wrongAnswerStars = a['stargazers_count'];
      }
      const game = {
        _id: new ObjectID(),
        rightAnswer,
        rightAnswerStars,
        wrongAnswerStars,
        // todo: make this not depend on MLab latency and/or webtask clocks being in sync...
        expiration: Date.now() + GAME_DURATION_MS
      };

      // dont include the star count in the client payload
      const clientPayload = {
        id: game._id,
        timer: GAME_DURATION_MS,
        repos: [
          {
            name: a['full_name'],
            description: a['description']
          },
          {
            name: b['full_name'],
            description: b['description']
          }
        ]
      };

      db.collection('games').insertOne(game, (err, result) => {
        db.close();
        if (err) {
          return callback(err);
        }
        // game created, send it to the client!
        callback(null, clientPayload);
      });
    })
  });
}

/**
 * data model: 
 * {
 *    "games": [{
 *      "_id": xxxx,
 *      "rightAnswer": "foo/bar",
 *      "expiration": Date.now() + duration
 *    }]
 * }
 * 
 * playing the game:
 * 
 * GET /stars
 * if no query params (id, answer) then its a new game:
 *    randomly pick a range (e.g. 1000-9999, 10000-49999, 50000-99999, 100k-999k)
 *    fetch repos within that range
 *    randomly select two repos within that range
 *    create a game id
 *    assign the right answer as the one with higher stars
 *    set expiry
 *    return game id and the two repos, not including star counts
 * 
 * GET /stars?id=...&answer=bar/baz
 *    if query params are present
 *    fetch game by id
 *    check current time against expiry
 *    check if answer is correct
 *    award points based on time?
 */
