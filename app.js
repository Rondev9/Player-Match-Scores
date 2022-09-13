const express = require("express");
const app = express();

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;
app.use(express.json());

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("*** Server is running at http://localhost:3000/ ***");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToPlayerDetails = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertDbObjectToMatchDetails = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertDbObjectToPlayerMatchDetails = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    totalScore: dbObject.total_score,
    totalFours: dbObject.total_fours,
    totalSixes: dbObject.total_sixes,
  };
};

//Get all Players

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
    SELECT
    *
    FROM
        player_details;`;
  const playersDetails = await db.all(getPlayersQuery);
  response.send(
    playersDetails.map((eachPlayer) =>
      convertDbObjectToPlayerDetails(eachPlayer)
    )
  );
});

//Get a Player by ID

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerIdQuery = `
    SELECT
        *
    FROM
        player_details
    WHERE
        player_id = ${playerId};`;
  const playerDetails = await db.get(getPlayerIdQuery);
  response.send(convertDbObjectToPlayerDetails(playerDetails));
});

//Update a Player

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
    UPDATE
        player_details
    SET
        player_name = '${playerName}'
    WHERE
        player_id = ${playerId};`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//Get a Specific Match Details

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchIdQuery = `
    SELECT
        *
    FROM
        match_details
    WHERE
        match_id = ${matchId};`;
  const matchDetails = await db.get(matchIdQuery);
  response.send(convertDbObjectToMatchDetails(matchDetails));
});

//Get a list of all the matches of a Player

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const playerMatchQuery = `
    SELECT
        match_details.match_id, match_details.match,
        match_details.year
    FROM
        (player_match_score INNER JOIN player_details
        ON player_match_score.player_id = player_details.player_id) AS T1
        INNER JOIN match_details ON
        T1.match_id = match_details.match_id
    WHERE
        player_details.player_id = ${playerId};`;
  const playerMatchDetails = await db.all(playerMatchQuery);
  response.send(
    playerMatchDetails.map((eachMatch) =>
      convertDbObjectToMatchDetails(eachMatch)
    )
  );
});

//Get a list of players of a Specific Match

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const matchPlayerQuery = `
    SELECT
        player_details.player_id, player_details.player_name
    FROM
        (player_match_score INNER JOIN match_details ON
        player_match_score.match_id = match_details.match_id) AS T2
        INNER JOIN player_details ON player_details.player_id = player_match_score.player_id
    WHERE
        match_details.match_id = ${matchId};`;
  const matchPlayerDetails = await db.all(matchPlayerQuery);
  response.send(
    matchPlayerDetails.map((eachPlayer) =>
      convertDbObjectToPlayerDetails(eachPlayer)
    )
  );
});

//Get the statistics of the total score, fours, sixes of a specific player based on the player ID

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const playerScoreQuery = `
    SELECT
        player_match_score.player_id, player_details.player_name,
        SUM(score) AS total_score,
        SUM(fours) AS total_fours,
        SUM(sixes) AS total_sixes
    FROM
        player_match_score INNER JOIN player_details ON
        player_details.player_id = player_match_score.player_id
    WHERE
        player_match_score.player_id = ${playerId};`;
  const playerScores = await db.get(playerScoreQuery);
  response.send(convertDbObjectToPlayerMatchDetails(playerScores));
});

module.exports = app;
