import * as cheerio from "cheerio";

async function main() {
  const query = "Pastillas de freno Toyota";
  const url = `https://listado.mercadolibre.cl/${encodeURIComponent(query.replace(/ /g, '-'))}`;
  console.log("Fetching:", url);
  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
  });
  
  const html = await res.text();
  console.log("HTML length:", html.length);
  
  const $ = cheerio.load(html);
  const items: any[] = [];
  
  $('.ui-search-result__wrapper').each((i, el) => {
    if (i >= 10) return;
    const title = $(el).find('h2.ui-search-item__title').text().trim();
    const priceText = $(el).find('.andes-money-amount__fraction').first().text().replace(/\./g, '');
    const price = parseInt(priceText) || 0;
    const link = $(el).find('a.ui-search-item__group__element').attr('href');
    const image = $(el).find('img.ui-search-result-image__element').attr('data-src') || $(el).find('img.ui-search-result-image__element').attr('src');
    
    if (title && price && link) {
      items.push({ title, price, link, image });
    }
  });
  
  console.log("Extracted items:", items.length);
  console.log(items[0]);
}

main().catch(console.error);
