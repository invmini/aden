const _ = require('lodash');
const moment = require('moment');
const axios = require('axios');
const teams = require('./constants/teams');
const schedules = require('./constants/schedules');
const players = require('./constants/players');
const rosters = require('./constants/rosters');
const AsciiTable = require('ascii-table');

const BASE_URL = 'http://data.nba.net/data/10s/prod/v1';

// Actions
const HELP = 'HELP';
const ERROR = 'ERROR';
const SCORES_OR_SCHEDULES = 'SCORES_OR_SCHEDULES';
const STANDINGS = 'STANDINGS';
const E_STANDINGS = 'E_STANDINGS';
const W_STANDINGS = 'W_STANDINGS';
const BOX_SCORE = 'BOX_SCORE';
const TEAMS = 'TEAMS';
const PLAYER = 'PLAYER';
const TEAM = 'TEAM';

// Utility functions
const findTeamIdByNickname = nickname => {
  let teamId = '';
  _.each(Object.keys(teams), key => {
    if (teams[key].nickname.toLowerCase() === nickname.toLowerCase().trim()) {
      teamId = key;
      return;
    }
  });
  return teamId;
};

const findPersonIdByName = playerName => {
  let personId = '';
  _.each(Object.keys(players), key => {
    if (players[key].name.toLowerCase() === playerName.toLowerCase().trim()) {
      personId = key;
      return;
    }
  });
  return personId;
};

const findMostRecentGameByTeamId = teamId => {
  let gameId = '';
  let minSeconds = Infinity;
  _.each(Object.keys(schedules), key => {
    const secondDiff = moment().diff(schedules[key].date, 'second');
    // Only find the game that is ongoing/finished
    if (secondDiff < 0) {
      return;
    }
    if (secondDiff < minSeconds && (schedules[key].home === teamId || schedules[key].away === teamId)) {
      minSeconds = secondDiff;
      gameId = key;
    }
  });
  return gameId;
};

const dispatch = (actionName, message, args) => {
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
      boxScore(message, args);
      break;
    case TEAMS:
      showTeams(message);
      break;
    case PLAYER:
      player(message, args);
      break;
    case TEAM:
      team(message, args);
      break;
    default:
      break;
  }
};

const error = message => {
  const errorMessage = 'Invalid parameters/commands\nType /nba to view all commands';
  message.channel.sendMessage(errorMessage);
};

const help = message => {
  const helpMessage = `- **/nba live**\n\
Display the scores of current live games
- **/nba [date]**\n\
Display relevant NBA scores/schedules on a given date (YYYYMMDD) (e.g. /nba 20161031)\n\
Alias: __**/nba yesterday**__, __**/nba today**__, __**/nba tomorrow**__\n\
- **/nba teams**\n\
Display all NBA teams and their tricode
- **/nba team [team nickname]**\n\
Display upcoming matches and current active roster of the chosen team (e.g. /nba team raptors)
- **/nba standings**\n\
Display the current standings
- **/nba estandings**\n\
Display the current Easten Conference standings
- **/nba wstandings**\n\
Display the current Western Conference standings
- **/nba player [player name]**\n\
Display the current stats of the chosen player
- **/nba bs [nickname|game id]**\n\
Display the box score of the chosen game (e.g. /nba bs raptors, /nba bs 0021600454)
(Note: If nickname is used, the boxscore of the most recent ongoing/finished game will be displayed)
- **/nba remind [nickname|game id]**\n\
Set a reminder to a future game`;
  message.channel.sendMessage(helpMessage);
};

