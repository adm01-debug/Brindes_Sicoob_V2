import { lazyWithRetry } from "@/lib/lazyWithRetry";
const H = lazyWithRetry(() => import("./mod").then(m => ({ default: m.Header })));
