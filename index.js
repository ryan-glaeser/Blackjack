/* Blackjack game implemented in JavaScript, HTML, and CSS. 
 * The player starts with $500 and can choose how much to bet each round.
 * The player can draw cards or stand, and the dealer will draw cards until they have at least 17 points. 
 * The game handles all the standard rules of blackjack, including blackjack payouts, busts, and pushes.
 */

// Initialize variables to track game state, player money, and UI elements
let currentUserId = null
let newcard = 0
let newcardNum = ""
let sum = 0
let dealersum = 0
let dealerHiddenCard = 0
let dealerHiddenCardNum = ""
let aces = 0
let dealeraces = 0
let money = 500
let betAmount = 10
let hasBlackjack = false
let isAlive = true
let hasWon = false
let firstdraw = true
let cardDict = {
    1: "A", 2: "2", 3: "3", 4: "4", 
    5: "5", 6: "6", 7: "7", 8: "8", 
    9: "9", 10: "10", 11: "J", 12: "Q", 13: "K"
}
const cardImages = {
    1: "ace_of_hearts.png", 2: "2_of_hearts.png", 3: "3_of_hearts.png", 4: "4_of_hearts.png",
    5: "5_of_hearts.png", 6: "6_of_hearts.png", 7: "7_of_hearts.png", 8: "8_of_hearts.png",
    9: "9_of_hearts.png", 10: "10_of_hearts.png", 11: "jack_of_hearts.png", 12: "queen_of_hearts.png", 13: "king_of_hearts.png",
    14: "ace_of_diamonds.png", 15: "2_of_diamonds.png", 16: "3_of_diamonds.png", 17: "4_of_diamonds.png",
    18: "5_of_diamonds.png", 19: "6_of_diamonds.png", 20: "7_of_diamonds.png", 21: "8_of_diamonds.png",
    22: "9_of_diamonds.png", 23: "10_of_diamonds.png", 24: "jack_of_diamonds.png", 25: "queen_of_diamonds.png", 26: "king_of_diamonds.png",
    27: "ace_of_clubs.png", 28: "2_of_clubs.png", 29: "3_of_clubs.png", 30: "4_of_clubs.png",
    31: "5_of_clubs.png", 32: "6_of_clubs.png", 33: "7_of_clubs.png", 34: "8_of_clubs.png",
    35: "9_of_clubs.png", 36: "10_of_clubs.png", 37: "jack_of_clubs.png", 38: "queen_of_clubs.png", 39: "king_of_clubs.png",
    40: "ace_of_spades.png", 41: "2_of_spades.png", 42: "3_of_spades.png", 43: "4_of_spades.png",
    44: "5_of_spades.png", 45: "6_of_spades.png", 46: "7_of_spades.png", 47: "8_of_spades.png",
    48: "9_of_spades.png", 49: "10_of_spades.png", 50: "jack_of_spades.png", 51: "queen_of_spades.png", 52: "king_of_spades.png"
}
const dealerContainer = document.getElementById("dealer-container")
const playerContainer = document.getElementById("player-container")

const sleep = ms => new Promise(r => setTimeout(r, ms));

const API_URL = "https://blackjack-backend-ilak.onrender.com";

async function handleRegister() {
    const username = document.getElementById("username-input").value;
    const password = document.getElementById("password-input").value;
    const errorEl = document.getElementById("auth-error");

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (!response.ok) {
            errorEl.textContent = data.error;
            return;
        }

        errorEl.style.color = "goldenrod";
        errorEl.style.textShadow = "2px 2px 4px rgba(0,0,0,0.5)";
        errorEl.textContent = "Registration successful! You can now log in.";
    } catch (err) {
        errorEl.textContent = "Cannot connect to server.";
    }
}

async function handleLogin() {
    const username = document.getElementById("username-input").value;
    const password = document.getElementById("password-input").value;
    const errorEl = document.getElementById("auth-error");

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (!response.ok) {
            errorEl.style.color = "red";
            errorEl.textContent = data.error;
            return;
        }

        // Save session data
        currentUserId = data.userId;
        money = data.wallet_balance;

        // Swap UIs
        document.getElementById("auth-container").style.display = "none";
        document.getElementById("game-container").style.display = "block";
        
        // Render user specific money
        document.getElementById("money").textContent = "Money: $" + money;
        document.getElementById("response-el").textContent = `Welcome back, ${data.username}! Play a hand?`;

    } catch (err) {
        errorEl.textContent = "Cannot connect to server.";
    }
}

async function loadPlayerBalance() {
    if (!currentUserId) return;
    try {
        const response = await fetch(`${API_URL}/api/user/balance/${currentUserId}`);
        const data = await response.json();
        money = data.wallet_balance;
        document.getElementById("money").textContent = "Money: $" + money;
    } catch (error) {
        console.error("Error loading balance:", error);
    }
}

