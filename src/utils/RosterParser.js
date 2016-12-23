const axios = require('axios');
const _ = require('lodash');
const teams = require('../constants/teams');

const data = {};

_.each(teams, team => {
  let nickname = team.nickname.toLowerCase();
  if (nickname === 'trail blazers') {
    nickname = 'blazers';
  }
  if (nickname === '76ers') {
    nickname = 'sixers';
  }
  axios.get(`http://data.nba.net/data/10s/prod/v1/2016/teams/${nickname}/roster.json`).then(res => {
    _.each(res.data.league.standard.players, player => {
      if (data[team.tricode.toLowerCase()]) {
        data[team.tricode.toLowerCase()].push(player.personId);
      } else {
        data[team.tricode.toLowerCase()] = [player.personId];
      }
    });
  console.log(data);
  console.log(Object.keys(data).length);
  }).catch(err => {
    console.log(err);
  });
});
