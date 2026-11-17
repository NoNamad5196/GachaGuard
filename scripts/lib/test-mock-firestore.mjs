/**
 * Synthetic in-memory Firestore mock for migration safety tests.
 */
export function createMockFirestore(initialData = {}) {
  const store = new Map();
  for (const [p, val] of Object.entries(initialData)) {
    store.set(p, JSON.parse(JSON.stringify(val)));
  }

  const committedWrites = [];

  return {
    _store: store,
    _committedWrites: committedWrites,

    doc(docPath) {
      return {
        path: docPath,
        id: docPath.split("/").pop(),
        async get() {
          const exists = store.has(docPath);
          const data = exists ? store.get(docPath) : null;
          return {
            exists,
            id: docPath.split("/").pop(),
            data: () => (data ? JSON.parse(JSON.stringify(data)) : null),
          };
        },
      };
    },

    collection(colPath) {
      return {
        path: colPath,
        async get() {
          const docs = [];
          const prefix = colPath.endsWith("/") ? colPath : colPath + "/";
          for (const [key, val] of store.entries()) {
            if (key.startsWith(prefix)) {
              const remainder = key.slice(prefix.length);
              if (!remainder.includes("/")) {
                docs.push({
                  id: remainder,
                  path: key,
                  data: () => JSON.parse(JSON.stringify(val)),
                });
              }
            }
          }
          return { docs };
        },
      };
    },

    batch() {
      const operations = [];
      return {
        create(docRef, data) {
          operations.push({ type: "create", path: docRef.path, data });
        },
        set(docRef, data, options = {}) {
          operations.push({ type: "set", path: docRef.path, data, options });
        },
        async commit() {
          for (const op of operations) {
            if (op.type === "create" && store.has(op.path)) {
              throw new Error(`ALREADY_EXISTS: Document at ${op.path} already exists`);
            }
            store.set(op.path, JSON.parse(JSON.stringify(op.data)));
            committedWrites.push(op);
          }
          operations.length = 0;
        },
      };
    },
  };
}
