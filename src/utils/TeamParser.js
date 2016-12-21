const nba = require('nba.js');
const _ = require('lodash');
nba.data.teams({
  year: 2016,
}).then(res => {
  const temp = {};
  _.each(res.league.standard, team => {
    if (team.isNBAFranchise) {
      temp[team.teamId] = { name: team.fullName, tricode: team.tricode }
    }
  });
  console.log(temp);
})