import { db } from "../server/db";
import { eq } from "drizzle-orm";
import { users, trainingPlans, planAssignments } from "../shared/schema";

async function cleanupTestClients() {
  console.log("Starting test client cleanup...\n");

  const testClients = await db.query.users.findMany({
    where: (u, { eq }) => eq(u.isTestUser, true),
  });

  console.log(`Found ${testClients.length} test clients to remove.\n`);

  for (const testClient of testClients) {
    console.log(`Removing test client: ${testClient.firstName} ${testClient.lastName} (${testClient.email})`);
    console.log(`  - Trainer ID: ${testClient.testUserTrainerId}`);

    const assignments = await db.query.planAssignments.findMany({
      where: (pa, { eq }) => eq(pa.clientId, testClient.id),
    });

    for (const assignment of assignments) {
      const plan = await db.query.trainingPlans.findFirst({
        where: (p, { eq }) => eq(p.id, assignment.planId),
      });

      if (plan && plan.trainerId === testClient.testUserTrainerId) {
        const allAssignments = await db.query.planAssignments.findMany({
          where: (pa, { eq }) => eq(pa.planId, plan.id),
        });

        const hasRealClient = allAssignments.some(a => a.clientId !== testClient.id);

        if (!hasRealClient) {
          console.log(`  - Deleting orphaned plan: ${plan.name}`);
          await db.delete(trainingPlans).where(eq(trainingPlans.id, plan.id));
        }
      }
    }

    await db.delete(users).where(eq(users.id, testClient.id));
    console.log(`  - Deleted test client user\n`);
  }

  console.log("Cleanup complete!");
  console.log(`Removed ${testClients.length} test clients and their associated data.`);
  process.exit(0);
}

cleanupTestClients().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
