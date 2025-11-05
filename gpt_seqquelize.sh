#!/bin/bash

# Check npx sequelize-cli
# if ! command -v npx sequelize &> /dev/null
# then
#   echo "❌ npx sequelize-cli not found. Install with:"
#   echo "npm i -g npx sequelize-cli"
#   exit 1
# fi

echo "✅ Generating npx sequelize models..."

# USERS
npx sequelize model:generate --name User --attributes \
username:string,email:string,password:string,role:string,recyclery_id:integer,phone:string,contract_hours:integer

# RECYCLERIES
npx sequelize model:generate --name Recyclery --attributes \
name:string,address:text,phone:string,email:string,manager_id:integer

# ROLES
npx sequelize model:generate --name Role --attributes \
level:string,display_name:string,name:string

# CATEGORIES
npx sequelize model:generate --name Category --attributes \
name:string,description:text,icon:string,parent_id:integer

# ITEMS
npx sequelize model:generate --name Item --attributes \
name:string,description:text,category_id:integer,barcode:string,purchase_price:decimal,selling_price:decimal,status:string,recyclery_id:integer

# DONATIONS
npx sequelize model:generate --name Donation --attributes \
donor_name:string,donor_phone:string,donor_email:string,item_description:text,estimated_value:decimal,status:string,recyclery_id:integer,received_by:integer,received_at:date

# COLLECTIONS
npx sequelize model:generate --name Collection --attributes \
collection_date:date,address:text,contact_name:string,contact_phone:string,description:text,status:string,assigned_to:integer,recyclery_id:integer

# SALES
npx sequelize model:generate --name Sale --attributes \
customer_name:string,customer_email:string,total_amount:decimal,payment_method:string,status:string,sold_by:integer,recyclery_id:integer

# SALE ITEMS
npx sequelize model:generate --name SaleItem --attributes \
sale_id:integer,item_id:integer,quantity:integer,unit_price:decimal

# INVENTORY
npx sequelize model:generate --name Inventory --attributes \
item_id:integer,quantity:integer,location:string,recyclery_id:integer

# COLLECTION POINTS
npx sequelize model:generate --name CollectionPoint --attributes \
name:string,address:text,city:string,postal_code:string,contact_person:string,contact_phone:string,contact_email:string,type:string,notes:text,is_active:boolean,recyclery_id:integer

# COLLECTION SCHEDULES
npx sequelize model:generate --name CollectionSchedule --attributes \
collection_point_id:integer,scheduled_date:date,scheduled_time:time,employee_id:integer,vehicle:string,status:string,estimated_duration:integer,notes:text,receipt_number:string

# COLLECTION RECEIPTS
npx sequelize model:generate --name CollectionReceipt --attributes \
schedule_id:integer,receipt_number:string,collection_date:date,collector_name:string,collection_point_name:string,collection_point_address:text,items_collected:text,total_weight:decimal,notes:text,signature_data:text,status:string

# ARRIVALS
npx sequelize model:generate --name Arrival --attributes \
arrival_number:string,category_id:integer,subcategory_id:integer,weight:decimal,arrival_date:date,arrival_time:time,source_type:string,source_details:text,collection_point_id:integer,collection_point_name:string,collection_point_address:text,volunteer_donation:boolean,house_clearance:boolean,notes:text,processed_by:integer,status:string

# STORES
npx sequelize model:generate --name Store --attributes \
name:string,address:text,city:string,postal_code:string,phone:string,email:string,manager_id:integer,is_active:boolean

# LABELED ITEMS
npx sequelize model:generate --name LabeledItem --attributes \
barcode:string,name:string,description:text,category_id:integer,subcategory_id:integer,weight:decimal,price:decimal,cost:decimal,condition_state:string,location:string,store_id:integer,arrival_id:integer,status:string,created_by:integer,sold_at:date,sold_by:integer

# CASH REGISTERS
npx sequelize model:generate --name CashRegister --attributes \
name:string,store_id:integer,is_active:boolean

# CASH SESSIONS
npx sequelize model:generate --name CashSession --attributes \
session_number:string,cash_register_id:integer,user_id:integer,store_id:integer,opening_amount:decimal,closing_amount:decimal,expected_amount:decimal,difference_amount:decimal,status:string,notes:text

# SALES TRANSACTIONS
npx sequelize model:generate --name SalesTransaction --attributes \
transaction_number:string,cash_session_id:integer,store_id:integer,total_amount:decimal,payment_method:string,payment_amount:decimal,change_amount:decimal,customer_name:string,customer_email:string,customer_postal_code:string,status:string,refunded_amount:decimal,created_by:integer

# SALES ITEMS
npx sequelize model:generate --name SalesItem --attributes \
transaction_id:integer,labeled_item_id:integer,barcode:string,name:string,price:decimal,quantity:integer,total_price:decimal

# REFUNDS
npx sequelize model:generate --name Refund --attributes \
transaction_id:integer,reason:string,refund_amount:decimal,notes:text,status:string,created_by:integer

# TASKS
npx sequelize model:generate --name Task --attributes \
name:string,description:text,category:string,priority:string,estimated_duration:integer,required_skills:text,location:string,equipment_needed:text,hourly_rate:decimal,is_recurring:boolean,recurrence_pattern:string,assigned_to:integer,notes:text,status:string

# TASK SCHEDULES
npx sequelize model:generate --name TaskSchedule --attributes \
task_id:integer,assigned_to:integer,store_id:integer,scheduled_date:date,start_time:time,end_time:time,status:string,notes:text

# RECURRING SCHEDULES
npx sequelize model:generate --name RecurringSchedule --attributes \
task_id:integer,assigned_to:integer,start_date:date,end_date:date,day_of_week:integer,start_time:time,end_time:time,is_active:boolean

# EMPLOYEE STORES (M:N LINK)
npx sequelize model:generate --name EmployeeStore --attributes \
employee_id:integer,store_id:integer,is_primary:boolean

echo "✅ Done! Now run:"
echo "npx npx sequelize db:migrate"
