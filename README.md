# Project Aden
[![Build Status](https://travis-ci.org/chewong/Aden.svg?branch=master)](https://travis-ci.org/chewong/Aden)

Discord Chat Bot with Real Time NBA Scores, Schdules, and Stats!

![](https://zippy.gfycat.com/MemorableRectangularAgouti.gif)

## Commands
```/nba live```

Display the scores of current live games

```/nba [date]```

Display relevant NBA scores/schedules on a given date (YYYYMMDD) (e.g. /nba 20161031)

Alias: ```/nba yesterday```, ```/nba today```, ```/nba tomorrow```

```/nba tricode```

Display tricode of all NBA teams

```/nba [tricode]```

Display current roster and upcoming matches of the chosen team (/nba gsw)

```/nba standings```

Display the current standings

```/nba estandings```

Display the current Easten Conference standings

```/nba wstandings```

Display the current Western Conference standings

```/nba player [player name]```

Display the current stats of the chosen player

```/nba bs [game id]```

Display the box score of the chosen game

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

Reminder
