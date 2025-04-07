# Poker and Other Games on Nostr

## POGN Server
POGN Server is a test implementation of a POGN relay using pognConfigs production configs on Heroku and ghInit.js as the start file. The POGN adminConsole serves as its GUI. The Heroku implmentation requires and demonstrates a sharedServer websocket connection.

## POGN Client Demo
[POGN Client Demo - https://pognclient-5546e625c597.herokuapp.com/](https://pognclient-5546e625c597.herokuapp.com/)

Repo: https://github.com/pogn-protocol/pognclient

> A browser-based client for testing multiplayer lobbies and games using the POGN protocol.

---

<img src="https://github.com/user-attachments/assets/fc3f740c-3374-44b5-9ead-4375bd5e9095" alt="POGN Client Screenshot" width="300"/>

### 🔹 Quick Start

- Auto-generates a `playerId` and opens a lobby connection to **`lobby1`**
- Click **Login** to fetch 2 games via the lobby refresh
- You will be **auto-joined** to the 2 default games
- Create and join a new game via the UI
- When the **minimum number of players** has joined, click **Start** to begin the game

---

### 🔸 Multiplayer Testing

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

# Poker and Other Games on Nostr

In order to decentralize the poker industry we need a proof of concept which is modular enough to evolve into a full fledged protocol in which other poker sites and skin’s can use for the basis of their projects.

With regard to poker the solution required for cryptographically secure gaming interaction the problem to be addressed is the implementation of mental poker protocols.

Then our proof of concept must allow two players to choose their own encryption keys, cooperatively and with commitment randomize and choose from a verifiable but hidden/masked set, and allow committed betting over multiple rounds.

# The Historical Difficulty ie The Implementation Problem

Historically the problem of implementing mental poker, or the reason it doesn’t exist, is twofold. Firstly, projects arose that still relied on the centralized paradigm. Secondly, there is the problem of played being REQUIRED to hand in their private key (this isn’t your nostr key its simply a throwaway generated for the purpose of hiding and revealing cards).

A Player can refuse to hand in their key(s) and then the game isn’t securely verifiable.

# Our Poof of POGN Concept

Our proof of concept will address the first problem providing protocols and an infrastructure for mental poker which can easily be adopted by any poker or gaming client. This dramatically reduces the effort while simultaneously serving many other possible ventures that would be thus incentive to use the same protocol.

We address the second problem by using third parties as “insurance” agents. What Nick Szabo would typically describe as security holes actually become trustworthy third parties because of the nature of the separation of duties such an “insurer” role would imply.

We also mean to consider, in our design, how the separation of such duties (traditionally a centralized poker site is poker the protocol and insurance provider) might have with respect to positive legal based benefits.

Our intention then is to develop in such a way that a globally legally compliant protocol could be scaled out.

# On Reputation Systems

Obviously both the players pools and the insurers need to have reputation systems for the players and insurers to utilize (better insurance deals for better players etc.). The intention is to build the protocols such that such solutions arise naturally.

https://docs.iris.to/document/48ba9c1a-0d22-4c56-ad5f-0cee8525e949?owner=npub1vwf6789rd55xqyjnmfqsxyt50sqys46v7xpcjfq28kah52zggu3qhnnwrx
