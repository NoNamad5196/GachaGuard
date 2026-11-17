import { convertToFirestoreValue } from "./dates.mjs";

export async function applyBatches(db, preflightPlan, adminModule) {
  const createOps = preflightPlan.filter((item) => item.action === "create");
  const skippedCount = preflightPlan.length - createOps.length;

  const BATCH_SIZE = 400; // Spark quota boundary limit
  let batch = db.batch();
  let countInBatch = 0;
  let totalCommitted = 0;

  for (let i = 0; i < createOps.length; i++) {
    const { op } = createOps[i];
    const docRef = db.doc(op.path);
    const convertedData = convertToFirestoreValue(op.data, adminModule);

    if (typeof batch.create === "function") {
      batch.create(docRef, convertedData);
    } else {
      batch.set(docRef, convertedData);
    }

    countInBatch++;

    if (countInBatch >= BATCH_SIZE || i === createOps.length - 1) {
      await batch.commit();
      totalCommitted += countInBatch;
      batch = db.batch();
      countInBatch = 0;
    }
  }

  return {
    totalCommitted,
    skippedCount,
    totalPlanned: preflightPlan.length,
  };
}
