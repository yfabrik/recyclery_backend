# missing tables

<!-- storeHours -->
<!-- collectionPointPresence -->
<!-- employeeWorkdays -->

taskEmployee

taskScheduleEmployee

# table constraints

creer un unique sur combo nom , recyclery_id dans cashRegister



# 2026-03-01
rajouter weight in donation
rajouter priceBasedOnWeight in categorie

ajouter forward ip middleware to reverse proxy ? sinon le rate limit aime pas


# 2026-03-04
added promotionValue and isInPromotion to categories, will not last long

# 2026-03-09
added table promotion with FK in categorie
added bundleQuantity and bundlePrice in categorie

table through transactionitem between salestransaction and labeleditem
removed FK for labeleditem in saletransaction

# 2026-03-14
table migrations orders

1 categories,employees,users,ecoOrganisms
2 recycleries,employeeWorkdays,promo,waste
3 cashRegisters, donations,employeeStores,collectionPoints,labeledItems
4 cashSessions,taskSchedules,arrival
5 salesTransactions, tasks
6 transactionItems

table saleTransaction FK to itself