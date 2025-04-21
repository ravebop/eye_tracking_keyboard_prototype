// main.js

const output = document.getElementById('output');
const keyboard = document.getElementById('keyboard');
const suggestions = document.getElementById('suggestions');

const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let currentText = '';
let lastBlinkTime = 0;
const blinkCooldown = 1000;

// Render 26 circular keys
function renderKeys() {
  keys.forEach(letter => {
    const key = document.createElement('div');
    key.classList.add('key');
    key.innerText = letter;
    key.dataset.letter = letter;
    keyboard.appendChild(key);
  });
}

renderKeys();

// Handle control buttons
const spaceBtn = document.getElementById('space');
const clearBtn = document.getElementById('clear');

spaceBtn.addEventListener('click', () => {
  currentText += ' ';
  updateOutput();
});

clearBtn.addEventListener('click', () => {
  currentText = '';
  updateOutput();
});

function updateOutput() {
  output.innerText = currentText;
  updateSuggestions();
}

function updateSuggestions() {
  const lastWord = currentText.split(' ').pop().toUpperCase();
  const suggestionsList = getSuggestions(lastWord);
  suggestions.innerHTML = '';
  suggestionsList.forEach(word => {
    const suggestionEl = document.createElement('div');
    suggestionEl.className = 'suggestion';
    suggestionEl.innerText = word;
    suggestionEl.addEventListener('click', () => {
      const words = currentText.split(' ');
      words[words.length - 1] = word;
      currentText = words.join(' ') + ' ';
      updateOutput();
    });
    suggestions.appendChild(suggestionEl);
  });
}

function getSuggestions(prefix) {
  const dictionary = ['HELLO', 'HELP', 'HEY', 'HERE', 'WORLD', 'WHY', 'WELL', 'WHAT', 'WHEN', 'TEST'];
  return dictionary.filter(word => word.startsWith(prefix)).slice(0, 3);
}

// Initialize WebGazer
webgazer.setGazeListener((data, elapsedTime) => {
  if (!data) return;
  const x = data.x;
  const y = data.y;

  document.querySelectorAll('.key').forEach(key => {
    const rect = key.getBoundingClientRect();
    if (
      x > rect.left && x < rect.right &&
      y > rect.top && y < rect.bottom
    ) {
      key.classList.add('focused');
      if (!key.dataset.hoverStart) {
        key.dataset.hoverStart = Date.now();
      } else {
        const dwellTime = Date.now() - key.dataset.hoverStart;
        if (dwellTime > 800 && Date.now() - lastBlinkTime > blinkCooldown) {
          currentText += key.dataset.letter;
          updateOutput();
          playSound();
          lastBlinkTime = Date.now();
          key.dataset.hoverStart = null;
        }
      }
    } else {
      key.classList.remove('focused');
      key.dataset.hoverStart = null;
    }
  });
}).begin();

// Blink detection using MediaPipe FaceMesh (basic setup)
let blinkCounter = 0;
let lastEAR = 1.0; // Eye Aspect Ratio baseline
const earThreshold = 0.2;
const consecutiveFrames = 2;
let blinkDetected = false;

async function loadMediaPipe() {
  const video = document.createElement('video');
  video.autoplay = true;
  video.width = 640;
  video.height = 480;
  video.style.display = 'none';
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  const faceMesh = await faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
  );

  const detect = async () => {
    const predictions = await faceMesh.estimateFaces({ input: video });
    if (predictions.length > 0) {
      const keypoints = predictions[0].annotations;
      const leftEAR = getEAR(
        keypoints.leftEyeUpper0,
        keypoints.leftEyeLower0
      );
      const rightEAR = getEAR(
        keypoints.rightEyeUpper0,
        keypoints.rightEyeLower0
      );

      const avgEAR = (leftEAR + rightEAR) / 2.0;

      if (avgEAR < earThreshold) {
        blinkCounter++;
        if (blinkCounter >= consecutiveFrames && !blinkDetected) {
          lastBlinkTime = Date.now();
          blinkDetected = true;
        }
      } else {
        blinkCounter = 0;
        blinkDetected = false;
      }
    }
    requestAnimationFrame(detect);
  };

  detect();
}

function getEAR(upper, lower) {
  const vertical1 = Math.hypot(
    upper[1][0] - lower[1][0],
    upper[1][1] - lower[1][1]
  );
  const vertical2 = Math.hypot(
    upper[3][0] - lower[3][0],
    upper[3][1] - lower[3][1]
  );
  const horizontal = Math.hypot(
    upper[0][0] - upper[4][0],
    upper[0][1] - upper[4][1]
  );
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

loadMediaPipe();

// Hide WebGazer video feed
webgazer.showVideo(false).showPredictionPoints(false);

// Sound feedback
function playSound() {
  const beep = new Audio('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg');
  beep.volume = 0.3;
  beep.play();
}

// Initial suggestions
updateSuggestions();
