import _ from 'lodash';
import moment from 'moment';
import axios from 'axios';
import teams from './constants/teams';
import schedules from './constants/schedules';
import players from './constants/players';
import rosters from './constants/rosters';
import config from './config';
import AsciiTable from 'ascii-table';
import Matcher from 'did-you-mean';
import YouTube from 'youtube-node';
import Logger from 'js-logger';

class Actions {
  constructor() {
    this.baseUrl = 'http://data.nba.net/data/10s/prod/v1';

    // Setup matcher
    this.teamMatcher = new Matcher();
    _.each(teams, team => {
      this.teamMatcher.add(team.nickname);
    });
    this.playerMatcher = new Matcher();
    _.each(players, player => {
      this.playerMatcher.add(player.name);
    });

    // Setup YouTube API
    this.youtube = new YouTube();
    this.youtube.addParam('channelId', 'UCRUQQrm8_l3CVYxfq2kPMlg');
    this.youtube.addParam('order', 'date');
    this.youtube.setKey(config.YOUTUBE_API_KEY);

    // Setup current message
    this.message = undefined;

    // Setup Logger
    Logger.useDefaults();
  }

  refresh(message) {
    this.message = message;
  }

  sendMessage(payload, isReply = false) {
    if (typeof payload === 'string') {
      Logger.info(`Outgoing message: ${payload}`);
      if (isReply) {
        this.message.reply(payload);
      } else {
        this.message.channel.sendMessage(payload);
      }
    } else {
      // Do all the mongo/redis stuff here

    }
  }

  // utility functions
  findTeamIdByNickname(nickname) {
    let teamId = '';
    // Edge cases
    if (nickname.toLowerCase().trim() === 'sixers') {
      nickname = '76ers';
    } else if (nickname.toLowerCase().trim() === 'blazers') {
      nickname = 'Trail Blazers';
    }
    _.each(Object.keys(teams), key => {
      if (teams[key].nickname.toLowerCase() === nickname.toLowerCase().trim()) {
        teamId = key;
        return;
      }
    });
    return teamId;
  }

  findPersonIdByName(playerName) {
    let personId = '';
    _.each(Object.keys(players), key => {
      if (players[key].name.toLowerCase() === playerName.toLowerCase().trim()) {
        personId = key;
        return;
      }
    });
    return personId;
  }

  findMostRecentGameByTeamId(teamId) {
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
  }

  findUpcomingGameByTeamId(teamId) {
    let gameId = '';
    let minSeconds = Infinity;
    _.each(Object.keys(schedules), key => {
      const secondDiff = moment(schedules[key].date).diff(moment(), 'second');
      if (secondDiff < 0) {
        return;
      }
      if (secondDiff < minSeconds && (schedules[key].home === teamId || schedules[key].away === teamId)) {
        minSeconds = secondDiff;
        gameId = key;
      }
    });
    return gameId;
  }

  setGameReminder(gameId) {
    const home = teams[schedules[gameId].home];
    const away = teams[schedules[gameId].away];
    this.sendMessage(`Reminder: ${home.name} V.S. ${away.name} is starting soon! :basketball:`, true);
  }

  getGameStatus(game) {
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
    return title;
  }

  /**
   * Error message
   * @param {Message} message - The message sent from the user
   */
  error() {
    const errorMessage = 'Invalid parameters/commands are invalid:japanese_goblin:\nType `/nba` to view all commands';
    this.sendMessage(errorMessage);
  }

  /**
   *  Command: /nba

   */
  help() {
    const helpMessage = `\`/nba live\`\n\
Display the scores of current live games
\`/nba [date]\`\n\
Display relevant NBA scores/schedules on a given date (YYYYMMDD) (e.g. /nba 20161031)\n\
Alias: \`/nba yesterday\`, \`/nba today\`, \`/nba tomorrow\`\n\
\`/nba teams\`\n\
Display all NBA teams and their tricode
\`/nba team [nickname]\`\n\
Display upcoming matches and current active roster of the chosen team (e.g. /nba team raptors)
\`/nba standings\`\n\
Display the current standings
\`/nba estandings\`\n\
Display the current Easten Conference standings
\`/nba wstandings\`\n\
Display the current Western Conference standings
\`/nba player [player name]\`\n\
Display the current stats of the chosen player
\`/nba bs [nickname|game id]\`\n\
Display the box score of the chosen game (e.g. /nba bs raptors, /nba bs 0021600454)
(Note: If nickname is used, the boxscore of the most recent ongoing/finished game will be displayed)
\`/nba remind [nickname|game id]\`\n\
Set a reminder to a future game
\`/nba hl [nickname|game id]\`\n\
YouTube video of the selected game highlight`;
    this.sendMessage(helpMessage);
  }

