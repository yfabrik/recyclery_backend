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

# 2026-03-30

migrations with foreign key cascade delete for example for cash session to delete all sale transaction associated

# 2026-06-12

sync zod type enum with db enums
check if all required zod have error message
generic function getbyid->not found= http404 ?
move categories function to service/categories
extract ecoorg stats fn to service

unique true on recyclery name not taken, table too old ?
check name are trim

## unit tests

check all name stay the same if not trimmed
check all assignement to foreign key fail if using fake foreing key
check required fk are really required

### cash register

creer caise dans 1 store, creer une autre avec le meme nom = fail , creer dans un autre store= success
update caisse, ne perd pas les sessions associé

### category

create cat, try to create another with same name= fail, try with another name = success
add a sub category, try to add another one with same name = fail, add with another name=success
add subcategory to other cat with subcat name already exisiting in first one = success
toggle IO in cat, subcat are affected too, toggle IO in subcat, if enable = enble aprent too, if disable parent stay enabled
delete cat delete subcats

### arrival

cant create arrival when cat have subcats and subcat for arrival is undefined, can create if cat have no subcat
cant create if source_type== point and no point id specified or wrong id
point should be undefined if source_type!==point ,when creating or updating

### cash session

calcul close session amount

### presense point

cant create presence on fake point
update point update presence
delete point delete presence

### collection point

refuse to create with existing name

### store

refuse to create with existing name

### sale transaction

doesnt work outside of cash session
create a sale with one item no promo no bundle, 1 payment type
check for all possible alternative, multiple item, more quantities, promo on somes items, bundle on some items, multiple payment type, promo global % and static
test floating point for cart amount

### refund

cant refund no existant trnasaction
cant refund more than transaction, extra test with mixed and promo

### giftcard
