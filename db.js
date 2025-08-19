import 'dotenv/config';
import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql'
});

const Link = sequelize.define('Link', {
  slug: { type: DataTypes.STRING, unique: true },
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  image_url: DataTypes.STRING,
  path: DataTypes.STRING,
  click_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  click_count_ios: { type: DataTypes.INTEGER, defaultValue: 0 },
  click_count_android: { type: DataTypes.INTEGER, defaultValue: 0 },
  click_count_other: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'links',
  timestamps: false
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Connected');
    await Link.sync(); // Ensure table exists
  } catch (err) {
    console.error('❌ Unable to connect to MySQL:', err);
  }
})();

export { sequelize, Link };