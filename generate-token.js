// generate-token.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign(
    { userId: 'test-user', role: 'user' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
);

console.log('🔑 Your API Token:');
console.log(token);
console.log('\n📝 Add this to your dashboard by clicking the prompt');