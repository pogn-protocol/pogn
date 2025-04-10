# Poker and Other Games on Nostr

(note: the demo only does oddsAndEvens and rockPaperScissors atm)

POGN is a nodejs implementation of [cypherpoker.js](https://github.com/monicanagent/cypherpoker.js) on NOSTR.  Its purpose is to serve as [a microkernal for p2p message based games and development](https://medium.com/p/4f2a40e62656).

The POGN folder will contain the specializations that are necessary for a p2p POGN implementation and the casinoForge is a  playground to refactor and evolve the POGN divisions. Example divisions (these could change):

<img src="https://github.com/user-attachments/assets/403b73b7-6343-4065-afcd-db2661476d31" alt="POGN Client Screenshot" width="500"/>

## POGN Server (ghInit.js + pognConfigs)
POGN Server is a test implementation of a POGN relay using pognConfigs.js production configs on Heroku with ghInit.js as the start file. The POGN adminConsole serves as its GUI. The Heroku implementation requires and demonstrates a shared server websocket connection but POGN can also manage relay connections and ports individually with pognConfigs.

## POGN Client Demo
[POGN Client Demo - https://pognclient-5546e625c597.herokuapp.com/](https://pognclient-5546e625c597.herokuapp.com/)

Repo: https://github.com/pogn-protocol/pognclient

> A browser-based client for testing multiple lobbies and games using the POGN protocol.

---

<img src="https://github.com/user-attachments/assets/7bcf128b-85e5-4b24-aaba-b3bce3261419" alt="POGN Client Screenshot" width="300"/>
<img src="https://github.com/user-attachments/assets/b203058e-ed29-4ce8-a9de-d8fb9959b4a3" alt="POGN Client Screenshot" width="300"/>
<img src="https://github.com/user-attachments/assets/098bea77-6f53-403c-af44-60761eb142a6" alt="POGN Client Screenshot" width="300"/>



### 🔹 Quick Start

- Auto-generates a `playerId` and opens a lobby connection to **`lobby1`**
- Click **Login** to fetch 2 games via the lobby refresh
- You will be **auto-joined** to the 2 default games
- Create and join a new game via the UI
- When the **minimum number of players** has joined, click **Start** to begin the game

---

### 🔸 Multiplayer Testing

Use these id's for two clients to join the auto-created test games:

> player1 Id: be7c4cf8b9db6950491f2de3ece4668a1beb93972082d021256146a2b4ae1348

> player2 Id: df08f70cb2f084d2fb787af232bbb18873e7d88919854669e4e691ead9baa4f4

Use **two clients** to:
- Create a new game
- Join the game from both clients
- Start the game when ready

---

### 🔁 Connecting to Another Lobby

To connect to **lobby2**:
1. Enter `"lobby2"` in the input field
2. Click **Connect**

---

### 🛰️ Debug Tools

- 🔁 **Ping** connections to test latency
- 📤 View **sent** messages to the POGN server
- 📥 View **received** messages from the POGN server

---

## POGN adminConsole
[POGN adminConsole Demo https://pognclient-5546e625c597.herokuapp.com/ →](https://pognclient-5546e625c597.herokuapp.com/)

Repo: https://github.com/pogn-protocol/pognadminconsole

UI for interacting with the **POGN server**.

- 🔌 **Auto-connects** to `lobby1` on load.
- 👤 Click **Login** to get a lobby refresh with players and games.
- ♻️ Manually **refresh lobby** to update lobby state.
- 🌐 Connect to **`lobby2`** using its ID.
- 🛎️ **Ping** any active connection to check responsiveness.
- 📬 See **messages sent** to and **received** from the POGN server.


<img src="https://github.com/user-attachments/assets/2c596a8c-5381-45f9-a66e-e64d6fa011c3" alt="POGN adminConsole Screenshot" width="300"/>

## POGN gameSandbox

[POGN Games Sandbox Demo](https://pogngamesandbox-eac15b3c6192.herokuapp.com/)

Develop games for pogn straight out of the POGN Games Sandbox demo.

<img src="https://github.com/user-attachments/assets/d9e3c834-f7d0-4535-9be0-c88f74fc32a7" alt="POGN adminConsole Screenshot" width="300"/>
