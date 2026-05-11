/* Blackjack game implemented in JavaScript, HTML, and CSS. 
 * The player starts with $100 and can choose how much to bet each round.
 * The player can draw cards or stand, and the dealer will draw cards until they have at least 17 points. 
 * The game handles all the standard rules of blackjack, including blackjack payouts, busts, and pushes.
 */

let newcard = 0
let newcardNum = ""
let sum = 0
let dealersum = 0
let aces = 0
let dealeraces = 0
let money = 100
if (localStorage.getItem("money") !== null) {
    money = parseFloat(localStorage.getItem("money"))
} else {
    localStorage.setItem("money", money)
}
saveMoney(money)
if (money <= 0) {
    document.getElementById("response-el").textContent = "You've lost all your money! Admit defeat?"
    document.getElementById("reload-el").style.display = "block"
}
let betAmount = 10
let hasBlackjack = false
let isAlive = true
let hasWon = false
let cards = document.getElementById("cards-el")
let dealercards = document.getElementById("dealercards-el")
let firstdraw = true
let cardDict = {
    1: "A", 2: "2", 3: "3", 4: "4", 
    5: "5", 6: "6", 7: "7", 8: "8", 
    9: "9", 10: "10", 11: "J", 12: "Q", 13: "K"
}

/* Main 'play' function that runs when the player clicks the "Draw" button or starts a new game. 
 * Handles both the initial deal and subsequent draws.
 */
function draw() {
    document.getElementById("draw-el").textContent = "Draw"
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

    if (firstdraw) {
        document.getElementById("bet-input").style.display = "none"
        document.getElementById("bet-el").style.display = "none"
        saveMoney((money - betAmount).toFixed(2))
        
        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        dealercards.textContent = "Dealer's Hand: " + newcardNum
        if (newcard === 1) {
            dealeraces++
            dealersum += 11
        } else if (newcard >= 10) {
            dealersum += 10
        } else {
            dealersum += newcard
        }

        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        dealercards.textContent += ", " + newcardNum
        if (newcard === 1) {
            if (dealersum + 11 > 21) {
                dealersum += 1
            } else {
                dealersum += 11
                dealeraces++
            }
        } else if (newcard >= 10) {
            dealersum += 10
        } else {
            dealersum += newcard
        }

        document.getElementById("dealersum-el").textContent = "Dealer's Sum: " + dealersum

        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        cards.textContent = "Cards: " + newcardNum
        if (newcard === 1) {
            aces++
            sum += 11
        } else if (newcard >= 10) {
            sum += 10
        } else {
            sum += newcard
        }
        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        cards.textContent += ", " + newcardNum
        if (newcard === 1) {
            aces++
            sum += 11
        } else if (newcard >= 10) {
            sum += 10
        } else {
            sum += newcard
        }
        firstdraw = false
        if (sum === 22) {
            sum -= 10
            aces--}
    } else {
        newcard = Math.floor(Math.random() * (13)) + 1
        newcardNum = cardDict[newcard]
        cards.textContent += ", " + newcardNum
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
    }

    document.getElementById("sum-el").textContent = "Sum: " + sum

    // Check if player has blackjack, can draw another card, or busts
    if (sum === 21) {
        document.getElementById("response-el").textContent = "Blackjack!!!"
        hasBlackjack = true
    } else if (sum < 21) {
        document.getElementById("response-el").textContent = "Draw another one?"
    } else {
        document.getElementById("response-el").textContent = "Bust!!"
        isAlive = false
        document.getElementById("replay-el").style.display = "block"
        document.getElementById("bet-input").style.display = "block"
        document.getElementById("bet-el").style.display = "block"
    }
}

/* When the player clicks the "Stand" button, the dealer will draw cards until they have at least 17 points.
 * Then the player's and dealer's sums will be compared to determine the winner,\
 * and the appropriate message will be displayed.
 */
function stand() {

    // Check if player has already won or lost before allowing them to stand
    if (hasWon) {
        document.getElementById("response-el").textContent = "You've already won, you can't stand!"
        exit()
    }
    if (sum > 21 || !isAlive) {
        document.getElementById("response-el").textContent = "You've already lost, you can't stand."
    } else {

        // Dealer draws cards until they have at least 17 points or bust
        while (dealersum < 17) {
            newcard = Math.floor(Math.random() * (13)) + 1
            newcardNum = cardDict[newcard]
            dealercards.textContent += ", " + newcardNum
            if (newcard === 1) {
                if (dealersum + 11 > 21) {
                    dealersum += 1
                } else {
                    dealersum += 11
                    dealeraces++
                }
            } else if (newcard >= 10) {
                if (dealersum + 10 > 21 && dealeraces > 0) {
                    dealersum += 1
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
        }
        if (dealersum > 21) {
            // Dealer busts, player wins

            document.getElementById("response-el").textContent = "Dealer busts, you win!!!"
            hasWon = true

            // If player has blackjack, they get paid 3:2, otherwise they get paid 2:1
            if (hasBlackjack) {
                money = (Number(money) + Number((betAmount * 2.5).toFixed(2))).toFixed(2)
            } else {
                money = (Number(money) + Number((betAmount * 2).toFixed(2))).toFixed(2)
            }
            saveMoney(money)
        } else if (dealersum === sum) {
            // Push

            document.getElementById("response-el").textContent = "Push!"
            hasWon = true
            money = (Number(money) + Number((betAmount).toFixed(2))).toFixed(2)
            saveMoney(money)
        } else if (dealersum > sum) {
            // Dealer wins

            document.getElementById("response-el").textContent = "Dealer wins."
            isAlive = false
        } else {
            // Player wins

            document.getElementById("response-el").textContent = "You win!!"
            hasWon = true
            
            // If player has blackjack, they get paid 3:2, otherwise they get paid 2:1
            if (hasBlackjack) {
                money = (Number(money) + Number((betAmount * 2.5).toFixed(2))).toFixed(2)
            } else {
                money = (Number(money) + Number((betAmount * 2).toFixed(2))).toFixed(2)
            }
            saveMoney(money)
        }
        document.getElementById("dealersum-el").textContent = "Dealer's Sum: " + dealersum
    }
    document.getElementById("replay-el").style.display = "block"
    
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
    //if (money <= 0) {
    //    document.getElementById("response-el").textContent = "You don't have any more money to play!"
    //    exit()
    //}
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
    firstdraw = true
    document.getElementById("replay-el").style.display = "none"
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

function saveMoney(newAmount) {
    money = newAmount;
    // Optional: Keep the rounding logic here so it's consistent
    if (Math.floor(money) === Number(money)) {
        money = Math.floor(money);
    }
    localStorage.setItem("money", money);
    document.getElementById("money").textContent = "Money: $" + money;
}

function reload() {
    saveMoney(100)
    document.getElementById("response-el").textContent = "Well, you've given up. Try again!"
    document.getElementById("reload-el").style.display = "none"
    document.getElementById("draw-el").textContent = "Start Game?"
}