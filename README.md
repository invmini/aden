# Project Aden
[![Build Status](https://travis-ci.org/chewong/Aden.svg?branch=master)](https://travis-ci.org/chewong/Aden)

[Try it here!](https://discordapp.com/oauth2/authorize?&client_id=260981903132327936&scope=bot)

Discord Chat Bot with Real Time NBA Scores, Schdules, and Stats!

![](https://zippy.gfycat.com/MemorableRectangularAgouti.gif)

## Commands
```/nba live```

Display the scores of current live games

```/nba [date]```

Display relevant NBA scores/schedules on a given date (YYYYMMDD) (e.g. /nba 20161031)

Alias: ```/nba yesterday```, ```/nba today```, ```/nba tomorrow```

```/nba teams```

Display all NBA teams and their tricode

```/nba team [nickname]```

Display upcoming matches and current active roster of the chosen team (e.g. /nba team raptors)

```/nba standings```

Display the current standings

```/nba estandings```

Display the current Easten Conference standings

```/nba wstandings```

Display the current Western Conference standings

```/nba player [player name]```

Display the current stats of the chosen player

```/nba bs [nickname|game id]```

Display the box score of the chosen game (e.g. /nba bs raptors, /nba bs 0021600454)

(Note: If nickname is used, the boxscore of the most recent ongoing/finished game will be displayed)

```/nba remind [nickname|game id]```

Set a reminder to a future game

## Development
```
npm install
npm run dev
```
## Special Thanks
[Discord.js](https://discord.js.org/)

[nba.js](https://github.com/kshvmdn/nba.js)

## TODO
Basic NLP

Timezone
