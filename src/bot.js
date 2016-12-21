const Discord = require('discord.js');
const nba = require('nba.js');
const _ = require('lodash');
const AsciiTable = require('ascii-table');
const moment = require('moment');
const teams = require('./constants/constants.js').teams

const client = new Discord.Client();

const onReceiveMessage = message => {
  if (message.author.bot) {
    return;
  }
  if (message.content.trim() === '/nba') {
    message.channel.sendMessage('/nba YYYYMMDD: Display relevant NBA Scores and Schedule on a given date (e.g. /nba 20161031)');
    return;
  } else if (message.content.substring(0, 5) !== '/nba ') {

  }
  const date = moment(message.content.substring(5));
  if (!date.isValid()) {
    message.channel.sendMessage('Invalid');
    return;
  }
  nba.data.scoreboard({
    date: parseInt(message.content.substring(5))
  }).then(res => {
    let summary = `NBA Scores and Schedule @ ${date.format('MMMM Do, YYYY')}\n`
    const table = new AsciiTable();
    _.each(res.games, game => {
      table.clear();
      table.setAlign(1, AsciiTable.RIGHT)
      if (game.hTeam.score && game.vTeam.score) {
        table.addRow(`${teams[game.hTeam.teamId].name} (${game.hTeam.win}W, ${game.hTeam.loss}L)`, game.hTeam.score);
        table.addRow(`${teams[game.vTeam.teamId].name} (${game.vTeam.win}W, ${game.vTeam.loss}L)`, game.vTeam.score);
      } else {
        table.setAlign(0, AsciiTable.CENTER)
        table.addRow(`${teams[game.hTeam.teamId].name} (${game.hTeam.win}W, ${game.hTeam.loss}L)`);
        table.addRow('V.S.')
        table.addRow(`${teams[game.vTeam.teamId].name} (${game.vTeam.win}W, ${game.vTeam.loss}L)`);
      }
      summary += table.toString() + '\n';
    });
    message.channel.sendMessage(`\`\`\`${summary}\`\`\``);
  }).catch(error => {
    message.channel.sendMessage('Invalid');
  });
};

const onReady = () => {
  console.log('ready');
};

client.on('ready', onReady);

client.on('message', onReceiveMessage);

client.login('MjYwOTgxOTAzMTMyMzI3OTM2.CzuU1A.UHl2hlDz1R5HB1Et5wbnlJs7oK4');