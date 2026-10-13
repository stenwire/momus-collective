// NFR-06: 1,000 concurrent shoppers browsing, while a month's 500 orders
// go through checkout and the signed Paystack webhook in minutes.
// Run with run-local.sh, or set API, WEB and WEBHOOK_SECRET for staging.
import crypto from "k6/crypto";
import http from "k6/http";
import { check, sleep } from "k6";

const API = __ENV.API || "http://localhost:8000";
const WEB = __ENV.WEB || "http://localhost:3000";
const SECRET = __ENV.WEBHOOK_SECRET;
const RUN = __ENV.RUN || String(Date.now());

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      exec: "browse",
      stages: [
        { duration: "1m", target: 1000 },
        { duration: "3m", target: 1000 },
        { duration: "30s", target: 0 },
      ],
    },
    orders: {
      executor: "constant-arrival-rate",
      exec: "order",
      rate: 2,
      timeUnit: "1s",
      duration: "4m",
      startTime: "30s",
      preAllocatedVUs: 20,
      maxVUs: 60,
    },
  },
  thresholds: {
    "http_req_failed{scenario:browse}": ["rate<0.01"],
    "http_req_duration{scenario:browse}": ["p(95)<1500"],
    "http_req_failed{scenario:orders}": ["rate<0.01"],
    "http_req_duration{scenario:orders}": ["p(95)<2000"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  const products = http.get(`${API}/api/v1/products/?page_size=50`).json("results");
  if (!products || !products.length) throw new Error("No products to load-test with.");
  // Colours are on the detail; checkout needs one the shirt is offered in.
  const details = products.map((p) => http.get(`${API}/api/v1/products/${p.slug}/`).json());
  return {
    slugs: products.map((p) => p.slug),
    products: details.map((d) => ({ id: d.id, color: (d.shirt_colors || [])[0] || "" })),
  };
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function browse(data) {
  const slug = pick(data.slugs);
  const pages = [
    [`${WEB}/`, "home"],
    [`${WEB}/shop`, "shop page"],
    [`${WEB}/product/${slug}`, "product page"],
    [`${API}/api/v1/products/?page=1`, "product list"],
    [`${API}/api/v1/products/${slug}/`, "product detail"],
    [`${API}/api/v1/categories/`, "categories"],
    [`${API}/api/v1/collections/`, "collections"],
    [`${API}/api/v1/products/${slug}/reviews/`, "reviews"],
  ];
  const [url, name] = pick(pages);
  const res = http.get(url, { tags: { name } });
  check(res, { [`${name} 200`]: (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);
}

export function order(data) {
  const product = pick(data.products);
  const email = `loadtest-${RUN}-${__VU}-${__ITER}@example.com`;
  const start = http.post(
    `${API}/api/v1/checkout/`,
    JSON.stringify({
      items: [{ product: product.id, size: "M", color: product.color, quantity: 1 }],
      email,
      shipping: {
        full_name: "Load Test",
        phone: "+2348000000000",
        address_line_1: "1 Test Street",
        city: "Lekki",
        state: "Lagos",
        lga: "Eti-Osa",
      },
    }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "checkout start" } },
  );
  if (!check(start, { "checkout started": (r) => r.status === 201 })) return;
  const { reference, amount } = start.json();
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference, amount, requested_amount: amount, currency: "NGN", status: "success" },
  });
  const hook = http.post(`${API}/api/v1/payments/paystack/webhook/`, body, {
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": crypto.hmac("sha512", SECRET, body, "hex"),
    },
    tags: { name: "paystack webhook" },
  });
  check(hook, { "webhook accepted": (r) => r.status === 200 });
}
