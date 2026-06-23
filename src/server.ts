import app from "./app"
import { envVars } from "./app/config/env.config";
import { prisma } from "./app/lib/prisma";
const EcohubServer = async () => {
try {
  app.listen(envVars.PORT, () => {
    console.log(`this app is running on port http://localhost:${envVars.PORT}`);
  })
} catch (error) {
  console.log(error)
  prisma.$disconnect();
  process.exit(1)
}
}

EcohubServer()