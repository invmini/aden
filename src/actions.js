const nba = require('nba.js');
const _   = require('lodash');
const moment = require('moment');
const axios = require('axios');
const teams = require('./constants').teams;
const schedules = require('./constants').schedules;
const players = require('./constants').players;
const AsciiTable = require('ascii-table');

const BASE_URL = 'http://data.nba.net/data/10s/prod/v1';

const HELP = 'HELP';
const ERROR = 'ERROR';
const SCORES_OR_SCHEDULES = 'SCORES_OR_SCHEDULES';
const STANDINGS = 'STANDINGS';
const E_STANDINGS = 'E_STANDINGS';
const W_STANDINGS = 'W_STANDINGS';
const BOX_SCORE = 'BOX_SCORE';
const TRICODE = 'TRICODE';
const PLAYER = 'PLAYER';

const dispatch = (actionName, message, gameId) => {
  switch (actionName) {
  case HELP:
    help(message);
    break;
  case ERROR:
    error(message);
    break;
  case SCORES_OR_SCHEDULES:
    scoresOrSchedules(message);
    break;
  case STANDINGS:
    standings(message, false, false);
    break;
  case E_STANDINGS:
    standings(message, true, false);
    break;
  case W_STANDINGS:
    standings(message, false, true);
    break;
  case BOX_SCORE:
    boxScore(message, gameId);
    break;
  case TRICODE:
    tricode(message);
  default:
    break;
  }
};

const error = message => {
  const errorMessage = 'Invalid parameters/commands\nType /nba to view all commands';
  message.channel.sendMessage(errorMessage);
};

const help = message => {
  const helpMessage = `- **/nba [date]**\n\
Display relevant NBA scores/schedules on a given date (YYYYMMDD) (e.g. /nba 20161031)\n\
- **/nba tricode**\n\
Display tricode of all NBA teams
- **/nba [tricode]**\n\
Display upcoming matches of the chosen team (/nba gsw)
- **/nba standings**\n\
Display the current standings
- **/nba estandings**\n\
Display the current Easten Conference standings
- **/nba wstandings**\n\
Display the current Western Conference standings
- **/nba player [player name]**\n\
Display the current stats of the chosen player
- **/nba bs [game id]**\n\
Display the box score of the chosen game`;
  message.channel.sendMessage(helpMessage);
};

const scoresOrSchedules = message => {
  let date = message.content.substring(5).trim();
  let liveFlag = false;
  if (!moment(date).isValid()) {
    if (date === 'today' || date === 'live') {
      liveFlag = date === 'live';
      date = moment().format('YYYYMMDD');
    } else if (date === 'tomorrow') {
      date = moment().add({day:1}).format('YYYYMMDD');
    } else if (date === 'yesterday') {
      date = moment().subtract({day:1}).format('YYYYMMDD');
    } else {
      error(message);
      return;
    }
  }
  axios.get(`${BASE_URL}/${date}/scoreboard.json`).then(res => {
    let summary = `NBA Scores and Schedule @ ${moment(date).format('MMMM Do, YYYY')}\n`;
    const table = new AsciiTable();
    // Go through each game for that date
    _.each(res.data.games, game => {
      if (liveFlag && !game.isGameActivated) {
        return;
      }
      table.clear();
      // Title logic
      let title = '';
      if (parseInt(game.hTeam.score) > 0 && parseInt(game.vTeam.score) > 0 && !game.isGameActivated) {
        title = `Finished\n${game.gameId}`;
      } else if (game.isGameActivated) {
        title = 'Live - ';
        if (game.period.current <= 4) {
          if (game.period.isHalftime) {
            title += `Halftime`;
          } else if (game.period.isEndOfPeriod) {
            title += `End of Q${game.period.current}`;
          } else {
            title += `Q${game.period.current} ${game.clock}`;
          }

        } else {
          title += `OT${game.period.current - 4} ${game.clock}`;
        }
      } else {
        title += `Starting ${moment(game.startTimeUTC).fromNow()}`;
      }
      table.setTitle(title);
      table.setAlign(1, AsciiTable.RIGHT);
      if (game.hTeam.score && game.vTeam.score) {
        table.addRow(`${teams[game.hTeam.teamId].nickname} (${game.hTeam.win}W, ${game.hTeam.loss}L)`, game.hTeam.score);
        table.addRow(`${teams[game.vTeam.teamId].nickname} (${game.vTeam.win}W, ${game.vTeam.loss}L)`, game.vTeam.score);
      } else {
        table.setAlign(0, AsciiTable.CENTER);
        table.addRow(`  ${teams[game.hTeam.teamId].nickname} (${game.hTeam.win}W, ${game.hTeam.loss}L)  `);
        table.addRow('V.S.');
        table.addRow(`  ${teams[game.vTeam.teamId].nickname} (${game.vTeam.win}W, ${game.vTeam.loss}L)  `);
      }
      // Split messages once it exceeds 2000 characters
      if (summary.length + table.toString().length >= 2000) {
        message.channel.sendMessage(`\`\`\`${summary}\`\`\``);
        summary = '';
      }
      summary += table.toString() + '\n';
    });
    message.channel.sendMessage(`\`\`\`${summary}\`\`\``);
  }).catch(err => {
    error(message);
  });
};

