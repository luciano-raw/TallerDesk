async function main() {
  const url = 'https://listado.mercadolibre.cl/bujias-suzuki';
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
  });
  console.log("Scraping status:", res.status);
  const text = await res.text();
  if (text.includes('captcha')) {
    console.log("Captcha blocked");
  } else {
    console.log("Success! Extracted bytes:", text.length);
  }
}
main().catch(console.error);
