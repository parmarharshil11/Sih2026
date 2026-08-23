process.env.DATABASE_URL = 'postgresql://ccuser:ccpassword@localhost:5433/capacityconnect';  
const { execSync } = require('child_process');  
execSync('npx prisma migrate dev --name init --schema=prisma/schema.prisma', { stdio: 'inherit', env: process.env }); 
