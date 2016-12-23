const axios = require('axios');
const _ = require('lodash');

axios.get('http://data.nba.net/data/10s/prod/v1/2016/schedule.json').then(res => {
  const data = {};
  _.each(res.data.league.standard, game => {
    data[game.gameId] = game.startDateEastern;
  });
  console.log(data);
});
