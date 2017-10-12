const axios = require('axios');
const _ = require('lodash');

axios.get('http://data.nba.net/data/10s/prod/v1/2017/schedule.json').then(res => {
  const data = {};
  _.each(res.data.league.standard, game => {
    data[game.gameId] = {
      date: game.startTimeUTC,
      home: game.hTeam.teamId,
      away: game.vTeam.teamId,
    };
  });
  console.log(data);
});
