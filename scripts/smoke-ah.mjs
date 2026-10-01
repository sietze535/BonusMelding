// Smoke-test AH search + bonus fetch without TypeScript imports.
const BASE = "https://api.ah.nl";
const UA = "Appie/8.22.3";
const APP = "AHWEBSHOP";

const auth = await fetch(`${BASE}/mobile-auth/v1/auth/token/anonymous`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "User-Agent": UA },
  body: JSON.stringify({ clientId: "appie" }),
});
if (!auth.ok) throw new Error("auth failed " + auth.status);
const { access_token } = await auth.json();
const headers = {
  Authorization: `Bearer ${access_token}`,
  "User-Agent": UA,
  "Content-Type": "application/json",
  "X-Application": APP,
};

const search = await fetch(
  `${BASE}/mobile-services/product/search/v2?query=melk&page=0&size=5`,
  { headers },
);
const sj = await search.json();
console.log(
  "search ok",
  search.status,
  sj.products?.[0]?.title,
  sj.products?.[0]?.webshopId,
);

const meta = await fetch(`${BASE}/mobile-services/bonuspage/v3/metadata`, {
  headers,
});
const mj = await meta.json();
console.log("metadata ok", meta.status, "periods", mj.periods?.length);

const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
}).format(new Date());
const spotlight = await fetch(
  `${BASE}/mobile-services/bonuspage/v2/section/spotlight?application=${APP}&date=${date}`,
  { headers },
);
console.log("spotlight ok", spotlight.status);
