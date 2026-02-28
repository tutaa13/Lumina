export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { materialesTexto: materialesRaw, fechaExamen, nombreMateria, metodologia, preferencias } = req.body;

  // Limitar materiales a 8000 caracteres para no exceder el límite de tokens
  const materialesTexto = materialesRaw
    ? materialesRaw.slice(0, 8000) + (materialesRaw.length > 8000 ? '\n[materiales truncados por longitud]' : '')
    : '';

  const diasRestantes = Math.ceil(
    (new Date(fechaExamen) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const prompt = `Sos un tutor experto en planificación de estudio universitario.
Tu tarea es generar un plan de estudio detallado y personalizado.

MATERIA: ${nombreMateria}
DÍAS HASTA EL EXAMEN: ${diasRestantes}
FECHA DEL EXAMEN: ${fechaExamen}

METODOLOGÍA DEL EXAMEN:
${metodologia}

PREFERENCIAS DEL ESTUDIANTE:
${preferencias || 'Sin preferencias específicas. Usá tu criterio.'}

MATERIALES DE ESTUDIO:
${materialesTexto}

INSTRUCCIONES PARA EL PLAN:
- Analizá el contenido y detectá qué temas son más difíciles o extensos → dales más días
- Si el examen es ORAL: incluir días de simulacro oral, práctica de exposición, memoria de artículos/citas
- Si el examen es ESCRITO: incluir días de práctica con casos, resolución de ejercicios, esquemas
- Estructura: primero teoría base → luego profundización → luego práctica → cierre con repaso general
- Los últimos 2-3 días siempre son repaso integral y simulacro
- Cada día debe tener tiempo estimado realista (60-120 min según dificultad)
- Los pasos de cada día deben ser concretos y accionables

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional:

{
  "nombreMateria": "string",
  "fechaExamen": "DD de MES",
  "diasTotales": number,
  "resumenPlan": "string (2-3 oraciones describiendo la estrategia)",
  "fases": [
    {
      "numero": 1,
      "nombre": "string",
      "descripcion": "string",
      "tipo": "reactivar|practica|oral|repaso"
    }
  ],
  "dias": [
    {
      "numero": 1,
      "fecha": "string",
      "fase": 1,
      "titulo": "string",
      "subtitulo": "string",
      "tags": ["teoria|casos|oral|repaso|simulacro"],
      "tiempoMinutos": number,
      "pasos": [
        "string con instrucción concreta"
      ],
      "nota": "string opcional con consejo específico"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || JSON.stringify(data);
      console.error('Groq API error:', response.status, errMsg);
      return res.status(500).json({ error: `Error de API (${response.status}): ${errMsg}` });
    }

    const texto = data.choices[0].message.content;

    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');

    const plan = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ plan });

  } catch (error) {
    console.error('Error generando plan:', error);
    return res.status(500).json({ error: error.message || 'Error al generar el plan. Intentá de nuevo.' });
  }
}