  /**
   *  Command: /nba [date], /nba live, /nba yesterday, /nba today, /nba tomorrow

   */
  scoresOrSchedules() {
    let date = this.message.content.substring(5).trim();
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
        this.error();
        return;
      }
    }
    axios.get(`${this.baseUrl}/${date}/scoreboard.json`).then(res => {
      let summary = `NBA Scores and Schedule @ ${moment(date).format('MMMM Do, YYYY')}\n`;
      const table = new AsciiTable();
      // Go through each game for that date
      _.each(res.data.games, game => {
        if (liveFlag && !game.isGameActivated) {
          return;
        }
        table.clear();
        const title = this.getGameStatus(game);
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
          this.sendMessage(`\`${summary}\``);
          summary = '';
        }
        summary += `${table.toString()}\n`;
      });
      this.sendMessage(`\`${summary}\``);
    }).catch(err => {
      if (err) {
        Logger.error(err);
        this.error();
      }
    });
  }

  /**
   *  Command: /nba standings, /nba estandings, /nba wstandings

   *  @param {boolean} isEast - True if the user wants to see eastern conference standings
   *  @param {boolean} isWest - True if the user wants to see western conference standings
   */
  standings(isEast, isWest) {
    let url = '';
    let title = '';
    if (isEast || isWest) {
      url = 'standings_conference';
      title = isEast ? 'Eastern ' : 'Western ';
    } else {
      url = 'standings_all';
    }
    title += 'Conference Standings';
    axios.get(`${this.baseUrl}/current/${url}.json`).then(res => {
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
      this.sendMessage(`\`${table.toString()}\``);
    }).catch(err => {
      if (err) {
        Logger.error(err);
        this.error();
      }
    });
  }

  /**
   *  Command: /nba bs [nickname|game id]

   *  @param {string} gameId - The boxscore of a game with gameId
   */
  boxScore(gameId) {
    // Check if gameId is a team nickname
    if (isNaN(gameId)) {
      // Need to find the gameId of the most recent match
      // In the case of isNaN(gameId) === truem gameId is storing the nickname of the team
      const teamId = this.findTeamIdByNickname(gameId);
      if (!teamId) {
        const correction = this.teamMatcher.get(gameId);
        const didYouMean = correction ? `Did you mean \`${correction}\`?` : '';
        this.sendMessage(`Team Not Found :confused: ${didYouMean}\nYou can check out all the active team by typing /nba teams and make sure the nickname you enter is correct!`);
        return;
      }
      gameId = this.findMostRecentGameByTeamId(teamId);
    }
    if (!schedules[gameId]) {
      this.error();
      return;
    }
    axios.get(`${this.baseUrl}/${moment(schedules[gameId].date).format('YYYYMMDD').toString()}/${gameId}_boxscore.json`).then(res => {
      const vTeam = res.data.basicGameData.vTeam;
      const hTeam = res.data.basicGameData.hTeam;
      const totalPeriod = res.data.basicGameData.period.current;
      if (!totalPeriod) {
        this.sendMessage('Game Has Not Started Yet');
        return;
      }
      const vTeamId = vTeam.teamId;
      const hTeamId = hTeam.teamId;
      const intro = `Game Status: ${this.getGameStatus(res.data.basicGameData)}`;

      // Quarter Score
      const scores = new AsciiTable();
      const scoresHeading = [moment(schedules[gameId].date).format('MMMM Do, YYYY')];
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
      this.sendMessage(`\`${intro}\n${scores.toString()}\``);

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
      const outro = `For a more detailed boxscore, you can visit ${nbaBoxScoreLink}\nFor a highlight video, type \`/nba hl ${gameId}\``;
      this.sendMessage(`\`${teams[vTeamId].name} Box Scores\n${vTeamTable.toString()}\``);
      this.sendMessage(`\`${teams[hTeamId].name} Box Scores\n${hTeamTable.toString()}\`\n\n${outro}`);
    }).catch(err => {
      if (err) {
        Logger.error(err);
        this.error();
      }
    });
  }

  /**
   *  Command: /nba teams

   */
  showTeams() {
    const table = new AsciiTable();
    table.setHeading('Team', 'Nickname', 'Tricode');
    _.each(teams, team => {
      table.addRow(team.name, team.nickname, team.tricode);
    });
    this.sendMessage(`\`${table.toString()}\``);
  }

  /**
   *  Command: /nba player [player name]

   *  @param {string} playerName - The name of the player
   */
  player(playerName) {
    let nbaLink = 'http://www.nba.com/players/';
    const personId = this.findPersonIdByName(playerName);
    if (!personId) {
      const correction = this.playerMatcher.get(playerName);
      const didYouMean = correction ? `Did you mean \`${correction}\`?` : '';
      this.sendMessage(`Player Not Found :confused: ${didYouMean}\nYou can check out all the average NBA players @ http://www.nba.com/players/`);
      return;
    }
    _.each(playerName.toLowerCase().trim().split(' '), word => {
      nbaLink += `${word}/`;
    });
    nbaLink += personId;
    const intro = `  ${players[personId].name} - #${players[personId].jersey} | ${players[personId].position} - ${teams[players[personId].teamId].name} `;
    const outro = `For more info, you can visit ${nbaLink}`;
    axios.get(`${this.baseUrl}/2016/players/${personId}_profile.json`).then(res => {
      const table = new AsciiTable();
      const latestStats = res.data.league.standard.stats.latest;
      const careerStats = res.data.league.standard.stats.careerSummary;
      table.setHeading('', 'MPG', 'FG%', '3P%', 'FT%', 'PPG', 'RPG', 'APG', 'BPG');
      table.addRow('2016-17', latestStats.mpg, latestStats.fgp, latestStats.tpp, latestStats.ftp, latestStats.ppg, latestStats.rpg, latestStats.apg, latestStats.bpg);
      table.addRow('Career', careerStats.mpg, careerStats.fgp, careerStats.tpp, careerStats.ftp, careerStats.ppg, careerStats.rpg, careerStats.apg, careerStats.bpg);
      this.sendMessage(`\`${intro}\n\n${table.toString()}\`\n${outro}`);
    }).catch(err => {
      if (err) {
        Logger.error(err);
        this.error();
      }
    });
  }

  /**
   *  Command: /nba team [nickname]

   *  @param {string} nickname - The nickname of the team
   */
  team(nickname) {
    // Edge cases
    if (nickname.toLowerCase().trim() === '76ers') {
      nickname = 'sixers';
    } else if (nickname.toLowerCase().trim() === 'trail blazers') {
      nickname = 'blazers';
    }
    const roster = rosters[nickname];
    if (!roster) {
      const correction = this.teamMatcher.get(nickname);
      const didYouMean = correction ? `Did you mean \`${correction}\`?` : '';
      this.sendMessage(`Team Not Found :confused: ${didYouMean}\nYou can check out all the active team by typing /nba teams and make sure the nickname you enter is correct!`);
      return;
    }

    // Find upcoming matches
    const teamId = this.findTeamIdByNickname(nickname);
    const upcomingMatches = new AsciiTable();
    upcomingMatches.setHeading('', 'V.S.', 'Date', 'Game ID');
    _.each(Object.keys(schedules), key => {
      const minutesDiff = moment(schedules[key].date).diff(moment(), 'minute');
      // To detect live game, check minutesDiff >= -3 * 60 (assuming a game is around 3 hours)
      // 7 days = 60 * 24 * 7 minute
      if (minutesDiff >= -3 * 60 && minutesDiff <= 60 * 24 * 7 && (schedules[key].home === teamId || schedules[key].away === teamId)) {
        const date = minutesDiff >= 0 ? moment(schedules[key].date).format('dddd, MMMM D, h:mmA') : `Live - type /nba bs ${nickname} to view live boxscore`;
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
    this.sendMessage(`\`Upcoming matches in 7 days for ${teams[teamId].name}\n${upcomingMatches.toString()}\nTeam Roster\n${table.toString()}\``);
  }

  /**
   *  Command: /nba remind [nickname|game id]

   *  @param {string} gameId - Remind the user a game with gameId
   */
  remind(gameId) {
    // Check if gameId is a team nickname
    if (isNaN(gameId)) {
      // Need to find the gameId of the most recent match
      const teamId = this.findTeamIdByNickname(gameId);
      if (!teamId) {
        const correction = this.teamMatcher.get(gameId);
        const didYouMean = correction ? `Did you mean \`${correction}\`?` : '';
        this.sendMessage(`Team Not Found :confused: ${didYouMean}\nYou can check out all the active team by typing /nba teams and make sure the nickname you enter is correct!`);
        return;
      }
      gameId = this.findUpcomingGameByTeamId(teamId);
    } else if (!schedules[gameId]) {
      this.error();
      return;
    } else if (moment(schedules[gameId].date).diff(moment(), 'second') < 0) {
      this.sendMessage(`You need a time machine to set a reminder in the past. Type \`/nba bs ${gameId}\` to check out the boxscore!`);
      return;
    }
    // Use setTimeout to set a reminder
    setTimeout(() => this.setGameReminder(gameId), moment(schedules[gameId].date).diff(moment(), 'second') * 1000);
    const home = teams[schedules[gameId].home];
    const away = teams[schedules[gameId].away];
    const howLong = moment(schedules[gameId].date).fromNow();
    this.sendMessage(`Game reminder set! ${home.name} V.S. ${away.name} is starting ${howLong}:ok_hand:`, true);
  }

  /**
   *  Command: /nba hl [nickname|game id]

   *  @param {string} gameId - Remind the user a game with gameId
   */
  highlight(gameId) {
    // Check if gameId is a team nickname
    if (isNaN(gameId)) {
      // Need to find the gameId of the most recent match
      // In the case of isNaN(gameId) === truem gameId is storing the nickname of the team
      const teamId = this.findTeamIdByNickname(gameId);
      if (!teamId) {
        const correction = this.teamMatcher.get(gameId);
        const didYouMean = correction ? `Did you mean \`${correction}\`?` : '';
        this.sendMessage(`Team Not Found :confused: ${didYouMean}\nYou can check out all the active team by typing /nba teams and make sure the nickname you enter is correct!`);
        return;
      }
      gameId = this.findMostRecentGameByTeamId(teamId);
    }
    if (!schedules[gameId]) {
      this.error();
      return;
    } else if (moment(schedules[gameId].date).diff(moment(), 'second') > -15 * 60) {
      // Assume 3 hours from game starts to uploading highlight
      this.sendMessage(`No highlight is available yet :worried:`);
      return;
    }
    const date = schedules[gameId].date;
    const homeTeamName = teams[schedules[gameId].home].name;
    const awayTeamName = teams[schedules[gameId].away].name;
    const intro = `Here is a video highlight of ${awayTeamName} vs ${homeTeamName} on ${moment(date).format('MMMM Do YYYY')}\n`;
    const searchQuery = `${awayTeamName} vs ${homeTeamName} full game highlight ${moment(date).format('MMMM Do YYYY')}`;
    this.youtube.search(searchQuery, 1, (error, result) => {
      if (error) {
        return;
      }
      this.sendMessage(`${intro}https://www.youtube.com/watch?v=${result.items[0].id.videoId}`);
    });
  }

  shaq() {
    this.youtube.search('Shaqtin\' A Fool', 1, (error, result) => {
      if (error) {
        return;
      }
      this.sendMessage(`https://www.youtube.com/watch?v=${result.items[0].id.videoId}`);
    });
  }
}

// Action constants
export const HELP = 'HELP';
export const ERROR = 'ERROR';
export const SCORES_OR_SCHEDULES = 'SCORES_OR_SCHEDULES';
export const STANDINGS = 'STANDINGS';
export const E_STANDINGS = 'E_STANDINGS';
export const W_STANDINGS = 'W_STANDINGS';
export const BOX_SCORE = 'BOX_SCORE';
export const TEAMS = 'TEAMS';
export const PLAYER = 'PLAYER';
export const TEAM = 'TEAM';
export const REMIND = 'REMIND';
export const HIGHLIGHT = 'HIGHLIGHT';

// Create an action object
const actions = new Actions();

/**
 * Dispatch an specific action according to the action name
 * @param {string} actionName - The action to perform
 * @param {Message} message - The message sent from the user
 * @param {string} args - Additional argument
 */
export const dispatch = (actionName, message, args) => {
  actions.refresh(message);
  switch (actionName) {
    case HELP:
      actions.help();
      break;
    case ERROR:
      actions.error();
      break;
    case SCORES_OR_SCHEDULES:
      actions.scoresOrSchedules();
      break;
    case STANDINGS:
      actions.standings(false, false);
      break;
    case E_STANDINGS:
      actions.standings(true, false);
      break;
    case W_STANDINGS:
      actions.standings(false, true);
      break;
    case BOX_SCORE:
      actions.boxScore(args);
      break;
    case TEAMS:
      actions.showTeams();
      break;
    case PLAYER:
      actions.player(args);
      break;
    case TEAM:
      actions.team(args);
      break;
    case REMIND:
      actions.remind(args);
      break;
    case HIGHLIGHT:
      actions.shaq();
      break;
    default:
      break;
  }
};
