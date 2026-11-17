require('dotenv').config();
const mysql=require('mysql2/promise');
const fs=require('fs');const path=require('path');
(async()=>{const db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',port:Number(process.env.DB_PORT||3306),database:process.env.DB_NAME||'cico_tracker'});
try{
const [base]=await db.query("SHOW TABLES LIKE 'food_entries'");if(!base.length)throw Error('food_entries is missing; stop and verify your existing CICO database.');
const [cols]=await db.query('SHOW COLUMNS FROM food_entries');const columns=new Set(cols.map(c=>c.Field));
const [mealTables]=await db.query("SHOW TABLES LIKE 'meals'");
if(!mealTables.length)await db.query('CREATE TABLE meals (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL UNIQUE) ENGINE=InnoDB');
else {const [m]=await db.query('SELECT name FROM meals WHERE id=1');if(m.length&&m[0].name!=='N/A')throw Error('Existing meals ID 1 is not N/A. Manual review required; no data changed.');}
const [existingMeals]=await db.query('SELECT id,name FROM meals');for(const [id,name] of [[1,'N/A'],[2,'Breakfast'],[3,'Lunch'],[4,'Dinner'],[5,'Snack']]){const conflict=existingMeals.find(x=>x.id===id && x.name!==name);if(conflict)throw Error('Meal ID '+id+' is '+conflict.name+' instead of '+name+'; manual review required.');}await db.query("INSERT IGNORE INTO meals (id,name) VALUES (1,'N/A'),(2,'Breakfast'),(3,'Lunch'),(4,'Dinner'),(5,'Snack')");
const [mealRows]=await db.query('SELECT id,name FROM meals');const mealMap=new Map(mealRows.map(x=>[x.name.toLowerCase(),x.id]));
if(!columns.has('meal_id'))await db.query('ALTER TABLE food_entries ADD COLUMN meal_id INT UNSIGNED NULL DEFAULT NULL');
if(columns.has('meal')){const [entries]=await db.query('SELECT id,meal FROM food_entries WHERE meal_id IS NULL');for(const f of entries){const id=mealMap.get(String(f.meal||'').trim().toLowerCase())||1;await db.execute('UPDATE food_entries SET meal_id=? WHERE id=?',[id,f.id]);}}
await db.query('UPDATE food_entries SET meal_id=1 WHERE meal_id IS NULL');
const [fk]=await db.query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='food_entries' AND COLUMN_NAME='meal_id' AND REFERENCED_TABLE_NAME='meals'");
for(const x of fk)await db.query('ALTER TABLE food_entries DROP FOREIGN KEY `'+x.CONSTRAINT_NAME.replace(/`/g,'')+'`');
await db.query('ALTER TABLE food_entries MODIFY COLUMN meal_id INT UNSIGNED NOT NULL DEFAULT 1');
await db.query('ALTER TABLE food_entries ADD CONSTRAINT fk_food_entries_meals FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE RESTRICT');
const [tagTables]=await db.query("SHOW TABLES LIKE 'tags'");if(!tagTables.length)await db.query('CREATE TABLE tags (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(100) NOT NULL UNIQUE) ENGINE=InnoDB');
for(const name of ['Vegan','Vegetarian','Gluten-Free','Low Carb','Low Fat'])await db.execute('INSERT INTO tags(name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM tags WHERE name=?)',[name,name]);
await db.query('CREATE TABLE IF NOT EXISTS food_entries_tags (food_entry_id INT UNSIGNED NOT NULL,tag_id INT UNSIGNED NOT NULL,PRIMARY KEY(food_entry_id,tag_id),FOREIGN KEY(food_entry_id) REFERENCES food_entries(id) ON DELETE CASCADE,FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE) ENGINE=InnoDB');
if(columns.has('tags')){const [tagRows]=await db.query('SELECT id,name FROM tags');const lookup=new Map(tagRows.map(t=>[t.name.toLowerCase().replace(/[^a-z]/g,''),t.id]));const [entries]=await db.query('SELECT id,tags FROM food_entries');for(const f of entries){let names=[];try{names=typeof f.tags==='string'?JSON.parse(f.tags):f.tags;}catch{}if(!Array.isArray(names))continue;for(const n of names){const tagId=lookup.get(String(n).toLowerCase().replace(/[^a-z]/g,''));if(tagId)await db.execute('INSERT IGNORE INTO food_entries_tags (food_entry_id,tag_id) VALUES (?,?)',[f.id,tagId]);}}}
const [[count]]=await db.query('SELECT COUNT(*) AS n FROM food_entries');const [[links]]=await db.query('SELECT COUNT(*) AS n FROM food_entries_tags');console.log('Migration complete. Food entries preserved:',count.n,'Tag links:',links.n);
}catch(e){console.error('Migration stopped:',e.message);process.exitCode=1;}finally{await db.end();}})();
