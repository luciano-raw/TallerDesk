async function main() {
  const query = "Pastillas de freno Toyota";
  const url = `https://api.mercadolibre.com/sites/MLC/search?q=${encodeURIComponent(query)}&limit=10`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "es-ES,es;q=0.9",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1"
    }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  if (data.results) {
    console.log("Success! Results count:", data.results.length);
  } else {
    console.log("Failed:", data);
  }
}
main().catch(console.error);
