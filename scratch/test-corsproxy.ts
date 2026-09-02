async function main() {
  const query = "Pastillas de freno Toyota";
  const targetUrl = `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=10`;
  const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  const res = await fetch(url);
  console.log("Status CorsProxy:", res.status);
  const text = await res.text();
  console.log("Response:", text.substring(0, 200));
}
main().catch(console.error);
