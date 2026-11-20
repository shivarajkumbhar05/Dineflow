// Optional demo data:  npm run db:seed   (DO NOT run against a live production tenant)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../src/config/env');
const { Restaurant, User, Table, MenuCategory, MenuItem } = require('../src/models');
(async () => {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME });
  if (await Restaurant.exists({ slug: 'demo-restaurant' })) { console.log('Demo already seeded'); return process.exit(0); }
  const r = await Restaurant.create({ name: 'Demo Restaurant', slug: 'demo-restaurant' });
  await User.create({ restaurant: r._id, name: 'Demo Owner', email: 'owner@demo.test', role: 'owner', passwordHash: await bcrypt.hash('Demo@12345', 12) });
  const starters = await MenuCategory.create({ restaurant: r._id, name: 'Starters', sortOrder: 1 });
  const mains = await MenuCategory.create({ restaurant: r._id, name: 'Main Course', sortOrder: 2 });
  await MenuItem.create([
    { restaurant: r._id, category: starters._id, name: 'Paneer Tikka', price: 220, isVeg: true },
    { restaurant: r._id, category: starters._id, name: 'Chicken 65', price: 260, isVeg: false },
    { restaurant: r._id, category: mains._id, name: 'Dal Makhani', price: 240, isVeg: true },
    { restaurant: r._id, category: mains._id, name: 'Butter Chicken', price: 320, isVeg: false },
  ]);
  for (let i = 1; i <= 5; i++) await Table.create({ restaurant: r._id, number: String(i), seats: 4, qrToken: crypto.randomBytes(12).toString('hex') });
  console.log('Seeded. Login: owner@demo.test / Demo@12345  (change this password!)');
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