const scoresOrSchedules = message => {
  let date = message.content.substring(5).trim();
  let liveFlag = false;
  // Checking for alias (live, yesterday, today, tomorrow)
  if (!moment(date).isValid()) {
    if (date === 'today' || date === 'live') {
      liveFlag = date === 'live';
      date = moment().format('YYYYMMDD');
    } else if (date === 'tomorrow') {
      date = moment().add({ day: 1 }).format('YYYYMMDD');
    } else if (date === 'yesterday') {
      date = moment().subtract({ day: 1 }).format('YYYYMMDD');
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
      // Title logic (kinda messy, need to refactor)
      let title = '';
      if (parseInt(game.hTeam.score) > 0 && parseInt(game.vTeam.score) > 0 && !game.isGameActivated) {
        title = `Finished - ${game.gameId}`;
      } else if (game.isGameActivated) {
        // Live game title logic
        title = 'Live - ';
        if (game.period.current <= 4) {
          if (game.period.isHalftime) {
            title += 'Halftime';
          } else if (game.period.isEndOfPeriod) {
            title += `End of Q${game.period.current}`;
          } else {
            title += game.period.current === 0 ? 'Starting Soon' : `Q${game.period.current} ${game.clock}`;
          }
        } else {
          title += `OT${game.period.current - 4} ${game.clock}`;
        }
      } else {
        title += `Starting ${moment(game.startTimeUTC).fromNow()}`;
      }
      table.setTitle(title);
      table.setAlign(1, AsciiTable.RIGHT);
      // Only add scores if there are scores
      if (game.hTeam.score && game.vTeam.score) {
        table.addRow(`  ${teams[game.vTeam.teamId].nickname} (${game.vTeam.win}W, ${game.vTeam.loss}L)  `, game.vTeam.score);
        table.addRow(`  ${teams[game.hTeam.teamId].nickname} (${game.hTeam.win}W, ${game.hTeam.loss}L)  `, game.hTeam.score);
      } else {
        table.setAlign(0, AsciiTable.CENTER);
        table.addRow(`  ${teams[game.vTeam.teamId].nickname} (${game.vTeam.win}W, ${game.vTeam.loss}L)  `);
        table.addRow('V.S.');
        table.addRow(`  ${teams[game.hTeam.teamId].nickname} (${game.hTeam.win}W, ${game.hTeam.loss}L)  `);
      }
      // Split messages once it exceeds 2000 characters
      if (summary.length + table.toString().length >= 2000) {
        message.channel.sendMessage(`\`\`\`${summary}\`\`\``);
        summary = '';
      }
      summary += `${table.toString()}\n`;
    });
    message.channel.sendMessage(`\`\`\`${summary}\`\`\``);
  }).catch(err => {
    if (err) {
      error(message);
    }
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
    const teamsArr = isEast ? res.data.league.standard.conference.east : isWest ? res.data.league.standard.conference.west : res.data.league.standard.teams;
    _.each(teamsArr, (team, i) => {
      const streak = team.isWinStreak ? 'W' : 'L';
      table.addRow(i + 1, teams[team.teamId].nickname, team.win, team.loss, team.winPct, `${team.lastTenWin}-${team.lastTenLoss}`, `${streak}${team.streak}`);
    });
    message.channel.sendMessage(`\`\`\`${table.toString()}\`\`\``);
  }).catch(err => {
    if (err) {
      error(message);
    }
  });
};

