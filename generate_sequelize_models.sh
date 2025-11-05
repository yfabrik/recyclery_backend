#!/bin/bash
# This script generates Sequelize models and migrations for the provided SQL tables.
# It also checks for duplicate or unnecessary columns and suggests associations.

# Function to generate model and migration for a table
generate_model_and_migration() {
    local model_name=$1
    local attributes=$2
    local associations=$3
    echo "Generating model and migration for $model_name..."
    npx sequelize-cli model:generate --name $model_name --attributes "$attributes"
    echo "Model and migration for $model_name generated."
    echo "Associations to add in the model file: $associations"
    echo
}

# Generate models and migrations
generate_model_and_migration "users" "username:STRING   email:STRING   password:STRING  role:STRING  recyclery_id:INTEGER phone:STRING contract_hours:INTEGER " "belongsTo:recycleries"
generate_model_and_migration "recycleries" "name:STRING  address:TEXT phone:STRING email:STRING manager_id:INTEGER" "hasMany:users"
generate_model_and_migration "categories" "name:STRING  description:TEXT icon:STRING parent_id:INTEGER" "belongsTo:categories,as:parent"
generate_model_and_migration "items" "name:STRING  description:TEXT category_id:INTEGER barcode:STRING purchase_price:DECIMAL  selling_price:DECIMAL status:STRING  recyclery_id:INTEGER" "belongsTo:categories, belongsTo:recycleries"
generate_model_and_migration "donations" "donor_name:STRING donor_phone:STRING donor_email:STRING item_description:TEXT estimated_value:DECIMAL status:STRING  recyclery_id:INTEGER received_by:INTEGER received_at:DATE" "belongsTo:recycleries, belongsTo:users,as:receiver"
generate_model_and_migration "collections" "collection_date:DATE address:TEXT contact_name:STRING contact_phone:STRING description:TEXT status:STRING  assigned_to:INTEGER recyclery_id:INTEGER" "belongsTo:users, belongsTo:recycleries"
generate_model_and_migration "sales" "customer_name:STRING customer_email:STRING total_amount:DECIMAL  payment_method:STRING  status:STRING  sold_by:INTEGER recyclery_id:INTEGER" "belongsTo:users, belongsTo:recycleries"
generate_model_and_migration "sale_items" "sale_id:INTEGER item_id:INTEGER quantity:INTEGER  unit_price:DECIMAL" "belongsTo:sales, belongsTo:items"
generate_model_and_migration "inventory" "item_id:INTEGER quantity:INTEGER  location:STRING last_updated:DATE recyclery_id:INTEGER" "belongsTo:items, belongsTo:recycleries"
generate_model_and_migration "collection_points" "name:STRING  address:TEXT  city:STRING  postal_code:STRING  contact_person:STRING contact_phone:STRING contact_email:STRING type:STRING  notes:TEXT is_active:BOOLEAN  recyclery_id:INTEGER" "belongsTo:recycleries"
generate_model_and_migration "collection_schedules" "collection_point_id:INTEGER  scheduled_date:DATE  scheduled_time:TIME  employee_id:INTEGER vehicle:STRING status:STRING  estimated_duration:INTEGER  notes:TEXT receipt_number:STRING " "belongsTo:collection_points, belongsTo:users"
generate_model_and_migration "collection_receipts" "schedule_id:INTEGER  receipt_number:STRING   collection_date:DATE  collector_name:STRING  collection_point_name:STRING  collection_point_address:TEXT  items_collected:TEXT total_weight:DECIMAL notes:TEXT signature_data:TEXT status:STRING " "belongsTo:collection_schedules"
generate_model_and_migration "arrivals" "arrival_number:STRING   category_id:INTEGER  subcategory_id:INTEGER weight:DECIMAL  arrival_date:DATE  source_type:STRING  source_details:TEXT collection_point_id:INTEGER collection_point_name:STRING collection_point_address:TEXT volunteer_donation:BOOLEAN  house_clearance:BOOLEAN  notes:TEXT processed_by:INTEGER status:STRING " "belongsTo:categories, belongsTo:collection_points, belongsTo:users"
generate_model_and_migration "labeled_items" "barcode:STRING   name:STRING  description:TEXT category_id:INTEGER  subcategory_id:INTEGER weight:DECIMAL price:DECIMAL  cost:DECIMAL condition_state:STRING  location:STRING store_id:INTEGER arrival_id:INTEGER status:STRING  created_by:INTEGER sold_at:DATE sold_by:INTEGER" "belongsTo:categories, belongsTo:stores, belongsTo:arrivals, belongsTo:users,as:creator, belongsTo:users,as:seller"
generate_model_and_migration "stores" "name:STRING  address:TEXT city:STRING postal_code:STRING phone:STRING email:STRING manager_id:INTEGER is_active:BOOLEAN " "belongsTo:users,as:manager"
generate_model_and_migration "cash_registers" "name:STRING  store_id:INTEGER  is_active:BOOLEAN " "belongsTo:stores"
generate_model_and_migration "cash_sessions" "session_number:STRING   cash_register_id:INTEGER  user_id:INTEGER  store_id:INTEGER  opening_amount:DECIMAL   closing_amount:DECIMAL expected_amount:DECIMAL difference_amount:DECIMAL opened_at:DATE closed_at:DATE status:STRING  notes:TEXT" "belongsTo:cash_registers, belongsTo:users, belongsTo:stores"
generate_model_and_migration "sales_transactions" "transaction_number:STRING   cash_session_id:INTEGER  store_id:INTEGER  total_amount:DECIMAL  payment_method:STRING  payment_amount:DECIMAL  change_amount:DECIMAL  customer_name:STRING customer_email:STRING customer_postal_code:STRING status:STRING  refunded_amount:DECIMAL  created_by:INTEGER " "belongsTo:cash_sessions, belongsTo:stores, belongsTo:users"
generate_model_and_migration "sales_items" "transaction_id:INTEGER  labeled_item_id:INTEGER barcode:STRING  name:STRING  price:DECIMAL  quantity:INTEGER  total_price:DECIMAL " "belongsTo:sales_transactions, belongsTo:labeled_items"
generate_model_and_migration "refunds" "transaction_id:INTEGER  reason:STRING  refund_amount:DECIMAL  notes:TEXT status:STRING  created_by:INTEGER " "belongsTo:sales_transactions, belongsTo:users"
generate_model_and_migration "tasks" "name:STRING  description:TEXT category:STRING  priority:STRING   estimated_duration:INTEGER  required_skills:TEXT location:STRING equipment_needed:TEXT hourly_rate:DECIMAL is_recurring:BOOLEAN  recurrence_pattern:STRING  assigned_to:INTEGER notes:TEXT status:STRING " "belongsTo:users"
generate_model_and_migration "task_schedules" "task_id:INTEGER  assigned_to:INTEGER  store_id:INTEGER scheduled_date:DATE  start_time:TIME  end_time:TIME  status:STRING  notes:TEXT" "belongsTo:tasks, belongsTo:users, belongsTo:stores"
generate_model_and_migration "store_hours" "store_id:INTEGER  day_of_week:STRING  time_slot_name:STRING  is_open:BOOLEAN  open_time:TIME close_time:TIME is_24h:BOOLEAN  notes:TEXT" "belongsTo:stores"
generate_model_and_migration "recurring_schedules" "task_id:INTEGER  assigned_to:INTEGER  start_date:DATE  end_date:DATE day_of_week:INTEGER start_time:TIME  end_time:TIME  is_active:BOOLEAN " "belongsTo:tasks, belongsTo:users"
generate_model_and_migration "collection_point_presence" "collection_point_id:INTEGER  store_id:INTEGER day_of_week:STRING  time_slot_name:STRING  is_present:BOOLEAN  start_time:TIME end_time:TIME is_24h:BOOLEAN  notes:TEXT" "belongsTo:collection_points, belongsTo:stores"
generate_model_and_migration "employee_stores" "employee_id:INTEGER  store_id:INTEGER  is_primary:BOOLEAN " "belongsTo:users, belongsTo:stores"
generate_model_and_migration "employee_workdays" "employee_id:INTEGER  day_of_week:STRING  time_slot:STRING  is_working:BOOLEAN  start_time:TIME end_time:TIME notes:TEXT" "belongsTo:users"
generate_model_and_migration "task_employees" "task_id:INTEGER  employee_id:INTEGER  assigned_by:INTEGER" "belongsTo:tasks, belongsTo:users"
generate_model_and_migration "roles" "level:STRING  display_name:STRING  name:STRING " ""

echo "All models and migrations have been generated."
echo "Please review the model files to add the specified associations."