const standings = (message, isEast, isWest) => {
  let url = '';
  let title = '';
  if (isEast || isWest) {
    url = 'standings_conference';
    title = isEast ? 'Eastern ' : 'Western ';
  } else {
    url = 'standings_all';
  }
  title += 'Conference Standings';
  axios.get(`${BASE_URL}/current/${url}.json`).then(res => {
    const table = new AsciiTable(title);
    table.setHeading('#', 'Team', 'W', 'L', 'PCT', 'L10', 'STRK')
      .setAlign(0, AsciiTable.RIGHT)
      .setAlign(2, AsciiTable.RIGHT)
      .setAlign(3, AsciiTable.RIGHT)
      .setAlign(6, AsciiTable.CENTER);
    const teamsArr = isEast ? res.data.league.standard.conference.east : (isWest ? res.data.league.standard.conference.west : res.data.league.standard.teams);
    _.each(teamsArr, (team, i) => {
      const streak = team.isWinStreak ? 'W' : 'L';
      table.addRow(i + 1, teams[team.teamId].nickname, team.win, team.loss, team.winPct, `${team.lastTenWin}-${team.lastTenLoss}`, `${streak}${team.streak}`);
    });
    message.channel.sendMessage(`\`\`\`${table.toString()}\`\`\``);
  });
};

const boxScore = (message, gameId) => {
  axios.get(`${BASE_URL}/${schedules[gameId]}/${gameId}_boxscore.json`).then(res => {
    const vTeam = res.data.basicGameData.vTeam;
    const hTeam = res.data.basicGameData.hTeam;
    const vTeamId = vTeam.teamId;
    const hTeamId = hTeam.teamId;
    // Quarter Score (Assume no OT for now)
    const scores = new AsciiTable();
    scores.setHeading('', '1', '2', '3', '4', 'Total');
    scores.addRow(teams[vTeamId].nickname, vTeam.linescore[0].score, vTeam.linescore[1].score, vTeam.linescore[2].score, vTeam.linescore[3].score, vTeam.score);
    scores.addRow(teams[hTeamId].nickname, hTeam.linescore[0].score, hTeam.linescore[1].score, hTeam.linescore[2].score, hTeam.linescore[3].score, hTeam.score);
    message.channel.sendMessage(`\`\`\`${scores.toString()}\`\`\``);
    // Box Score
    const vTeamTable = new AsciiTable();
    const hTeamTable = new AsciiTable();
    vTeamTable.setHeading('Player', 'MIN', 'PTS', 'REB', 'AST', 'BLK');
    hTeamTable.setHeading('Player', 'MIN', 'PTS', 'REB', 'AST', 'BLK');
    _.each(res.data.stats.activePlayers, player => {
      if (player.teamId === vTeamId && player.points) {
        vTeamTable.addRow(players[player.personId], player.min.split(':')[0], player.points, player.totReb, player.assists, player.blocks);
      } else if (player.points) {
        hTeamTable.addRow(players[player.personId], player.min.split(':')[0], player.points, player.totReb, player.assists, player.blocks);
      }
    });
    message.channel.sendMessage(`\`\`\`${vTeamTable.toString()}\`\`\``);
    message.channel.sendMessage(`\`\`\`${hTeamTable.toString()}\`\`\``);
  }).catch(err => {
    error(message);
  });
};

const tricode = (message) => {
  const table = new AsciiTable();
  table.setHeading('Team', 'Tricode');
  _.each(teams, team => {
    table.addRow(team.name, team.tricode);
  });
  message.channel.sendMessage(`\`\`\`${table.toString()}\`\`\``);
};

const player = (message, personId) => {
  let nbaLink = 'http://www.nba.com/players/';
};

module.exports = {
  dispatch,
  HELP,
  ERROR,
  SCORES_OR_SCHEDULES,
  STANDINGS,
  E_STANDINGS,
  W_STANDINGS,
  BOX_SCORE,
  TRICODE,
  PLAYER,
};