const boxScore = (message, gameId) => {
  // Check if gameId is a team nickname
  if (isNaN(gameId)) {
    // Need to find the gameId of the most recent match
    const teamId = findTeamIdByNickname(gameId);
    if (!teamId) {
      error(message);
      return;
    }
    gameId = findMostRecentGameByTeamId(teamId);
  }
  if (!schedules[gameId]) {
    error(message);
    return;
  }
  axios.get(`${BASE_URL}/${moment(schedules[gameId].date).format('YYYYMMDD').toString()}/${gameId}_boxscore.json`).then(res => {
    const vTeam = res.data.basicGameData.vTeam;
    const hTeam = res.data.basicGameData.hTeam;
    const totalPeriod = res.data.basicGameData.period.current;
    if (!totalPeriod) {
      message.channel.sendMessage('Game Has Not Started Yet');
      return;
    }
    const vTeamId = vTeam.teamId;
    const hTeamId = hTeam.teamId;

    // Quarter Score
    const scores = new AsciiTable();
    const scoresHeading = [''];
    const vTeamScores = [`${teams[vTeamId].nickname} (${vTeam.win}-${vTeam.loss})`];
    const hTeamScores = [`${teams[hTeamId].nickname} (${hTeam.win}-${hTeam.loss})`];
    for (let i = 1; i < totalPeriod + 1; i++) {
      scoresHeading.push(i > 4 ? `OT${i - 4}` : i);
      vTeamScores.push(vTeam.linescore[i - 1].score);
      hTeamScores.push(hTeam.linescore[i - 1].score);
    }
    scoresHeading.push('Total');
    vTeamScores.push(vTeam.score);
    hTeamScores.push(hTeam.score);
    scores.setHeading(scoresHeading);
    scores.addRow(vTeamScores);
    scores.addRow(hTeamScores);
    message.channel.sendMessage(`\`\`\`${scores.toString()}\`\`\``);

    // Box Score
    const vTeamTable = new AsciiTable();
    const hTeamTable = new AsciiTable();
    vTeamTable.setHeading('Player', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK');
    hTeamTable.setHeading('Player', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK');
    _.each(res.data.stats.activePlayers, player => {
      if (player.teamId === vTeamId && player.points) {
        vTeamTable.addRow(players[player.personId].name, player.min.split(':')[0], player.points, player.totReb, player.assists, player.steals, player.blocks);
      } else if (player.points) {
        hTeamTable.addRow(players[player.personId].name, player.min.split(':')[0], player.points, player.totReb, player.assists, player.steals, player.blocks);
      }
    });
    const nbaBoxScoreLink = `https://watch.nba.com/game/${moment(schedules[gameId].date).format('YYYYMMDD').toString()}/${teams[vTeamId].tricode}${teams[hTeamId].tricode}`;
    const outro = `For a more detailed boxscore, you can visit ${nbaBoxScoreLink}`;
    message.channel.sendMessage(`\`\`\`${teams[vTeamId].name} Box Scores\n${vTeamTable.toString()}\`\`\``);
    message.channel.sendMessage(`\`\`\`${teams[hTeamId].name} Box Scores\n${hTeamTable.toString()}\`\`\`\n${outro}`);
  }).catch(err => {
    if (err) {
      error(message);
    }
  });
};

const showTeams = message => {
  const table = new AsciiTable();
  table.setHeading('Team', 'Nickname', 'Tricode');
  _.each(teams, team => {
    table.addRow(team.name, team.nickname, team.tricode);
  });
  message.channel.sendMessage(`\`\`\`${table.toString()}\`\`\``);
};

const player = (message, playerName) => {
  let nbaLink = 'http://www.nba.com/players/';
  const personId = findPersonIdByName(playerName);
  if (!personId) {
    message.channel.sendMessage('Player Not Found :worried:\nYou can check out all the active NBA players @ http://www.nba.com/players/');
    return;
  }
  _.each(playerName.toLowerCase().trim().split(' '), word => {
    nbaLink += `${word}/`;
  });
  nbaLink += personId;
  const intro = `  ${players[personId].name} - #${players[personId].jersey} | ${players[personId].position} - ${teams[players[personId].teamId].name} `;
  const outro = `For more info, you can visit ${nbaLink}`;
  axios.get(`${BASE_URL}/2016/players/${personId}_profile.json`).then(res => {
    const table = new AsciiTable();
    table.removeBorder();
    const latestStats = res.data.league.standard.stats.latest;
    const careerStats = res.data.league.standard.stats.careerSummary;
    table.setHeading('', 'MPG', 'FG%', '3P%', 'FT%', 'PPG', 'RPG', 'APG', 'BPG');
    table.addRow('2016-17', latestStats.mpg, latestStats.fgp, latestStats.tpp, latestStats.ftp, latestStats.ppg, latestStats.rpg, latestStats.apg, latestStats.bpg);
    table.addRow('Career', careerStats.mpg, careerStats.fgp, careerStats.tpp, careerStats.ftp, careerStats.ppg, careerStats.rpg, careerStats.apg, careerStats.bpg);
    message.channel.sendMessage(`\`\`\`${intro}\n\n${table.toString()}\`\`\`\n${outro}`);
  }).catch(err => {
    if (err) {
      error(message);
    }
  });
};

const team = (message, nickname) => {
  const roster = rosters[nickname];
  if (!roster) {
    message.channel.sendMessage('Team Not Found :worried:\nYou can check out all the active team by typing /nba teams and make sure the nickname you enter is correct!');
    return;
  }

  // Find upcoming matches
  const teamId = findTeamIdByNickname(nickname);
  const upcomingMatches = new AsciiTable();
  upcomingMatches.setHeading('', 'V.S.', 'Date', 'Game ID');
  _.each(Object.keys(schedules), key => {
    const minutesDiff = moment(schedules[key].date).diff(moment(), 'minute');
    // To detect live game, check minutesDiff >= -3 * 60 (assuming a game is around 3 hours)
    // 7 days = 60 * 24 * 7 minute
    if (minutesDiff >= -3 * 60 && minutesDiff <= 60 * 24 * 7 && (schedules[key].home === teamId || schedules[key].away === teamId)) {
      const date = minutesDiff >= 0 ? moment(schedules[key].date).format('dddd, MMMM D, h:mmA') : `Live - type /nba bs ${nickname} to type live boxscore`;
      if (schedules[key].home === teamId) {
        upcomingMatches.addRow('Home', teams[schedules[key].away].name, date, key);
      } else {
        upcomingMatches.addRow('Away', teams[schedules[key].home].name, date, key);
      }
    }
  });

  // Roster
  const table = new AsciiTable();
  table.setHeading('Name', '#', 'Position');
  _.each(roster, personId => {
    const playerInfo = players[personId];
    table.addRow(playerInfo.name, playerInfo.jersey, playerInfo.position.replace('G', 'Guard').replace('F', 'Forward').replace('C', 'Center'));
  });
  message.channel.sendMessage(`\`\`\`Upcoming matches in 7 days for ${teams[teamId].name}\n${upcomingMatches.toString()}\nTeam Roster\n${table.toString()}\`\`\``);
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
  TEAMS,
  PLAYER,
  TEAM,
};
