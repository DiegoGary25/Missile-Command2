import random



def bet(ammount):
	r = random.randrange(0,101)
	global money, lostCount, rounds, maxLostCount, maxMoney


	if(r > 50):
		##print("Won ! " + str(ammount * 2))
		money += ammount
		if(lostCount > maxLostCount):
			maxLostCount = lostCount
		lostCount = 0
		if(money > maxMoney):
			maxMoney = money
	else:
		##print("Lost ! " + str(ammount))
		money -= ammount
		lostCount+=1

	rounds+=1



money = 10000
lostCount = 0
betAmmount = 25
rounds = 0
maxLostCount = 0
maxMoney = 0

while money > 0:
	print("Round: " + str(rounds))
	bet(25)
	print("CurMoney" + str(money))

print("MaxCount " + str(maxLostCount))
print("MaxMoney " + str(maxMoney))