async function savePlayerBalance(currentBalance) {
    if (!currentUserId) return;
    try {
        const response = await fetch(`${API_URL}/api/user/save-balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, newBalance: Number(currentBalance) })
        });
        
        const data = await response.json();
        console.log("Sync success:", data);
        document.getElementById("money").textContent = "Money: $" + currentBalance;
    } catch (error) {
        console.error("Failed to sync state:", error);
    }
}


/* Main 'play' function that runs when the player clicks the "Draw" button or starts a new game. 
 * Handles both the initial deal and subsequent draws.
 */
async function draw() {
    document.getElementById("draw-el").textContent = "Hit me"
    document.getElementById("draw-el").style.width = "100px"
    document.getElementById("stand-el").style.width = "100px"
    document.getElementById("stand-el").style.display = "block"
    if (!isAlive) {
        document.getElementById("response-el").textContent = "You've already lost, you can't draw more cards."
        exit()
    }
    if (hasWon) {
        document.getElementById("response-el").textContent = "You've already won, you can't draw more cards!"
        exit()
    }

    // Initial deal
    if (firstdraw) {
        // Update UI and subtract bet amount from player's money for the current game
        document.getElementById("replay-el").style.display = "none"
        document.getElementById("bet-input").style.display = "none"
        document.getElementById("bet-el").style.display = "none"
        money -= betAmount
        await savePlayerBalance(money)
        
        // Deal hand to the dealer
        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        if (newcard === 1) {
            dealeraces++
            dealersum += 11
        } else if (newcard >= 10) {
            dealersum += 10
        } else {
            dealersum += newcard
        }

        // Display the dealer's first card as an image instead of text
        const dealerCard1 = document.createElement("img")
        randomSuit = Math.floor(Math.random() * 4) + 1
        cardIndex = newcard + (randomSuit - 1) * 13
        let randomSuit = Math.floor(Math.random() * 4) + 1
        let cardIndex = newcard + (randomSuit - 1) * 13
        dealerCard1.src = "images/" + cardImages[cardIndex]
        dealerCard1.style.width = "80px"
        dealerCard1.style.height = "120px"
        dealerCard1.style.objectFit = "cover"
        dealerContainer.appendChild(dealerCard1)

        // Draw the dealer's hidden card
        dealerHiddenCard = Math.floor(Math.random() * (13)) + 1
        dealerHiddenCardNum = cardDict[dealerHiddenCard]
        document.getElementById("dealersum-el").textContent = "Dealer's Sum: " + dealersum
        const hiddenCardImg = document.createElement("img")
        hiddenCardImg.src = "images/cardback.png"
        hiddenCardImg.id = "hidden-card-img" // Added an ID to easily find/replace it later
        hiddenCardImg.style.width = "80px"
        hiddenCardImg.style.height = "120px"
        hiddenCardImg.style.objectFit = "cover"
        dealerContainer.appendChild(hiddenCardImg)

        // Deal hand to the player
        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        if (newcard === 1) {
            aces++
            sum += 11
        } else if (newcard >= 10) {
            sum += 10
        } else {
            sum += newcard
        }

        // Display the player's first card as an image instead of text
        const playerCard1 = document.createElement("img")
        randomSuit = Math.floor(Math.random() * 4) + 1
        cardIndex = newcard + (randomSuit - 1) * 13
        let randomSuit = Math.floor(Math.random() * 4) + 1
        let cardIndex = newcard + (randomSuit - 1) * 13
        playerCard1.src = "images/" + cardImages[cardIndex]
        playerCard1.style.width = "80px"
        playerCard1.style.height = "120px"
        playerCard1.style.objectFit = "cover"
        playerContainer.appendChild(playerCard1)

        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        if (newcard === 1) {
            if (sum + 11 > 21) {
                sum += 1
            } else {
                sum += 11
                aces++
            }
        } else if (newcard >= 10) {
            if (sum + 10 > 21 && aces > 0) {
                sum += 1
                aces--
            }
            sum += 10
        } else {
            if (sum + newcard > 21 && aces > 0) {
                sum -= 10
                aces--
            }
            sum += newcard
        }

        //Display the player's second card as an image instead of text
        const playerCard2 = document.createElement("img")
        randomSuit = Math.floor(Math.random() * 4) + 1
        cardIndex = newcard + (randomSuit - 1) * 13
        let randomSuit = Math.floor(Math.random() * 4) + 1
        let cardIndex = newcard + (randomSuit - 1) * 13
        playerCard2.src = "images/" + cardImages[cardIndex]
        playerCard2.style.width = "80px"
        playerCard2.style.height = "120px"
        playerCard2.style.objectFit = "cover"
        playerContainer.appendChild(playerCard2)

        firstdraw = false

        // Check for blackjack and set flag for 3:2 payout on win
        if (sum === 21) {
            hasBlackjack = true
        }

        } else { // Subsequent draws after the initial deal
        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        if (newcard === 1) {
            if (sum + 11 > 21) {
                sum += 1
            } else {
                sum += 11
                aces++
            }

        } else if (newcard >= 10) {
            if (sum + 10 > 21 && aces > 0) {
                sum -= 10
                aces--
            }
            sum += 10

        } else {
            if (sum + newcard > 21 && aces > 0) {
                sum -= 10
                aces--
            }
            sum += newcard
        }

        // Display the newly drawn card as an image instead of text
        const nextCardImg = document.createElement("img")
        randomSuit = Math.floor(Math.random() * 4) + 1
        cardIndex = newcard + (randomSuit - 1) * 13
        let randomSuit = Math.floor(Math.random() * 4) + 1
        let cardIndex = newcard + (randomSuit - 1) * 13
        nextCardImg.src = "images/" + cardImages[cardIndex]
        nextCardImg.style.width = "80px"
        nextCardImg.style.height = "120px"
        nextCardImg.style.objectFit = "cover"
        playerContainer.appendChild(nextCardImg)
    }

    document.getElementById("sum-el").textContent = "Sum: " + sum

    // Check if player has won, lost, or can continue drawing
    if (sum <= 21) {
        document.getElementById("response-el").textContent = "Draw another one?"

    } else {
        document.getElementById("response-el").textContent = "Bust!!"
        isAlive = false
        document.getElementById("replay-el").style.display = "block"
        document.getElementById("bet-input").style.display = "block"
        document.getElementById("bet-el").style.display = "block"
        if (money <= 0) {
            document.getElementById("response-el").textContent = "You've lost all your money! Admit defeat?"
            document.getElementById("reload-el").style.display = "block"
            document.getElementById("replay-el").style.display = "none"
        }
    }
}

/* When the player clicks the "Stand" button, the dealer will draw cards until they have at least 17 points.
 * Then the player's and dealer's sums will be compared to determine the winner,\
 * and the appropriate message will be displayed.
 */
async function stand() {
    // Check if player has already won or lost before allowing them to stand
    if (hasWon) {
        document.getElementById("response-el").textContent = "You've already won, you can't stand!"
        exit()
    }

    if (sum > 21 || !isAlive) {
        document.getElementById("response-el").textContent = "You've already lost, you can't stand."

    } else { //Reveal dealer's hidden card and update dealer's sum
        // Prevent further interaction while dealer plays
        document.getElementById("draw-el").style.display = "none"
        document.getElementById("stand-el").style.display = "none"
        document.getElementById("response-el").textContent = "Dealer's turn..."

        if (dealerHiddenCard != 0) {
            const hiddenImg = document.getElementById("hidden-card-img")
            if (hiddenImg) {
                randomSuit = Math.floor(Math.random() * 4) + 1
                cardIndex = dealerHiddenCard + (randomSuit - 1) * 13
                let randomSuit = Math.floor(Math.random() * 4) + 1
                let cardIndex = dealerHiddenCard + (randomSuit - 1) * 13
                hiddenImg.src = "images/" + cardImages[cardIndex]
            }
            if (dealerHiddenCard === 1) {
                if (dealersum + 11 > 21) {
                    dealersum += 1
                } else {
                    dealersum += 11
                    dealeraces++
                }
            } else if (dealerHiddenCard >= 10) {
                dealersum += 10
            } else {
                dealersum += dealerHiddenCard
            }

            document.getElementById("dealersum-el").textContent = "Dealer's Sum: " + dealersum
            dealerHiddenCard = 0
        }
        
        

        // Dealer draws cards until they have at least 17 points or bust
        while (dealersum < 17) {
            // Add a short delay before the dealer starts drawing cards to improve user experience
            await sleep(1000)
            
            newcard = Math.floor(Math.random() * (13)) + 1
            newcardNum = cardDict[newcard]
            
            const nextCardImg = document.createElement("img")
            randomSuit = Math.floor(Math.random() * 4) + 1
            cardIndex = newcard + (randomSuit - 1) * 13
            let randomSuit = Math.floor(Math.random() * 4) + 1
            let cardIndex = newcard + (randomSuit - 1) * 13
            nextCardImg.src = "images/" + cardImages[cardIndex]
            nextCardImg.style.width = "80px"
            nextCardImg.style.height = "120px"
            nextCardImg.style.objectFit = "cover"
            dealerContainer.appendChild(nextCardImg)

            if (newcard === 1) {
                if (dealersum + 11 > 21) {
                    dealersum += 1
                } else {
                    dealersum += 11
                    dealeraces++
                }
            } else if (newcard >= 10) {
                if (dealersum + 10 > 21 && dealeraces > 0) {
                    dealersum -= 10
                    dealeraces--
                }
                dealersum += 10
            } else {
                if (dealersum + newcard > 21 && dealeraces > 0) {
                    dealersum -= 10
                    dealeraces--
                }
                dealersum += newcard
            }

            document.getElementById("dealersum-el").textContent = "Dealer's Sum: " + dealersum
        }

        if (dealersum > 21) { // Dealer busts, player wins
            if (hasBlackjack) {
                document.getElementById("response-el").textContent = "Dealer busts and you have Blackjack! You win!!!"
            } else {
                document.getElementById("response-el").textContent = "Dealer busts, you win!!"
            }
            hasWon = true

            // If player has blackjack, they get paid 3:2, otherwise they get paid 2:1
            if (hasBlackjack) {
                money = Number(Number(money) + (betAmount * 2.5))
            } else {
                money = Number(Number(money) + (betAmount * 2))
            }
            savePlayerBalance(money)

        } else if (dealersum === sum) { // Push
            document.getElementById("response-el").textContent = "Push!"
            hasWon = true
            money = Number(Number(money) + betAmount)
            savePlayerBalance(money)

        } else if (dealersum > sum) { // Dealer wins
            document.getElementById("response-el").textContent = "Dealer wins."
            isAlive = false

        } else { // Player wins. If player has blackjack, they get paid 3:2, otherwise they get paid 2:1
            hasWon = true
            if (hasBlackjack) {
                document.getElementById("response-el").textContent = "Blackjack! You win!!!"
            } else {
                document.getElementById("response-el").textContent = "You win!!"
            }
            if (hasBlackjack) {
                money = Number(Number(money) + (betAmount * 2.5))
            } else {
                money = Number(Number(money) + (betAmount * 2))
            }
            savePlayerBalance(money)
        }
        document.getElementById("dealersum-el").textContent = "Dealer's Sum: " + dealersum
    }

    if (money > 0) {
        document.getElementById("replay-el").style.display = "block"
    }
    
    //Player has lost all of their money, show reload button to start over
    if (money === 0) {
        document.getElementById("response-el").textContent = "You've lost all your money! Admit defeat?"
        document.getElementById("reload-el").style.display = "block"
        //document.getElementById("replay-el").style.display = "none"
    }

    document.getElementById("bet-input").style.display = "block"
    document.getElementById("bet-el").style.display = "block"
}

/* Reset all variables and UI elements to start a new game,
 * but keep the money and bet amount the same
 */
function replay() {
    //Check if player has enough money to play again or can bet the chosen amount
    if (betAmount > money) {
        document.getElementById("response-el").textContent = "You don't have enough money to make that bet!"
        exit()
    }
    
    // Reset variables and start another game
    sum = 0
    dealersum = 0
    hasBlackjack = false
    isAlive = true
    hasWon = false
    aces = 0
    dealeraces = 0
    firstdraw = true
    document.getElementById("replay-el").style.display = "none"
    dealerContainer.innerHTML = ""
    playerContainer.innerHTML = ""
    document.getElementById("draw-el").style.display = "block"
    document.getElementById("response-el").textContent = "Draw another card?"
    draw()
}


/* Sets the amount the user would like to bet for the next game
 * and checks if the bet amount is valid.
 */
function bet() {
    betAmount = Number(document.getElementById("bet-input").value)
    if (betAmount > money) {
        document.getElementById("response-el").textContent = "You don't have enough money to make that bet!"
        exit()
    } else if (betAmount <= 0) {
        document.getElementById("response-el").textContent = "Bet amount must be greater than 0!"
        exit()
    } else if ( /\.\d{3,}/.test(betAmount.toString())) {
        document.getElementById("response-el").textContent = "Bet amount can't have more than 2 decimal places!"
        exit()
    }
    else {
        document.getElementById("bet-amount").textContent = "Current Bet: $" + betAmount
    }
}


/* Upon losing all money, player can click the "Reload" button to reset their money back to $100 and start over.
 * This allows the player to keep playing even after losing all their money
 */
function reload() {
    savePlayerBalance(500)
    money = 500
    document.getElementById("response-el").textContent = "Well, you've given up. Try again!"
    document.getElementById("reload-el").style.display = "none"
    document.getElementById("stand-el").style.display = "none"
    document.getElementById("draw-el").style.display = "none"
    document.getElementById("replay-el").style.display = "block"
    document.getElementById("replay-el").textContent = "Start New Game?"
    dealerContainer.innerHTML = ""
    playerContainer.innerHTML = ""
}