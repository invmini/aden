const nba = require('nba.js');
const _   = require('lodash');
const moment = require('moment');
const axios = require('axios');
const teams = require('./constants').teams;
const AsciiTable = require('ascii-table');

const BASE_URL = 'http://data.nba.net/data/10s/prod/v1';

const dispatchError = message => {
  const errorMessage = 'Invalid parameters/commands\nType /nba to view all commands';
  message.channel.sendMessage(errorMessage);
};

const dispatchHelp = message => {
  const helpMessage = `- **/nba YYYYMMDD**\n\
Display relevant NBA scores/schedules on a given date (e.g. /nba 20161031)\n\
- **/nba [teams]**\n\
Display stats of the chosen team (e.g. /nba GSW)`;
  message.channel.sendMessage(helpMessage);
}

const dispatchScoresOrSchedules = message => {
  const date = moment(message.content.substring(5));
  axios.get(`${BASE_URL}/${message.content.substring(5)}/scoreboard.json`).then(res => {
    let summary = `NBA Scores and Schedule @ ${date.format('MMMM Do, YYYY')}\n`;
    const table = new AsciiTable();
    // Go through each game for that date
    _.each(res.data.games, game => {
      table.clear();
      table.setAlign(1, AsciiTable.RIGHT);
      if (game.hTeam.score && game.vTeam.score) {
        table.addRow(`${teams[game.hTeam.teamId].name} (${game.hTeam.win}W, ${game.hTeam.loss}L)`, game.hTeam.score);
        table.addRow(`${teams[game.vTeam.teamId].name} (${game.vTeam.win}W, ${game.vTeam.loss}L)`, game.vTeam.score);
      } else {
        table.setAlign(0, AsciiTable.CENTER);
        table.addRow(`${teams[game.hTeam.teamId].name} (${game.hTeam.win}W, ${game.hTeam.loss}L)`);
        table.addRow('V.S.');
        table.addRow(`${teams[game.vTeam.teamId].name} (${game.vTeam.win}W, ${game.vTeam.loss}L)`);
      }
      summary += table.toString() + '\n';
    });
    message.channel.sendMessage(`\`\`\`${summary}\`\`\``);
  }).catch(error => {
    dispatchError(message);
  });
};

module.exports = {
  dispatchError,
  dispatchHelp,
  dispatchScoresOrSchedules,
};