import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// Load config safely
const firebaseConfig = JSON.parse(
  readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"),
);

const databaseId =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== "(default)"
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

if (!getApps().length) {
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(serviceAccount);
    } catch {
      // ignore
    }
  }

  initializeApp({
    credential,
    projectId: firebaseConfig.projectId,
  });
}

const adminDb = databaseId ? getFirestore(databaseId) : getFirestore();

async function readLogs() {
  console.log("Fetching recent error logs from Firestore...");
  const snapshot = await adminDb
    .collection("logs")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  if (snapshot.empty) {
    console.log("No recent logs found.");
    return;
  }

  snapshot.forEach((doc: any) => {
    const data = doc.data();
    console.log("--------------------------------------------------");
    console.log(`Log ID: ${doc.id}`);
    console.log(`Time: ${data.createdAt?.toDate?.()?.toISOString() || "N/A"}`);
    console.log(`Type: ${data.type}`);
    console.log(`Message: ${data.message}`);
    console.log(`Details: ${data.details}`);
    console.log("--------------------------------------------------");
  });
}

readLogs().catch(console.error);
