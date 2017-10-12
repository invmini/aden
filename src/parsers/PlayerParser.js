const _ = require('lodash');
const axios = require('axios');

axios.get('http://data.nba.net/data/10s/prod/v1/2017/players.json').then(res => {
  const data = {};
  _.each(res.data.league.standard, player => {
    if (player.jersey && player.pos && player.teamId) {
      data[player.personId] = {
        name: `${player.firstName} ${player.lastName}`,
        jersey: player.jersey,
        position: player.pos,
        teamId: player.teamId,
      };
    }
  });
  console.log(data);
});
