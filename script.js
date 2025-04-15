// Global variables to hold fetched data
let nflTeams = [];
let playerData = {};

// Positions to fill
const positions = ['QB', 'RB', 'WR1', 'WR2', 'TE', 'DEF'];

// Object to store the selected team code for each position
let selectedTeams = {
  QB: null,
  RB: null,
  WR1: null,
  WR2: null,
  TE: null,
  DEF: null
};

// Current team available for selection
let currentTeam = null;

/**
 * Load the teams and players data from the external JSON files.
 * Returns a promise that resolves when both fetch calls complete.
 */
function loadData() {
  return Promise.all([
    fetch('teams.json').then((response) => response.json()),
    fetch('players.json').then((response) => response.json())
  ]).then(([teamsData, playersData]) => {
    nflTeams = teamsData;
    playerData = playersData;
  }).catch((error) => {
    console.error("Error loading JSON data:", error);
  });
}

/**
 * Calculate the grade for a player given his position and points.
 * Grades are based on the player's rank (percentile) compared to all players at that position.
 */
function calculateGrade(position, points) {
  let allPositionPoints = [];

  if (position === 'WR1' || position === 'WR2') {
    // For wide receivers, combine both WR1 and WR2 from each team
    Object.keys(playerData).forEach(teamCode => {
      if (playerData[teamCode]['WR1']) {
        allPositionPoints.push(playerData[teamCode]['WR1'].points);
      }
      if (playerData[teamCode]['WR2']) {
        allPositionPoints.push(playerData[teamCode]['WR2'].points);
      }
    });
  } else {
    // For other positions, collect points for that position
    Object.keys(playerData).forEach(teamCode => {
      if (playerData[teamCode][position]) {
        allPositionPoints.push(playerData[teamCode][position].points);
      }
    });
  }

  // Sort descending so that best scores are at the front
  allPositionPoints.sort((a, b) => b - a);
  
  // Find the index and calculate the percentile rank
  const index = allPositionPoints.indexOf(points);
  const percentile = index / allPositionPoints.length;

  if (percentile <= 0.1) return { letter: 'A+', class: 'grade-a' };
  if (percentile <= 0.2) return { letter: 'A', class: 'grade-a' };
  if (percentile <= 0.4) return { letter: 'B', class: 'grade-b' };
  if (percentile <= 0.6) return { letter: 'C', class: 'grade-c' };
  if (percentile <= 0.8) return { letter: 'D', class: 'grade-d' };
  return { letter: 'F', class: 'grade-f' };
}

/**
 * Calculate the overall team grade based on total fantasy points.
 */
function calculateOverallGrade(totalPoints) {
  if (totalPoints >= 1350) return { letter: 'A+', class: 'grade-a' };
  if (totalPoints >= 1250) return { letter: 'A', class: 'grade-a' };
  if (totalPoints >= 1150) return { letter: 'B', class: 'grade-b' };
  if (totalPoints >= 1050) return { letter: 'C', class: 'grade-c' };
  if (totalPoints >= 950) return { letter: 'D', class: 'grade-d' };
  return { letter: 'F', class: 'grade-f' };
}

/**
 * Select the current team for a given position.
 */
function selectTeam(position) {
  if (!currentTeam) return;
  
  // Record the selection for the given position
  selectedTeams[position] = currentTeam.code;
  
  // Update the table cell with the team logo
  document.getElementById(`${position}Team`).innerHTML = `
    <img src="${currentTeam.logo}" alt="${currentTeam.name}" class="team-logo">
  `;
  
  // Fetch the player data for that position and team
  const player = playerData[currentTeam.code][position];
  document.getElementById(`${position}Name`).textContent = player.name;
  document.getElementById(`${position}Points`).textContent = Math.round(player.points * 10) / 10;
  
  // Calculate and display the grade for that player
  const grade = calculateGrade(position, player.points);
  document.getElementById(`${position}Grade`).innerHTML = `
    <span class="grade ${grade.class}">${grade.letter}</span>
  `;
  
  // Choose a new random team for the next selection
  getRandomTeam();
  
  // Update total points and overall grade
  updateTotalPoints();
}

/**
 * Initialize the game: create table rows and load the first team.
 */
function initGame() {
  const tableBody = document.getElementById('teamTableBody');
  tableBody.innerHTML = '';
  
  // Create table rows for each position
  positions.forEach((pos) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${pos}</td>
      <td id="${pos}Team"></td>
      <td id="${pos}Name"></td>
      <td id="${pos}Points">0</td>
      <td id="${pos}Grade"></td>
    `;
    tableBody.appendChild(row);
  });
  
  // Get the initial random team to display
  getRandomTeam();
  
  // Set up the reset button's event listener
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  
  // Update the UI to show the selection buttons
  updateUI();
}

/**
 * Randomly select a team that has not yet been picked.
 */
function getRandomTeam() {
  const availableTeams = nflTeams.filter(team => 
    !Object.values(selectedTeams).includes(team.code)
  );
  
  if (availableTeams.length === 0) {
    currentTeam = null;
    document.getElementById('currentTeamCtn').hidden = true;
    return;
  }
  
  const randomIndex = Math.floor(Math.random() * availableTeams.length);
  currentTeam = availableTeams[randomIndex];
  
  // Update the display with the new team's name and logo
  document.getElementById('currentTeamName').textContent = currentTeam.name;
  document.getElementById('currentTeamLogo').src = currentTeam.logo;
  document.getElementById('currentTeamCtn').hidden = false;
  
  updatePositionButtons();
}

/**
 * Update the position buttons if a position has not yet been assigned a team.
 */
function updatePositionButtons() {
  positions.forEach((pos) => {
    const teamCell = document.getElementById(`${pos}Team`);
    if (!selectedTeams[pos]) {
      teamCell.innerHTML = `<button onclick="selectTeam('${pos}')">${pos}</button>`;
    }
  });
}

/**
 * Calculate and update the total points and overall grade for the current team.
 */
function updateTotalPoints() {
  let total = 0;
  
  positions.forEach((pos) => {
    if (selectedTeams[pos]) {
      const points = playerData[selectedTeams[pos]][pos].points;
      total += points;
    }
  });
  
  document.getElementById('totalPoints').textContent = Math.round(total * 10) / 10;
  
  const grade = calculateOverallGrade(total);
  document.getElementById('totalGrade').innerHTML = `
    <span class="grade ${grade.class}">${grade.letter}</span>
  `;
}

/**
 * Reset the game: clear all selections and start over.
 */
function resetGame() {
  selectedTeams = { QB: null, RB: null, WR1: null, WR2: null, TE: null, DEF: null };
  
  positions.forEach((pos) => {
    document.getElementById(`${pos}Team`).innerHTML = `<button onclick="selectTeam('${pos}')">${pos}</button>`;
    document.getElementById(`${pos}Name`).textContent = '';
    document.getElementById(`${pos}Points`).textContent = '0';
    document.getElementById(`${pos}Grade`).innerHTML = '';
  });
  
  document.getElementById('totalPoints').textContent = '0';
  document.getElementById('totalGrade').innerHTML = '';
  
  getRandomTeam();
  updateUI();
}

/**
 * Update the UI—currently just updates the selection buttons.
 */
function updateUI() {
  updatePositionButtons();
}

// When the window loads, load the JSON data and initialize the game
window.onload = function() {
  loadData().then(() => {
    initGame();
  });
};
