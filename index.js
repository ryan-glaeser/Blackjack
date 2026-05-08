let newcard = 0
let sum = 0
let dealersum = 0
let hasBlackjack = false
let isAlive = true
let cards = document.getElementById("cards-el")
let dealercards = document.getElementById("dealercards-el")
let firstdraw = true

function draw() {
    document.getElementById("draw-el").textContent = "Draw"
    document.getElementById("draw-el").style.width = "100px"
    document.getElementById("stand-el").style.width = "100px"
    document.getElementById("stand-el").style.display = "block"
    if (!isAlive) {
        document.getElementById("response-el").textContent = "You've already lost, you can't draw more cards."
        exit()
    }
    if (firstdraw) {
        newcard = Math.floor(Math.random() * (11)) + 1
        dealercards.textContent = "Dealer's Hand: " + newcard
        dealersum = newcard
        newcard = Math.floor(Math.random() * (11)) + 1
        dealercards.textContent += ", " + newcard
        dealersum += newcard

        document.getElementById("dealersum-el").textContent = "Dealer's Sum: " + dealersum

        newcard = Math.floor(Math.random() * (11)) + 1
        cards.textContent = "Cards: " + newcard
        sum = newcard
        newcard = Math.floor(Math.random() * (11)) + 1
        cards.textContent += ", " + newcard
        sum += newcard
        firstdraw = false
    } else {
        newcard = Math.floor(Math.random() * (11)) + 1
        cards.textContent += ", " + newcard
        sum += newcard
    }

    document.getElementById("sum-el").textContent = "Sum: " + sum

    if (sum === 21) {
        document.getElementById("response-el").textContent = "Blackjack!!!"
        hasBlackjack = true
    } else if (sum < 21) {
        document.getElementById("response-el").textContent = "Draw another one?"
    } else {
        document.getElementById("response-el").textContent = "Bust!!"
        isAlive = false
        document.getElementById("replay-el").style.display = "block"
    }
}

function stand() {
    if (sum > 21) {
        document.getElementById("response-el").textContent = "You've already lost, you can't stand."
    } else {
        while (dealersum < 17) {
            newcard = Math.floor(Math.random() * (11)) + 1
            dealercards.textContent += ", " + newcard
            dealersum += newcard
        }
        if (dealersum > 21) {
            document.getElementById("response-el").textContent = "Dealer busts, you win!!!"
        } else if (dealersum === sum) {
            document.getElementById("response-el").textContent = "Push!"
        } else if (dealersum > sum) {
            document.getElementById("response-el").textContent = "Dealer wins."
        } else {
            document.getElementById("response-el").textContent = "You win!!"
        }
        document.getElementById("dealersum-el").textContent = "Dealer's Sum: " + dealersum
    }
    document.getElementById("replay-el").style.display = "block"
}

function replay() {
    sum = 0
    dealersum = 0
    hasBlackjack = false
    isAlive = true
    firstdraw = true
    document.getElementById("replay-el").style.display = "none"
    draw()
}