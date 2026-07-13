// config/validateEnv.js
const config = require('./config');

function validateEnv() {
    const required = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_BUCKET'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('💡 Please check your .env file');
        process.exit(1);
    }
    
    // Validate JWT_SECRET
    if (config.JWT_SECRET && config.JWT_SECRET.length < 32) {
        console.warn('⚠️ JWT_SECRET should be at least 32 characters');
        console.warn('💡 Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    
    console.log('✅ Environment validated successfully');
    return true;
}

module.exports = { validateEnv };