import * as fs from "node:fs";
import * as path from "node:path";

const productDataPath = path.join(process.cwd(), "data", "products.ts");

const replacements = new Map<string, string>([
  ["/imgs/SKU_Limon2000.webp", "/imgs/SKU_Limon2000V2.webp"],
  ["/imgs/SKU_Limon5000.webp", "/imgs/SKU_Limon5000V2.webp"],
  ["/imgs/SKU_LimonCereza350.webp", "/imgs/SKU_LimonCereza350V2.webp"],
  ["/imgs/SKU_LimonCereza1000.webp", "/imgs/SKU_LimonCereza1000V2.webp"],
  ["/imgs/SKU_LimonCereza2000.webp", "/imgs/SKU_LimonCereza2000V2.webp"],
  ["/imgs/SKU_LimonCoco350.webp", "/imgs/SKU_LimonCoco350V2.webp"],
  ["/imgs/SKU_LimonCoco1000.webp", "/imgs/SKU_LimonCoco1000V2.webp"],
  ["/imgs/SKU_LimonCoco2000.webp", "/imgs/SKU_LimonCoco2000V2.webp"],
  ["/imgs/SKU_Maracuya350.webp", "/imgs/SKU_Maracuya350V2.webp"],
  ["/imgs/SKU_Maracuya1000.webp", "/imgs/SKU_Maracuya1000V2.webp"],
  ["/imgs/SKU_Maracuya2000.webp", "/imgs/SKU_Maracuya2000V2.webp"],
]);

if (!fs.existsSync(productDataPath)) {
  console.error(`No se encontró el archivo: ${productDataPath}`);
  process.exit(1);
}

let content = fs.readFileSync(productDataPath, "utf8");
let updatedCount = 0;

for (const [from, to] of replacements) {
  if (!content.includes(from)) continue;

  content = content.replaceAll(from, to);
  updatedCount += 1;
}

fs.writeFileSync(productDataPath, content, "utf8");

console.log(`Actualizaciones aplicadas: ${updatedCount}`);
console.log(`Archivo modificado: ${path.relative(process.cwd(), productDataPath)}`);
