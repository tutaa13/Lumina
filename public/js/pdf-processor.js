// PDF.js se carga desde CDN en nueva-materia.html
// https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js

const PDF_CHAR_LIMIT = 50000;

async function extraerTextoPDF(archivo) {
  const arrayBuffer = await archivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textoCompleto = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const contenido = await pagina.getTextContent();
    const textoPagina = contenido.items.map(item => item.str).join(' ');
    textoCompleto += textoPagina + '\n';
    if (textoCompleto.length >= PDF_CHAR_LIMIT) break;
  }

  return textoCompleto.slice(0, PDF_CHAR_LIMIT);
}

async function procesarTodosLosPDFs(archivos) {
  const textos = await Promise.all(
    Array.from(archivos).map(archivo => extraerTextoPDF(archivo))
  );
  return textos.join('\n\n---\n\n');
}
